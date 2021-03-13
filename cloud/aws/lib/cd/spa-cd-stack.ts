import * as cdk from '@aws-cdk/core';
import * as cloudformation from '@aws-cdk/aws-cloudformation';
import * as ecr from '@aws-cdk/aws-ecr';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as events from '@aws-cdk/aws-events';
import * as events_targets from '@aws-cdk/aws-events-targets';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';

export interface StackProps extends cloudformation.NestedStackProps {
  imageTag: string;
  repository: ecr.Repository;
  bucket: s3.Bucket;
  configJson: string;
}

export class SpaCdStack extends cloudformation.NestedStack {
  constructor(scope: cdk.Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const codebuildServiceRole = new iam.Role(this, 'CodeBuildServiceRole', {
      description: 'CodeBuild Project role',
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonEC2ContainerRegistryReadOnly'
        ),
      ],
    });

    const project = new codebuild.PipelineProject(this, 'CodeBuildProject', {
      role: codebuildServiceRole,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              '$(aws ecr get-login --registry-ids ${ECR_ACCOUNT} --no-include-email)',
            ],
          },
          build: {
            commands: [
              'set -e',
              'RELEASE_IMAGE="${REGISTRY_URI}/${REPOSITORY_NAME}:${IMAGE_TAG}"',
              'docker run --name release ${RELEASE_IMAGE}',
              'docker cp release:/usr/src/app/dist ./',
              'echo "${CONFIG_JSON}" > dist/assets/config.json',
            ],
          },
          post_build: {
            commands: ['docker container rm release'],
          },
        },
        artifacts: {
          'base-directory': 'dist',
          files: ['**/*'],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true,
        environmentVariables: {
          REPOSITORY_NAME: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.repository.repositoryName,
          },
          ECR_ACCOUNT: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: this.account,
          },
          IMAGE_TAG: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.imageTag,
          },
          REGISTRY_URI: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: `${this.account}.dkr.ecr.${this.region}.${this.urlSuffix}`,
          },
          CONFIG_JSON: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.configJson,
          },
        },
      },
    });

    const codepipelineServiceRole = new iam.Role(
      this,
      'CodePipelineServiceRole',
      {
        description: 'CodePipeline Service role',
        assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'AmazonEC2ContainerRegistryReadOnly'
          ),
        ],
        inlinePolicies: {
          CodeBuild: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['codebuild:StartBuild', 'codebuild:BatchGetBuilds'],
                resources: ['*'],
              }),
            ],
          }),
          S3: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['s3:GetObject*', 's3:PutObject*'],
                resources: [props.bucket.arnForObjects('*')],
              }),
            ],
          }),
        },
      }
    );

    const sourceOutput = new codepipeline.Artifact();
    const artifact = new codepipeline.Artifact();

    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      role: codepipelineServiceRole,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.EcrSourceAction({
              actionName: 'ECR',
              repository: props.repository,
              imageTag: props.imageTag,
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CodeBuild',
              project,
              input: sourceOutput,
              outputs: [artifact],
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new codepipeline_actions.S3DeployAction({
              actionName: 'Bucket',
              runOrder: 1,
              input: artifact,
              bucket: props.bucket,
            }),
          ],
        },
      ],
    });

    const eventRole = new iam.Role(this, 'CloudWatchEventRole', {
      description: `CloudWatch Event role for ${props.repository.repositoryName}:${props.imageTag}`,
      assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
      inlinePolicies: {
        'cwe-pipeline-execution': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['codepipeline:StartPipelineExecution'],
              resources: [pipeline.pipelineArn],
            }),
          ],
        }),
      },
    });

    const rule = new events.Rule(this, 'CloudWatchEventRule', {
      description: `${props.repository.repositoryName}:${props.imageTag} to ${pipeline.pipelineName}`,
      eventPattern: {
        detail: {
          'action-type': ['PUSH'],
          'image-tag': [props.imageTag],
          'repository-name': [props.repository.repositoryName],
          result: ['SUCCESS'],
        },
        detailType: ['ECR Image Action'],
        source: ['aws.ecr'],
      },
      targets: [new events_targets.CodePipeline(pipeline, { eventRole })],
    });
  }
}

import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as iam from '@aws-cdk/aws-iam';
import * as events from '@aws-cdk/aws-events';
import * as events_targets from '@aws-cdk/aws-events-targets';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';

interface Service {
  name: string;
  service: ecs.IBaseService;
}

export interface StackProps extends cdk.NestedStackProps {
  ecrAccount: string;
  repository: ecr.Repository;
  imageTag: string;
  cluster: ecs.Cluster;
  services: Service[];
}

export class EcsCdStack extends cdk.NestedStack {
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
          build: {
            commands: [
              'set -e',
              'RELEASE_IMAGE="${REGISTRY_URI}/${REPOSITORY_NAME}:${IMAGE_TAG}"',
              "RELEASE_DIGEST=$(aws ecr describe-images --registry-id ${ECR_ACCOUNT} --repository-name ${REPOSITORY_NAME} --image-ids imageTag=${IMAGE_TAG} --query 'imageDetails[0].[imageDigest]' --output text)",
              'printf \'[{"name":"%s","imageUri":"%s"}]\' "DefaultContainer" "${RELEASE_IMAGE}@${RELEASE_DIGEST}" > imagedefinitions.json',
            ],
          },
        },
        artifacts: {
          files: ['imagedefinitions.json'],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        environmentVariables: {
          REPOSITORY_NAME: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.repository.repositoryName,
          },
          ECR_ACCOUNT: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.ecrAccount,
          },
          IMAGE_TAG: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.imageTag,
          },
          REGISTRY_URI: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: `${props.ecrAccount}.dkr.ecr.${this.region}.${this.urlSuffix}`,
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
          ECS: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['iam:PassRole'],
                resources: ['*'],
                conditions: {
                  StringEqualsIfExists: {
                    'iam:PassedToService': ['ecs-tasks.amazonaws.com'],
                  },
                },
              }),
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'ecs:DescribeTaskDefinition',
                  'ecs:RegisterTaskDefinition',
                ],
                resources: ['*'],
              }),
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'ecs:DescribeServices',
                  'ecs:DescribeTasks',
                  'ecs:ListTasks',
                  'ecs:UpdateService',
                ],
                resources: ['*'],
                conditions: {
                  ArnEquals: {
                    'ecs:cluster': props.cluster.clusterArn,
                  },
                },
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
          actions: props.services.map(
            service =>
              new codepipeline_actions.EcsDeployAction({
                actionName: service.name,
                runOrder: 2,
                input: artifact,
                service: service.service,
              })
          ),
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
      targets: [new events_targets.CodePipeline(pipeline, {eventRole})],
    });
  }
}

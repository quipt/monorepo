import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CDStackProps extends cdk.StackProps {
  input: codepipeline.Artifact;
  runOrder: number;
  region: string;
  ecrAccount: string;
  repositoryName: string;
  imageTag: string;
}

export class CDStack extends cdk.NestedStack {
  buildAction: codepipeline_actions.CodeBuildAction;

  constructor(scope: Construct, id: string, props: CDStackProps) {
    super(scope, id);

    const project = new codebuild.PipelineProject(this, 'CodeBuildProject', {
      cache: codebuild.Cache.local(
        codebuild.LocalCacheMode.SOURCE,
        codebuild.LocalCacheMode.DOCKER_LAYER
      ),
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'aws ecr get-login-password --region ${ECR_REGION} | docker login --username AWS --password-stdin ${REGISTRY_URI}',
            ],
          },
          build: {
            commands: [
              'docker load --input image.tar',
              'RELEASE_IMAGE="${REGISTRY_URI}/${REPOSITORY_NAME}:${IMAGE_TAG}"',
              'docker tag image:release ${RELEASE_IMAGE}',
              'docker push ${RELEASE_IMAGE}',
            ],
          },
        },
      }),
      environment: {
        privileged: true,
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        environmentVariables: {
          REPOSITORY_NAME: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.repositoryName,
          },
          ECR_ACCOUNT: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.ecrAccount,
          },
          ECR_REGION: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.region,
          },
          IMAGE_TAG: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.imageTag,
          },
          REGISTRY_URI: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: `${props.ecrAccount}.dkr.ecr.${props.region}.${
              cdk.Stack.of(this).urlSuffix
            }`,
          },
        },
      },
    });

    project.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'AmazonEC2ContainerRegistryPowerUser'
      )
    );

    this.buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Web.Deploy.App',
      project,
      input: props.input,
      runOrder: props.runOrder,
    });
  }
}

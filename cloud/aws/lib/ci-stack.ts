import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CIStackProps extends cdk.StackProps {
  input: codepipeline.Artifact;
}

export class CIStack extends cdk.NestedStack {
  buildAction: codepipeline_actions.CodeBuildAction;
  outputArtifact: codepipeline.Artifact;

  constructor(scope: Construct, id: string, props: CIStackProps) {
    super(scope, id);

    this.outputArtifact = new codepipeline.Artifact();

    const dir = 'web/quipt';

    const project = new codebuild.PipelineProject(this, 'CodeBuildProject', {
      cache: codebuild.Cache.local(
        codebuild.LocalCacheMode.SOURCE,
        codebuild.LocalCacheMode.DOCKER_LAYER
      ),
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        env: {
          'secrets-manager': {
            DOCKERHUB_USERNAME: 'DOCKERHUB:username',
            DOCKERHUB_PASSWORD: 'DOCKERHUB:password',
          },
        },
        phases: {
          pre_build: {
            commands: [
              'docker login --username $DOCKERHUB_USERNAME --password $DOCKERHUB_PASSWORD',
            ],
          },
          build: {
            commands: [
              'set -e',
              `cd ${dir}`,
              'docker build . --target test --tag image:test',
              'docker run image:test',
              'docker build . --target release --tag image:release',
              'cd -',
              'docker save -o image.tar image:release',
            ],
          },
        },
        artifacts: {
          files: ['image.tar'],
        },
      }),
      environment: {
        privileged: true,
      },
    });

    const dockerCredsPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [
        `arn:${cdk.Stack.of(this).partition}:secretsmanager:${
          cdk.Stack.of(this).region
        }:${cdk.Stack.of(this).account}:secret:DOCKERHUB*`,
      ],
    });

    project.role?.addToPrincipalPolicy(dockerCredsPolicyStatement);

    this.buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Web',
      project,
      input: props.input,
      outputs: [this.outputArtifact],
    });
  }
}

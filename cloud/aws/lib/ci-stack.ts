import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';

export interface CIStackProps extends cdk.StackProps {
  input: codepipeline.Artifact;
}

export class CIStack extends cdk.NestedStack {
  buildAction: codepipeline_actions.CodeBuildAction;

  constructor(scope: Construct, id: string, props: CIStackProps) {
    super(scope, id);

    const project = new codebuild.PipelineProject(this, 'CodeBuildProject', {
      cache: codebuild.Cache.local(
        codebuild.LocalCacheMode.SOURCE,
        codebuild.LocalCacheMode.DOCKER_LAYER
      ),
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'set -e',
              'cd web/quipt',
              'docker build . --target test --tag image:test',
              'docker run image:test',
              'docker build . --target release --tag image:release',
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

    this.buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Web',
      project,
      input: props.input,
    });
  }
}

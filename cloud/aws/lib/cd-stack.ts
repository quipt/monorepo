import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CDStackProps extends cdk.StackProps {
  input: codepipeline.Artifact;
  runOrder: number;
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
          build: {
            commands: [
              'set -e',
              'docker load --input image.tar',
              'docker images',
              //   'docker push ...',
            ],
          },
        },
      }),
      environment: {
        privileged: true,
      },
    });

    this.buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Web.Deploy.App',
      project,
      input: props.input,
      runOrder: props.runOrder,
    });
  }
}

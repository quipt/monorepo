import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';

export interface CIStackProps extends cdk.StackProps {
  input: codepipeline.Artifact;
};

export class CIStack extends cdk.NestedStack {
  buildAction: codepipeline_actions.CodeBuildAction;

  constructor(scope: Construct, id: string, props: CIStackProps) {
    super(scope, id);

    const project = new codebuild.PipelineProject(this, 'CodeBuildProject', {
      environment: {
        privileged: true
      }
    });

    this.buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'BuildWeb',
      project,
      input: props.input,
    });
  }
}

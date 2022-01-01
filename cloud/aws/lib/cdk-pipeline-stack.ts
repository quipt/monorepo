import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import {
  CodePipeline,
  CodePipelineProps,
  CodePipelineSource,
  ShellStep,
} from 'aws-cdk-lib/pipelines';
import {ApplicationAccount} from './application-account';
import { CIStack } from './ci-stack';

interface CdkPipelineStackProps extends cdk.StackProps {
  applicationAccounts: ApplicationAccount[];
}

export class CdkPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CdkPipelineStackProps) {
    super(scope, id, props);

    const pipelineProps: CodePipelineProps = {
      crossAccountKeys: true,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('quipt/monorepo', 'master', {
          authentication: cdk.SecretValue.secretsManager('GITHUB_TOKEN'),
        }),
        commands: [
          'cd cloud/aws',
          'yarn --frozen-lockfile',
          'yarn build',
          'yarn cdk synth',
        ],
        primaryOutputDirectory: 'cloud/aws/cdk.out',
      }),
    };

    const cdkPipeline = new CodePipeline(this, 'Pipeline', {
      ...pipelineProps,
    });

    props.applicationAccounts.forEach(applicationAccount => {
      applicationAccount
        .stages(this)
        .forEach((stage: cdk.Stage) => cdkPipeline.addStage(stage));
    });

    cdkPipeline.buildPipeline();

    const sourceStage = cdkPipeline.pipeline.stage('Source');
    const buildStage = cdkPipeline.pipeline.stage('Build');

    const sourceOutput = sourceStage.actions[0].actionProperties.outputs![0];

    const ciStack = new CIStack(this, 'CI', {
      input: sourceOutput,
    });

    buildStage.addAction(ciStack.buildAction);
  }
}

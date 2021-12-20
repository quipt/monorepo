import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {
  CodePipeline,
  CodePipelineProps,
  CodePipelineSource,
  ShellStep,
} from 'aws-cdk-lib/pipelines';
import {ApplicationAccount} from './application-account';
// import { CIAccount } from './ci-account';

interface CdkPipelineStackProps extends cdk.StackProps {
  applicationAccounts: ApplicationAccount[];
  // ciAccount: CIAccount;
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
        commands: ['cd cloud/aws', 'yarn', 'yarn build', 'yarn cdk synth'],
        primaryOutputDirectory: 'cloud/aws/cdk.out',
      }),
    };

    const pipeline = new CodePipeline(this, 'Pipeline', {
      ...pipelineProps,
    });

    props.applicationAccounts.forEach(applicationAccount => {
      const applicationAccountPipeline = new CodePipeline(
        this,
        `${applicationAccount.prefix}-pipeline`,
        {
          ...pipelineProps,
        }
      );

      applicationAccount
        .stages(this)
        .forEach((stage: cdk.Stage) =>
          applicationAccountPipeline.addStage(stage)
        );
    });
  }
}

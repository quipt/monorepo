import {Stack, StackProps, Construct, SecretValue} from '@aws-cdk/core';
import {CdkPipeline, SimpleSynthAction} from '@aws-cdk/pipelines';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import {ApplicationAccount} from './application-account';
// import { CIAccount } from './ci-account';

interface CdkPipelineStackProps extends StackProps {
  applicationAccounts: ApplicationAccount[];
  // ciAccount: CIAccount;
}

export class CdkPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkPipelineStackProps) {
    super(scope, id, props);

    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    const pipelineProps = {
      cloudAssemblyArtifact,

      sourceAction: new codepipeline_actions.GitHubSourceAction({
        actionName: 'GitHub',
        output: sourceArtifact,
        oauthToken: SecretValue.secretsManager('GITHUB_TOKEN'),
        trigger: codepipeline_actions.GitHubTrigger.POLL,
        owner: 'Quipt',
        repo: 'monorepo',
        branch: 'master',
      }),

      synthAction: SimpleSynthAction.standardYarnSynth({
        sourceArtifact,
        cloudAssemblyArtifact,
        subdirectory: './cloud/aws/',

        // Use this if you need a build step (if you're not using ts-node
        // or if you have TypeScript Lambdas that need to be compiled).
        // buildCommand: 'yarn build',
      }),
    };

    const ciPipeline = new CdkPipeline(this, 'CI-Pipeline', {
      ...pipelineProps,
      pipelineName: 'CI-pipeline',
    });

    // ciPipeline.addApplicationStage(props.ciAccount.stage(this));

    props.applicationAccounts.forEach(applicationAccount => {
      const applicationAccountPipeline = new CdkPipeline(
        this,
        `${applicationAccount.prefix}-pipeline`,
        {
          ...pipelineProps,
          pipelineName: `${applicationAccount.prefix}-pipeline`,
        }
      );

      applicationAccount
        .stages(this)
        .forEach(stage =>
          applicationAccountPipeline.addApplicationStage(stage)
        );
    });
  }
}

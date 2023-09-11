import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {
  CodePipeline,
  CodePipelineProps,
  CodePipelineSource,
  CodeBuildStep,
} from 'aws-cdk-lib/pipelines';
import {BuildSpec, LinuxArmBuildImage} from 'aws-cdk-lib/aws-codebuild';
import {ApplicationAccount} from './application-account';
import {CIStack} from './ci-stack';
import {CDStack} from './cd-stack';
import {NagSuppressions} from 'cdk-nag';

interface CdkPipelineStackProps extends cdk.StackProps {
  applicationAccounts: ApplicationAccount[];
}

export class CdkPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CdkPipelineStackProps) {
    super(scope, id, props);

    const pipelineProps: CodePipelineProps = {
      crossAccountKeys: true,
      synth: new CodeBuildStep('Synth', {
        input: CodePipelineSource.gitHub('quipt/monorepo', 'master', {
          authentication: cdk.SecretValue.secretsManager('GITHUB_TOKEN'),
        }),
        commands: [
          'yarn --frozen-lockfile',
          'yarn workspace @quipt/aws build',
          'yarn workspace @quipt/aws cdk synth',
        ],
        primaryOutputDirectory: 'packages/aws/cdk.out',
        buildEnvironment: {
          privileged: true,
          buildImage: LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_2_0,
        },
        partialBuildSpec: BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              'runtime-versions': {
                nodejs: 16,
              },
            },
          },
        }),
      })};

    const cdkPipeline = new CodePipeline(this, 'Pipeline', {
      ...pipelineProps,
    });

    props.applicationAccounts.forEach(applicationAccount => {
      applicationAccount
        .stages(this)
        .forEach((stage: cdk.Stage) => cdkPipeline.addStage(stage));
    });

    cdkPipeline.buildPipeline();

    NagSuppressions.addResourceSuppressionsByPath(
      this,
      '/CdkPipelineStack/Pipeline/Pipeline/ArtifactsBucketEncryptionKey/Resource',
      [
        {
          id: 'AwsSolutions-KMS5',
          reason: 'Default key for CDK Pipeline',
        },
        {
          id: 'NIST.800.53.R4-KMSBackingKeyRotationEnabled',
          reason: 'CDK Pipeline-managed key',
        },
        {
          id: 'NIST.800.53.R5-KMSBackingKeyRotationEnabled',
          reason: 'CDK Pipeline-managed key',
        },
        {
          id: 'PCI.DSS.321-KMSBackingKeyRotationEnabled',
          reason: 'CDK Pipeline-managed key',
        },
      ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
      this,
      '/CdkPipelineStack/Pipeline/Pipeline/ArtifactsBucket/Resource',
      [
        {
          id: 'AwsSolutions-S1',
          reason: 'Access logs not needed for pipeline artifacts',
        },
        {
          id: 'HIPAA.Security-S3BucketLoggingEnabled',
          reason: 'Access logs not needed for pipeline artifacts',
        },
        {
          id: 'HIPAA.Security-S3BucketReplicationEnabled',
          reason: 'Replication not needed for pipeline artifacts',
        },
        {
          id: 'HIPAA.Security-S3BucketVersioningEnabled',
          reason: 'Versioning not needed for pipeline artifacts',
        },
        {
          id: 'NIST.800.53.R4-S3BucketDefaultLockEnabled',
          reason: 'Object lock not needed for pipeline artifacts',
        },
        {
          id: 'NIST.800.53.R4-S3BucketReplicationEnabled',
          reason: 'Replication not needed for pipeline artifacts',
        },
        {
          id: 'NIST.800.53.R4-S3BucketVersioningEnabled',
          reason: 'Versioning not needed for pipeline artifacts',
        },
        {
          id: 'NIST.800.53.R4-S3BucketLoggingEnabled',
          reason: 'Access logs not needed for pipeline artifacts',
        },
        {
          id: 'NIST.800.53.R5-S3BucketLoggingEnabled',
          reason: 'Access logs not needed for pipeline artifacts',
        },
        {
          id: 'NIST.800.53.R5-S3BucketReplicationEnabled',
          reason: 'Replication not needed for pipeline artifacts',
        },
        {
          id: 'NIST.800.53.R5-S3BucketVersioningEnabled',
          reason: 'Versioning not needed for pipeline artifacts',
        },
        {
          id: 'PCI.DSS.321-S3BucketLoggingEnabled',
          reason: 'Access logs not needed for pipeline artifacts',
        },
        {
          id: 'PCI.DSS.321-S3BucketReplicationEnabled',
          reason: 'Replication not needed for pipeline artifacts',
        },
        {
          id: 'PCI.DSS.321-S3BucketVersioningEnabled',
          reason: 'Versioning not needed for pipeline artifacts',
        },
      ]
    );

    const sourceStage = cdkPipeline.pipeline.stage('Source');
    const assetsStage = cdkPipeline.pipeline.stage('Assets');

    const sourceOutput = sourceStage.actions[0].actionProperties.outputs[0];

    const ciStack = new CIStack(this, 'CI', {
      input: sourceOutput,
    });

    assetsStage.addAction(ciStack.buildAction);

    props.applicationAccounts.forEach(applicationAccount => {
      applicationAccount.regionGroups.forEach(regionGroup => {
        [regionGroup.primaryRegion, ...regionGroup.replicaRegions].forEach(
          region => {
            const stageName = applicationAccount.stageName(
              regionGroup.name,
              region
            );
            const stage = cdkPipeline.pipeline.stage(stageName);

            const runOrder =
              stage.actions.reduce(
                (acc, action) =>
                  Math.max(action.actionProperties.runOrder, acc),
                0
              ) + 1;

            const cdStack = new CDStack(this, `${stageName}-cd`, {
              input: ciStack.outputArtifact,
              runOrder,
              ecrAccount: applicationAccount.accountId,
              region,
              repositoryName: 'quipt/web',
              imageTag: applicationAccount.imageTag,
            });

            stage.addAction(cdStack.buildAction);
          }
        );
      });
    });
  }
}

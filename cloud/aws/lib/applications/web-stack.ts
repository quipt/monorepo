import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import {DnsStack} from '../dns-stack';
import {RegionGroup} from '../application-account';
import * as events from 'aws-cdk-lib/aws-events';
import * as events_targets from 'aws-cdk-lib/aws-events-targets';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';

export interface WebStackProps extends cdk.StackProps {
  repositoryNamespace: string;
  imageTag: string;
  dns: DnsStack;
  configJson: string;
  ciAccount: string;
  regionGroup: RegionGroup;
}

export class WebStack extends cdk.Stack {
  bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const applicationName = 'web';
    const repositoryName = `${props.repositoryNamespace}/${applicationName}`;

    const repository = new ecr.Repository(this, 'Repository', {
      repositoryName,
      imageScanOnPush: true,
    });

    repository.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowPushFromCIAccount',
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(props.ciAccount)],
        actions: [
          'ecr:PutImage',
          'ecr:InitiateLayerUpload',
          'ecr:UploadLayerPart',
          'ecr:CompleteLayerUpload',
          'ecr:BatchCheckLayerAvailability',
        ],
      })
    );

    this.bucket = new s3.Bucket(this, 'Bucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      accessControl: s3.BucketAccessControl.PRIVATE,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'OriginAccessIdentity',
      {
        comment: applicationName,
      }
    );

    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [
          new iam.CanonicalUserPrincipal(
            originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
        actions: ['s3:GetObject'],
        resources: [this.bucket.arnForObjects('*')],
      })
    );

    if (cdk.Stack.of(this).region === props.regionGroup.primaryRegion) {
      const distribution = new cloudfront.CloudFrontWebDistribution(
        this,
        'Distribution',
        {
          defaultRootObject: 'index.html',
          originConfigs: [
            {
              s3OriginSource: {
                s3BucketSource: this.bucket,
                originAccessIdentity,
              },
              behaviors: [
                {
                  isDefaultBehavior: true,
                },
              ],
            },
          ],
          errorConfigurations: [
            {
              errorCode: 403,
              responseCode: 403,
              responsePagePath: '/index.html',
            },
            {
              errorCode: 404,
              responseCode: 404,
              responsePagePath: '/index.html',
            },
          ],
          priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
          enableIpV6: true,
          viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(
            props.dns.certificate,
            {
              securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
              aliases: [props.dns.publicHostedZone.zoneName],
            }
          ),
        }
      );

      const recordSet = new route53.RecordSet(this, 'RecordSet', {
        zone: props.dns.publicHostedZone,
        recordType: route53.RecordType.A,
        target: route53.RecordTarget.fromAlias(
          new route53_targets.CloudFrontTarget(distribution)
        ),
      });
    }

    const codebuildServiceRole = new iam.Role(this, 'CodeBuildServiceRole', {
      description: 'CodeBuild Project role',
      assumedBy: new iam.ServicePrincipal(
        `codebuild.${cdk.Stack.of(this).urlSuffix}`
      ),
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
          pre_build: {
            commands: [
              '$(aws ecr get-login --registry-ids ${ECR_ACCOUNT} --no-include-email)',
            ],
          },
          build: {
            commands: [
              'set -e',
              'RELEASE_IMAGE="${REGISTRY_URI}/${REPOSITORY_NAME}:${IMAGE_TAG}"',
              'docker run --name release ${RELEASE_IMAGE}',
              'docker cp release:/opt/app/dist ./',
              'echo "${CONFIG_JSON}" > dist/assets/config.json',
            ],
          },
          post_build: {
            commands: ['docker container rm release'],
          },
        },
        artifacts: {
          'base-directory': 'dist',
          files: ['**/*'],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_4,
        privileged: true,
        environmentVariables: {
          REPOSITORY_NAME: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: repository.repositoryName,
          },
          ECR_ACCOUNT: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Stack.of(this).account,
          },
          IMAGE_TAG: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.imageTag,
          },
          REGISTRY_URI: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: `${cdk.Stack.of(this).account}.dkr.ecr.${
              cdk.Stack.of(this).region
            }.${cdk.Stack.of(this).urlSuffix}`,
          },
          CONFIG_JSON: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.configJson,
          },
        },
      },
    });

    const codepipelineServiceRole = new iam.Role(
      this,
      'CodePipelineServiceRole',
      {
        description: 'CodePipeline Service role',
        assumedBy: new iam.ServicePrincipal(
          `codepipeline.${cdk.Stack.of(this).urlSuffix}`
        ),
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
          S3: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['s3:GetObject*', 's3:PutObject*'],
                resources: [this.bucket.arnForObjects('*')],
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
              repository,
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
          actions: [
            new codepipeline_actions.S3DeployAction({
              actionName: 'Bucket',
              runOrder: 1,
              input: artifact,
              bucket: this.bucket,
            }),
          ],
        },
      ],
    });

    const eventRole = new iam.Role(this, 'CloudWatchEventRole', {
      description: `CloudWatch Event role for ${repository.repositoryName}:${props.imageTag}`,
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
      description: `${repository.repositoryName}:${props.imageTag} to ${pipeline.pipelineName}`,
      eventPattern: {
        detail: {
          'action-type': ['PUSH'],
          'image-tag': [props.imageTag],
          'repository-name': [repository.repositoryName],
          result: ['SUCCESS'],
        },
        detailType: ['ECR Image Action'],
        source: ['aws.ecr'],
      },
      targets: [new events_targets.CodePipeline(pipeline, {eventRole})],
    });
  }
}

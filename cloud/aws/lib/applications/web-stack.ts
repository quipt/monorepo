import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53_targets from '@aws-cdk/aws-route53-targets';
import * as ecr from '@aws-cdk/aws-ecr';
import { DnsStack } from '../dns-stack';
import { SpaCdStack } from '../cd/spa-cd-stack';
import { RegionGroup } from '../application-account';

export interface WebStackProps extends cdk.StackProps {
  repositoryNamespace: string;
  imageTag: string;
  dns: DnsStack;
  configJson: string;
  ciAccount: string;
  regionGroup: RegionGroup;
}

export class WebStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const applicationName = 'web';
    const repositoryName = `${props.repositoryNamespace}/${applicationName}`;

    const repository = new ecr.Repository(this, 'Repository', {
      repositoryName,
      imageScanOnPush: true,
    });

    // repository.addToResourcePolicy(
    //   new iam.PolicyStatement({
    //     sid: 'AllowPushFromCIAccount',
    //     effect: iam.Effect.ALLOW,
    //     principals: [new iam.AccountPrincipal(props.ciAccount)],
    //     actions: [
    //       'ecr:PutImage',
    //       'ecr:InitiateLayerUpload',
    //       'ecr:UploadLayerPart',
    //       'ecr:CompleteLayerUpload',
    //       'ecr:BatchCheckLayerAvailability',
    //     ],
    //   })
    // );

    const bucket = new s3.Bucket(this, 'Bucket', {
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

    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [
          new iam.CanonicalUserPrincipal(
            originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
        actions: ['s3:GetObject'],
        resources: [bucket.arnForObjects('*')],
      })
    );

    if (this.region === props.regionGroup.primaryRegion) {
      const distribution = new cloudfront.CloudFrontWebDistribution(
        this,
        'Distribution',
        {
          originConfigs: [
            {
              s3OriginSource: {
                s3BucketSource: bucket,
                originAccessIdentity,
              },
              behaviors: [
                {
                  isDefaultBehavior: true,
                },
              ],
            },
          ],
          priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
          enableIpV6: true,
          viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(
            props.dns.certificate,
            {
              securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
              aliases: [
                `${applicationName}.${props.dns.publicHostedZone.zoneName}`,
              ],
            }
          ),
        }
      );

      const recordSet = new route53.RecordSet(this, 'RecordSet', {
        zone: props.dns.publicHostedZone,
        recordName: applicationName,
        recordType: route53.RecordType.A,
        target: route53.RecordTarget.fromAlias(
          new route53_targets.CloudFrontTarget(distribution)
        ),
      });
    }

    const cd = new SpaCdStack(this, 'CD', {
      imageTag: props.imageTag,
      repository,
      bucket,
      configJson: props.configJson,
    });
  }
}

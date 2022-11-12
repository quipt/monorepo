import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as path from 'path';
import * as fs from 'fs';
import {DnsStack} from '../dns-stack';

export interface AppsyncStackProps extends cdk.StackProps {
  dns: DnsStack;
  clientId: string;
  issuer: string;
}

export class AppsyncStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppsyncStackProps) {
    super(scope, id);

    const apiLogsRole = new iam.Role(this, 'CloudWatchLogsRole', {
      assumedBy: new iam.ServicePrincipal(
        `appsync.${cdk.Stack.of(this).urlSuffix}`
      ),
      inlinePolicies: {
        cloudwatchLogs: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: [
                `arn:${cdk.Stack.of(this).partition}:logs:${
                  cdk.Stack.of(this).region
                }:${cdk.Stack.of(this).account}:*`,
              ],
            }),
          ],
        }),
      },
    });

    const api = new appsync.CfnGraphQLApi(this, 'Api', {
      name: 'api',
      authenticationType: 'OPENID_CONNECT',
      openIdConnectConfig: {
        issuer: props.issuer,
      },
      xrayEnabled: true,
      logConfig: {
        cloudWatchLogsRoleArn: apiLogsRole.roleArn,
        excludeVerboseContent: false,
        fieldLogLevel: 'ALL',
      },
    });

    const domainName = new appsync.CfnDomainName(this, 'DomainName', {
      certificateArn: props.dns.certificate.certificateArn,
      domainName: `api.${props.dns.publicHostedZone.zoneName}`,
    });

    const domainNameApiAssociation = new appsync.CfnDomainNameApiAssociation(
      this,
      'DomainNameApiAssociation',
      {
        apiId: api.attrApiId,
        domainName: domainName.attrDomainName,
      }
    );

    const recordSet = new route53.RecordSet(this, 'RecordSet', {
      zone: props.dns.publicHostedZone,
      recordName: 'api',
      recordType: route53.RecordType.CNAME,
      target: route53.RecordTarget.fromValues(domainName.attrAppSyncDomainName),
    });

    const schema = new appsync.CfnGraphQLSchema(this, 'Schema', {
      apiId: api.attrApiId,
      definition: fs
        .readFileSync(path.join(__dirname, '../../graphql/schema.graphql'))
        .toString(),
    });

    // print out the AppSync GraphQL endpoint to the terminal
    new cdk.CfnOutput(this, 'GraphQLAPIURL', {
      value: api.attrGraphQlUrl,
    });

    const apiLambda = new lambda_nodejs.NodejsFunction(this, 'AppSyncHandler', {
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: path.join(__dirname, '../../../api/main.ts'),
      bundling: {
        forceDockerBundling: true,
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
    });

    const mediaHandlerLambda = new lambda.DockerImageFunction(
      this,
      'MediaHandler',
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, '../../../media-handler/')
        ),
        timeout: cdk.Duration.minutes(15),
        memorySize: 1536,
        environment: {
          FFMPEG_ARGS:
            "-c:a copy -vf format=yuv420p,scale='min(320\\,iw):-2' -movflags +faststart out.mp4 -vf thumbnail -vf scale='min(320\\,iw):-2' -vframes 1 out.png",
          MIME_TYPES: JSON.stringify({png: 'image/png', mp4: 'video/mp4'}),
          VIDEO_MAX_DURATION: '120',
        },
      }
    );

    const serviceRole = new iam.Role(this, 'DataSourceServiceRole', {
      assumedBy: new iam.ServicePrincipal(
        `appsync.${cdk.Stack.of(this).urlSuffix}`
      ),
      inlinePolicies: {
        lambdaInvoke: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: [apiLambda.functionArn],
            }),
          ],
        }),
      },
    });

    const dataSource = new appsync.CfnDataSource(this, 'lambdaDatasource', {
      apiId: api.attrApiId,
      name: 'lambdaDatasource',
      type: 'AWS_LAMBDA',
      lambdaConfig: {
        lambdaFunctionArn: apiLambda.functionArn,
      },
      serviceRoleArn: serviceRole.roleArn,
    });

    dataSource.node.addDependency(schema);

    new appsync.CfnResolver(this, 'getBoardByIdResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Query',
      fieldName: 'getBoardById',
    });

    new appsync.CfnResolver(this, 'listBoardsResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Query',
      fieldName: 'listBoards',
    });

    new appsync.CfnResolver(this, 'listMyBoardsResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Query',
      fieldName: 'listMyBoards',
    });

    new appsync.CfnResolver(this, 'getFavoriteResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Query',
      fieldName: 'getFavorite',
    });

    new appsync.CfnResolver(this, 'createBoardResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Mutation',
      fieldName: 'createBoard',
    });

    new appsync.CfnResolver(this, 'deleteBoardResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Mutation',
      fieldName: 'deleteBoard',
    });

    new appsync.CfnResolver(this, 'updateBoardResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Mutation',
      fieldName: 'updateBoard',
    });

    new appsync.CfnResolver(this, 'createTokenResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Mutation',
      fieldName: 'createToken',
    });

    new appsync.CfnResolver(this, 'createClipsResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Mutation',
      fieldName: 'createClips',
    });

    new appsync.CfnResolver(this, 'createFavoriteResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Mutation',
      fieldName: 'createFavorite',
    });

    new appsync.CfnResolver(this, 'deleteFavoriteResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Mutation',
      fieldName: 'deleteFavorite',
    });

    new appsync.CfnResolver(this, 'updateClipResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Mutation',
      fieldName: 'updateClip',
    });

    new appsync.CfnResolver(this, 'deleteClipResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.attrName,
      typeName: 'Mutation',
      fieldName: 'deleteClip',
    });

    const boardsTable = new dynamodb.Table(this, 'BoardsTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
    });

    boardsTable.addGlobalSecondaryIndex({
      indexName: 'owner-id',
      partitionKey: {
        name: 'owner',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
    });

    const hashesTable = new dynamodb.Table(this, 'HashesTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'hash',
        type: dynamodb.AttributeType.BINARY,
      },
    });

    const clipsTable = new dynamodb.Table(this, 'ClipsTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'boardId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'clipId',
        type: dynamodb.AttributeType.STRING,
      },
    });

    const favoritesTable = new dynamodb.Table(this, 'FavoritesTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'boardId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
    });

    boardsTable.grantReadWriteData(apiLambda);
    hashesTable.grantReadWriteData(apiLambda);
    clipsTable.grantReadWriteData(apiLambda);
    favoritesTable.grantReadWriteData(apiLambda);

    hashesTable.grantReadWriteData(mediaHandlerLambda);

    apiLambda.addEnvironment('BOARDS_TABLE', boardsTable.tableName);
    apiLambda.addEnvironment('HASHES_TABLE', hashesTable.tableName);
    apiLambda.addEnvironment('CLIPS_TABLE', clipsTable.tableName);
    apiLambda.addEnvironment('FAVORITES_TABLE', favoritesTable.tableName);

    mediaHandlerLambda.addEnvironment('HASHES_TABLE', hashesTable.tableName);

    const uploadBucket = new s3.Bucket(this, 'UploadBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      accessControl: s3.BucketAccessControl.PRIVATE,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    uploadBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [s3.HttpMethods.POST],
    });

    uploadBucket.grantWrite(apiLambda);
    uploadBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3_notifications.LambdaDestination(mediaHandlerLambda)
    );

    uploadBucket.grantRead(mediaHandlerLambda);
    apiLambda.addEnvironment('UPLOAD_BUCKET_NAME', uploadBucket.bucketName);

    const processedBucket = new s3.Bucket(this, 'ProcessedBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      accessControl: s3.BucketAccessControl.PRIVATE,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    processedBucket.grantWrite(mediaHandlerLambda);
    mediaHandlerLambda.addEnvironment(
      'PROCESSED_BUCKET',
      processedBucket.bucketName
    );

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'OriginAccessIdentity',
      {}
    );

    processedBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [
          new iam.CanonicalUserPrincipal(
            originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
        actions: ['s3:GetObject'],
        resources: [processedBucket.arnForObjects('*')],
      })
    );

    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      'Distribution',
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: processedBucket,
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
            securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            aliases: [`media.${props.dns.publicHostedZone.zoneName}`],
          }
        ),
      }
    );

    new route53.RecordSet(this, 'CloudFrontRecordSet', {
      zone: props.dns.publicHostedZone,
      recordName: 'media',
      recordType: route53.RecordType.A,
      target: route53.RecordTarget.fromAlias(
        new route53_targets.CloudFrontTarget(distribution)
      ),
    });
  }
}

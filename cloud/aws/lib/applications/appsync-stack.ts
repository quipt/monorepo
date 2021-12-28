import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';
import * as fs from 'fs';

export interface AppsyncStackProps extends cdk.StackProps {
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
        clientId: props.clientId,
        issuer: props.issuer,
      },
      xrayEnabled: true,
      logConfig: {
        cloudWatchLogsRoleArn: apiLogsRole.roleArn,
        excludeVerboseContent: false,
        fieldLogLevel: 'ALL',
      },
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
      entry: path.join(__dirname, '../../lambda/api/main.ts'),
      bundling: {
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
          path.join(__dirname, '../../lambda/mediaHandler/')
        ),
        timeout: cdk.Duration.minutes(15),
        memorySize: 1536,
        environment: {
          FFMPEG_ARGS:
            "-c:a copy -vf scale='min(320\\,iw):-2' -movflags +faststart out.mp4 -vf thumbnail -vf scale='min(320\\,iw):-2' -vframes 1 out.png",
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

    new appsync.CfnResolver(this, 'getBoardByIdResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.name,
      typeName: 'Query',
      fieldName: 'getBoardById',
    });

    new appsync.CfnResolver(this, 'listBoardsResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.name,
      typeName: 'Query',
      fieldName: 'listBoards',
    });

    new appsync.CfnResolver(this, 'createBoardResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.name,
      typeName: 'Mutation',
      fieldName: 'createBoard',
    });

    new appsync.CfnResolver(this, 'deleteBoardResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.name,
      typeName: 'Mutation',
      fieldName: 'deleteBoard',
    });

    new appsync.CfnResolver(this, 'updateBoardResolver', {
      apiId: api.attrApiId,
      dataSourceName: dataSource.name,
      typeName: 'Mutation',
      fieldName: 'updateBoard',
    });

    const boardsTable = new dynamodb.Table(this, 'BoardsTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
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

    boardsTable.grantReadWriteData(apiLambda);
    hashesTable.grantReadWriteData(apiLambda);
    hashesTable.grantReadWriteData(mediaHandlerLambda);

    apiLambda.addEnvironment('BOARDS_TABLE', boardsTable.tableName);
    apiLambda.addEnvironment('HASHES_TABLE', hashesTable.tableName);
    mediaHandlerLambda.addEnvironment('HASHES_TABLE', hashesTable.tableName);

    const uploadBucket = new s3.Bucket(this, 'UploadBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      accessControl: s3.BucketAccessControl.PRIVATE,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
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
  }
}

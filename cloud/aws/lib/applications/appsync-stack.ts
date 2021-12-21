import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import * as fs from 'fs';

export interface AppsyncStackProps extends cdk.StackProps {
  clientId: string;
  issuer: string;
}

export class AppsyncStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppsyncStackProps) {
    super(scope, id);

    // const api = new appsync.GraphqlApi(this, 'Api', {
    //   name: 'cdk-appsync-api',
    //   schema: appsync.Schema.fromAsset(
    //     path.join(__dirname, '../../graphql/schema.graphql')
    //   ),
    //   authorizationConfig: {
    //     defaultAuthorization: {
    //       authorizationType: appsync.AuthorizationType.API_KEY,
    //       apiKeyConfig: {
    //         expires: cdk.Expiration.after(cdk.Duration.days(365)),
    //       },
    //     },
    //   },
    //   xrayEnabled: true,
    // });

    const apiLogsRole = new iam.Role(this, 'CloudWatchLogsRole', {
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
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
      name: 'cdk-appsync-api',
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

    const boardsLambda = new lambda.Function(this, 'AppSyncHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/')),
      handler: 'main.handler',
    });

    const serviceRole = new iam.Role(this, 'DataSourceServiceRole', {
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
      inlinePolicies: {
        lambdaInvoke: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: [boardsLambda.functionArn],
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
        lambdaFunctionArn: boardsLambda.functionArn,
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

    // create DynamoDB table
    const boardsTable = new dynamodb.Table(this, 'CDKBoardsTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // enable the Lambda function to access the DynamoDB table (using IAM)
    boardsTable.grantReadWriteData(boardsLambda);

    boardsLambda.addEnvironment('BOARDS_TABLE', boardsTable.tableName);
  }
}

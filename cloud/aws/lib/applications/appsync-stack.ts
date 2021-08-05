import * as cdk from '@aws-cdk/core';
import * as appsync from '@aws-cdk/aws-appsync';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';

export class AppsyncStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new appsync.GraphqlApi(this, 'Api', {
      name: 'cdk-appsync-api',
      schema: appsync.Schema.fromAsset('graphql/schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365)),
          },
        },
      },
      xrayEnabled: true,
    });

    // print out the AppSync GraphQL endpoint to the terminal
    new cdk.CfnOutput(this, 'GraphQLAPIURL', {
      value: api.graphqlUrl,
    });

    // print out the AppSync API Key to the terminal
    new cdk.CfnOutput(this, 'GraphQLAPIKey', {
      value: api.apiKey || '',
    });

    const boardsLambda = new lambda.Function(this, 'AppSyncBoardsHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'main.handler',
      code: lambda.Code.fromAsset('lambda'),
      memorySize: 1024,
    });

    // set the new Lambda function as a data source for the AppSync API
    const lambdaDs = api.addLambdaDataSource('lambdaDatasource', boardsLambda);

    // create resolvers to match GraphQL operations in schema
    lambdaDs.createResolver({
      typeName: 'Query',
      fieldName: 'getBoardById',
    });

    lambdaDs.createResolver({
      typeName: 'Query',
      fieldName: 'listBoards',
    });

    lambdaDs.createResolver({
      typeName: 'Mutation',
      fieldName: 'createBoard',
    });

    lambdaDs.createResolver({
      typeName: 'Mutation',
      fieldName: 'deleteBoard',
    });

    lambdaDs.createResolver({
      typeName: 'Mutation',
      fieldName: 'updateBoard',
    });

    // create DynamoDB table
    const boardsTable = new ddb.Table(this, 'CDKBoardsTable', {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
    });

    // enable the Lambda function to access the DynamoDB table (using IAM)
    boardsTable.grantReadWriteData(boardsLambda);

    boardsLambda.addEnvironment('BOARDS_TABLE', boardsTable.tableName);
  }
}

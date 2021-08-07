import * as cdk from '@aws-cdk/core';
import * as appsync from '@aws-cdk/aws-appsync';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import * as path from 'path';

export class AppsyncStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new appsync.GraphqlApi(this, 'Api', {
      name: 'cdk-appsync-api',
      schema: appsync.Schema.fromAsset(
        path.join(__dirname, '../../graphql/schema.graphql')
      ),
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

    const boardsLambda = new lambda.NodejsFunction(this, 'AppSyncHandler', {
      entry: path.join(__dirname, '../../lambda/main.ts'),
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
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

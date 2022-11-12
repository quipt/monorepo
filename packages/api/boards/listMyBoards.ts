import * as AWS from 'aws-sdk';
const docClient = new AWS.DynamoDB.DocumentClient();

export default async function listMyBoards(sub: string, nextToken?: string) {
  const params: AWS.DynamoDB.DocumentClient.QueryInput = {
    TableName: process.env.BOARDS_TABLE!,
    IndexName: 'owner-id',
    KeyConditionExpression: '#0 = :0',
    ExpressionAttributeNames: {
      '#0': 'owner',
    },
    ExpressionAttributeValues: {
      ':0': sub,
    },
  };

  if (nextToken) {
    params.ExclusiveStartKey = {
      owner: sub,
      id: nextToken,
    };
  }

  try {
    const data = await docClient.query(params).promise();

    return data;
  } catch (err) {
    console.error('DynamoDB error: ', err);
    return null;
  }
}

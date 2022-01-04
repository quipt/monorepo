import * as AWS from 'aws-sdk';
const docClient = new AWS.DynamoDB.DocumentClient();

export default async function deleteBoard(id: string, owner: string) {
  const params: AWS.DynamoDB.DocumentClient.DeleteItemInput = {
    TableName: process.env.BOARDS_TABLE!,
    Key: {
      id,
    },
    ConditionExpression: 'owner = :0',
    ExpressionAttributeValues: {
      ':0': owner,
    },
  };
  try {
    await docClient.delete(params).promise();
    return id;
  } catch (err) {
    console.error('DynamoDB error: ', err);
    return null;
  }
}

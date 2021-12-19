import * as AWS from 'aws-sdk';
const docClient = new AWS.DynamoDB.DocumentClient();

export default async function deleteBoard(id: String) {
  const params: AWS.DynamoDB.DocumentClient.DeleteItemInput = {
    TableName: process.env.BOARDS_TABLE!,
    Key: {
      id,
    },
  };
  try {
    await docClient.delete(params).promise();
    return id;
  } catch (err) {
    console.log('DynamoDB error: ', err);
    return null;
  }
}

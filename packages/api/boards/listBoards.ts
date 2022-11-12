import * as AWS from 'aws-sdk';
const docClient = new AWS.DynamoDB.DocumentClient();

export default async function listBoards() {
  const params: AWS.DynamoDB.DocumentClient.ScanInput = {
    TableName: process.env.BOARDS_TABLE,
  };
  try {
    const data = await docClient.scan(params).promise();
    return data.Items;
  } catch (err) {
    console.error('DynamoDB error: ', err);
    return null;
  }
}

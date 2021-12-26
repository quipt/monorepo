import * as AWS from 'aws-sdk';
const docClient = new AWS.DynamoDB.DocumentClient();

export default async function getBoardById(id: String) {
  const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
    TableName: process.env.BOARDS_TABLE!,
    Key: {id},
  };
  try {
    const {Item} = await docClient.get(params).promise();
    return Item;
  } catch (err) {
    console.error('DynamoDB error: ', err);
    return null;
  }
}

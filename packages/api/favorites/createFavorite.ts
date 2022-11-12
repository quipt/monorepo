import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient();
export default async function createFavorite(boardId: string, userId: string) {
  const Item = {
    boardId,
    userId,
    created: new Date().toISOString(),
  };
  await docClient
    .put({
      TableName: process.env.FAVORITES_TABLE,
      Item,
    })
    .promise();

  return Item;
}

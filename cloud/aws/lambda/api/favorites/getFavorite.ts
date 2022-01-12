import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient();
export default async function getFavorite(boardId: string, userId: string) {
  const resp = await docClient
    .get({
      TableName: process.env.FAVORITES_TABLE!,
      Key: {
        boardId,
        userId,
      },
    })
    .promise();

  return resp.Item;
}

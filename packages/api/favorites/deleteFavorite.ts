import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient();

export default async function deleteFavorite(boardId: string, userId: string) {
  const Key = {
    boardId,
    userId,
  };
  const resp = await docClient
    .delete({
      TableName: process.env.FAVORITES_TABLE!,
      Key,
    })
    .promise();

  return Key;
}

import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient();

export default async function deleteClip(
  boardId: string,
  clipId: string,
  sub: string
) {
  const resp = await docClient
    .get({
      TableName: process.env.BOARDS_TABLE,
      Key: {
        id: boardId,
      },
    })
    .promise();

  if (sub !== resp?.Item?.owner) {
    return;
  }

  await docClient
    .delete({
      TableName: process.env.CLIPS_TABLE,
      Key: {
        boardId,
        clipId,
      },
    })
    .promise();

  return clipId;
}

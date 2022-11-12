import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient();

interface Clip {
  clipId: string;
  caption: string;
}

export type CreateClipsInput = [Clip];

export default async function updateClip(
  boardId: string,
  clip: Clip,
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
    .update({
      TableName: process.env.CLIPS_TABLE,
      Key: {
        boardId,
        clipId: clip.clipId,
      },
      UpdateExpression: 'set #0 = :0',
      ExpressionAttributeNames: {
        '#0': 'caption',
      },
      ExpressionAttributeValues: {
        ':0': clip.caption,
      },
    })
    .promise();

  return clip;
}

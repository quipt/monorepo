import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient();

interface Clip {
  clipId: string;
  caption: string;
}

export type CreateClipsInput = [Clip];

export default async function createClips(
  boardId: string,
  clips: CreateClipsInput,
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
    .batchWrite({
      RequestItems: {
        [process.env.CLIPS_TABLE]: clips.map(clip => {
          return {
            PutRequest: {
              Item: {
                boardId,
                clipId: clip.clipId,
                caption: clip.caption,
              },
            },
          };
        }),
      },
    })
    .promise();

  return clips;
}

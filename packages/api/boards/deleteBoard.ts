import * as AWS from 'aws-sdk';
const docClient = new AWS.DynamoDB.DocumentClient();

export default async function deleteBoard(id: string, owner: string) {
  const params: AWS.DynamoDB.DocumentClient.DeleteItemInput = {
    TableName: process.env.BOARDS_TABLE,
    Key: {
      id,
    },
    ConditionExpression: '#0 = :0',
    ExpressionAttributeNames: {
      '#0': 'owner',
    },
    ExpressionAttributeValues: {
      ':0': owner,
    },
  };
  try {
    await docClient.delete(params).promise();

    const clips = await docClient
      .query({
        TableName: process.env.CLIPS_TABLE,
        KeyConditionExpression: '#0 = :0',
        ExpressionAttributeNames: {
          '#0': 'boardId',
        },
        ExpressionAttributeValues: {
          ':0': id,
        },
      })
      .promise();

    if (clips.Items?.length) {
      await docClient
        .batchWrite({
          RequestItems: {
            [process.env.CLIPS_TABLE]: clips.Items.map(clip => {
              return {
                DeleteRequest: {
                  Key: {
                    boardId: clip.boardId,
                    clipId: clip.clipId,
                  },
                },
              };
            }),
          },
        })
        .promise();
    }

    return id;
  } catch (err) {
    console.error('DynamoDB error: ', err);
    return null;
  }
}

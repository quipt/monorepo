import * as AWS from 'aws-sdk';
const docClient = new AWS.DynamoDB.DocumentClient();

export default async function getBoardById(id: string) {
  const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
    TableName: process.env.BOARDS_TABLE!,
    Key: {id},
  };
  try {
    const {Item} = await docClient.get(params).promise();

    const clips = await docClient
      .query({
        TableName: process.env.CLIPS_TABLE!,
        KeyConditionExpression: '#0 = :0',
        ExpressionAttributeNames: {
          '#0': 'boardId',
        },
        ExpressionAttributeValues: {
          ':0': id,
        },
      })
      .promise();

    const favorites = await docClient
      .query({
        TableName: process.env.FAVORITES_TABLE!,
        KeyConditionExpression: '#0 = :0',
        ExpressionAttributeNames: {
          '#0': 'boardId',
        },
        ExpressionAttributeValues: {
          ':0': id,
        },
      })
      .promise();

    return {
      ...Item,
      clips: clips.Items,
      favorites: favorites.Count,
    };
  } catch (err) {
    console.error('DynamoDB error: ', err);
    return null;
  }
}

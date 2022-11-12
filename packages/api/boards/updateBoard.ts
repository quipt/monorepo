import * as AWS from 'aws-sdk';
const docClient = new AWS.DynamoDB.DocumentClient();
import Board from './Board';

export type UpdateBoardInput = Pick<Board, 'id' | 'title'>;

async function updateBoard(board: UpdateBoardInput, owner: string) {
  const params: AWS.DynamoDB.DocumentClient.UpdateItemInput = {
    TableName: process.env.BOARDS_TABLE,
    Key: {
      id: board.id,
    },
    ExpressionAttributeNames: {
      '#0': 'owner',
    },
    ExpressionAttributeValues: {
      ':0': owner,
    },
    ConditionExpression: '#0 = :0',
    UpdateExpression: '',
    ReturnValues: 'UPDATED_NEW',
  };
  let prefix = 'set ';

  const updatedBoard = {
    ...board,
    updated: new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(updatedBoard)) {
    if (key === 'id') {
      continue;
    }

    params.UpdateExpression += prefix + '#' + key + ' = :' + key;
    params.ExpressionAttributeNames[`#${key}`] = key;
    params.ExpressionAttributeValues[`:${key}`] = value;
    prefix = ', ';
  }

  try {
    return await docClient.update(params).promise();
  } catch (err) {
    console.error('DynamoDB error: ', err);
    return null;
  }
}

export default updateBoard;

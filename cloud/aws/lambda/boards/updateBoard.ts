import * as AWS from 'aws-sdk';
const docClient = new AWS.DynamoDB.DocumentClient();
import Board from './Board';

async function updateNote(board: Board) {
  const params: AWS.DynamoDB.DocumentClient.UpdateItemInput = {
    TableName: process.env.BOARDS_TABLE!,
    Key: {
      id: board.id,
    },
    ExpressionAttributeValues: {},
    ExpressionAttributeNames: {},
    UpdateExpression: '',
    ReturnValues: 'UPDATED_NEW',
  };
  let prefix = 'set ';

  for (const [key, value] of Object.entries(board)) {
    if (key === 'id') {
      continue;
    }

    params.UpdateExpression += prefix + '#' + key + ' = :' + key;
    params.ExpressionAttributeNames![`#${key}`] = key;
    params.ExpressionAttributeValues![`:${key}`] = value;
    prefix = ', ';
  }
  console.log('params: ', params);
  try {
    await docClient.update(params).promise();
    return board;
  } catch (err) {
    console.error('DynamoDB error: ', err);
    return null;
  }
}

export default updateNote;

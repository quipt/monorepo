import * as AWS from 'aws-sdk';
const docClient = new AWS.DynamoDB.DocumentClient();
import Board from './Board';

export default async function createBoard(board: Board) {
  const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
    TableName: process.env.BOARDS_TABLE!,
    Item: board,
  };
  try {
    await docClient.put(params).promise();
    return board;
  } catch (err) {
    console.log('DynamoDB error: ', err);
    return null;
  }
}

import * as AWS from 'aws-sdk';
import {nanoid} from 'nanoid';
import Board from './Board';

const docClient = new AWS.DynamoDB.DocumentClient();

export default async function createBoard(board: Board) {
  const Item = {
    ...board,
    id: nanoid(),
  };

  const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
    TableName: process.env.BOARDS_TABLE!,
    Item,
  };
  try {
    await docClient.put(params).promise();
    return Item;
  } catch (err) {
    console.error('DynamoDB error: ', err);
    return null;
  }
}

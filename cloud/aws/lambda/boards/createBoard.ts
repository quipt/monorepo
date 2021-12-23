import * as AWS from 'aws-sdk';
import {nanoid} from 'nanoid';
import Board from './Board';

const docClient = new AWS.DynamoDB.DocumentClient();

export type CreateBoardInput = Pick<Board, 'title'>;

export default async function createBoard(
  input: CreateBoardInput,
  owner: string
) {
  const now = Date.now();

  const Item = {
    ...input,
    id: nanoid(),
    owner,
    created: now,
    updated: now,
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

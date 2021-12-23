import createBoard, {CreateBoardInput} from './boards/createBoard';
import deleteBoard from './boards/deleteBoard';
import getBoardById from './boards/getBoardById';
import listBoards from './boards/listBoards';
import updateBoard, {UpdateBoardInput} from './boards/updateBoard';

import {AppSyncResolverEvent, Context} from 'aws-lambda';

type Event = {
  info: {
    fieldName: string;
  };
  identity: {
    sub: string;
  };
  arguments: { 
    id: string;
    board: CreateBoardInput & UpdateBoardInput;
  };
};

export async function handler(event: Event, context: Context) {
  console.log({event, context});

  const {sub} = event.identity;

  switch (event.info.fieldName) {
    case 'getBoardById':
      return await getBoardById(event.arguments.id);
    case 'createBoard':
      return await createBoard(event.arguments.board, sub);
    case 'listBoards':
      return await listBoards();
    case 'deleteBoard':
      return await deleteBoard(event.arguments.id, sub);
    case 'updateBoard':
      return await updateBoard(event.arguments.board, sub);
    default:
      return null;
  }
}

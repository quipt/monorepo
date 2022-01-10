import {AppSyncResolverEvent, Context} from 'aws-lambda';

import createBoard, {CreateBoardInput} from './boards/createBoard';
import deleteBoard from './boards/deleteBoard';
import getBoardById from './boards/getBoardById';
import listBoards from './boards/listBoards';
import updateBoard, {UpdateBoardInput} from './boards/updateBoard';
import createToken from './tokens/createToken';
import createClips, {CreateClipsInput} from './clips/createClips';
import createFavorite from './favorites/createFavorite';
import deleteFavorite from './favorites/deleteFavorite';

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
    hash: string;
    size: number;
    boardId: string;
    clips: CreateClipsInput;
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
    case 'createToken':
      return await createToken(event.arguments.hash, event.arguments.size, sub);
    case 'createClips':
      return await createClips(
        event.arguments.boardId,
        event.arguments.clips,
        sub
      );
    case 'createFavorite':
      return await createFavorite(event.arguments.boardId, sub);
    case 'deleteFavorite':
      return await deleteFavorite(event.arguments.boardId, sub);
    default:
      return null;
  }
}

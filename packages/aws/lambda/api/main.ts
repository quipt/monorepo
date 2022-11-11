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
import getFavorite from './favorites/getFavorite';
import updateClip from './clips/updateClip';
import deleteClip from './clips/deleteClip';
import listMyBoards from './boards/listMyBoards';

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
    clip: {
      clipId: string;
      caption: string;
    };
    clipId: string;
    nextToken?: string;
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
    case 'listMyBoards':
      return await listMyBoards(sub, event.arguments.nextToken);
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
    case 'updateClip':
      return await updateClip(
        event.arguments.boardId,
        event.arguments.clip,
        sub
      );
    case 'deleteClip':
      return await deleteClip(
        event.arguments.boardId,
        event.arguments.clipId,
        sub
      );
    case 'createFavorite':
      return await createFavorite(event.arguments.boardId, sub);
    case 'deleteFavorite':
      return await deleteFavorite(event.arguments.boardId, sub);
    case 'getFavorite':
      return await getFavorite(event.arguments.boardId, sub);
    default:
      return null;
  }
}

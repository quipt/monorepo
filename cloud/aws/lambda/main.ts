import createBoard from './boards/createBoard';
import deleteBoard from './boards/deleteBoard';
import getBoardById from './boards/getBoardById';
import listBoards from './boards/listBoards';
import updateBoard from './boards/updateBoard';
import Board from './boards/Board';

type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {
    boardId: string;
    board: Board;
  };
};

export async function handler(event: AppSyncEvent) {
  switch (event.info.fieldName) {
    case 'getBoardById':
      return await getBoardById(event.arguments.boardId);
    case 'createBoard':
      return await createBoard(event.arguments.board);
    case 'listBoards':
      return await listBoards();
    case 'deleteBoard':
      return await deleteBoard(event.arguments.boardId);
    case 'updateBoard':
      return await updateBoard(event.arguments.board);
    default:
      return null;
  }
}

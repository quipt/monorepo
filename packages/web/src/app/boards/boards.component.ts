import {Component, OnInit} from '@angular/core';
import {MatLegacyDialog as MatDialog} from '@angular/material/legacy-dialog';
import gql from 'graphql-tag';
import {ApiService} from '../api.service';
import {NewBoardModalComponent} from '../new-board-modal/new-board-modal.component';

const ListBoards = gql`
  query ListBoards {
    listBoards {
      id
      title
      owner
      created
      updated
    }
  }
`;

export const CreateBoard = gql`
  mutation CreateBoard($board: CreateBoardInput!) {
    createBoard(board: $board) {
      id
      title
    }
  }
`;

export interface board {
  id: string;
  title: string;
}

interface listBoardsData {
  listBoards: board[];
}

@Component({
  selector: 'app-boards',
  templateUrl: './boards.component.html',
  styleUrls: ['./boards.component.scss'],
})
export class BoardsComponent implements OnInit {
  boards: board[] = [];
  loaded: boolean = false;

  constructor(private api: ApiService, public dialog: MatDialog) {}

  async ngOnInit(): Promise<void> {
    const client = await this.api.hc();
    const observable = client.watchQuery<listBoardsData>({
      query: ListBoards,
      fetchPolicy: 'cache-and-network',
    });

    observable.subscribe(({data}) => {
      if (!data) {
        return console.log('ListBoards - no data');
      }
      this.boards = data.listBoards;
      this.loaded = true;
    });
  }

  async addBoard() {
    const client = await this.api.hc();
    const dialogRef = this.dialog.open(NewBoardModalComponent, {
      width: '250px',
      data: {title: ''},
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (!result) return;

      await client.mutate({
        mutation: CreateBoard,
        variables: {
          board: {
            title: result,
          },
        },
      });

      await this.ngOnInit();
    });
  }
}

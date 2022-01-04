import {Component, OnInit} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
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

const CreateBoard = gql`
  mutation CreateBoard($board: CreateBoardInput!) {
    createBoard(board: $board) {
      id
      title
    }
  }
`;

interface board {
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
    });
  }

  boards: board[] = [];

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

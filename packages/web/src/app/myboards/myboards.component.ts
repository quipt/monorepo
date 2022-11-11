import {Component, OnInit} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import gql from 'graphql-tag';
import {ApiService} from '../api.service';
import {board, CreateBoard} from '../boards/boards.component';
import {NewBoardModalComponent} from '../new-board-modal/new-board-modal.component';

const ListMyBoards = gql`
  query ListMyBoards {
    listMyBoards {
      Items {
        id
        title
        owner
        created
        updated
      }
    }
  }
`;

interface listBoardsData {
  listMyBoards: {
    Items: board[];
  };
}

@Component({
  selector: 'app-myboards',
  templateUrl: './myboards.component.html',
  styleUrls: ['./myboards.component.scss'],
})
export class MyboardsComponent implements OnInit {
  boards: board[] = [];

  constructor(private api: ApiService, public dialog: MatDialog) {}

  async ngOnInit(): Promise<void> {
    const client = await this.api.hc();
    const observable = client.watchQuery<listBoardsData>({
      query: ListMyBoards,
      fetchPolicy: 'network-only',
    });

    observable.subscribe(({data}) => {
      if (!data) {
        return console.log('ListMyBoards - no data');
      }
      this.boards = data.listMyBoards.Items;
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

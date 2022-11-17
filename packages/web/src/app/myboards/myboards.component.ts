import {Component, OnInit} from '@angular/core';
import {MatLegacyDialog as MatDialog} from '@angular/material/legacy-dialog';
import {Router} from '@angular/router';
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

interface createBoardData {
  createBoard: {
    id: string;
    title: string;
  };
}

@Component({
  selector: 'app-myboards',
  templateUrl: './myboards.component.html',
  styleUrls: ['./myboards.component.scss'],
})
export class MyboardsComponent implements OnInit {
  boards: board[] = [];
  loaded: boolean = false;

  constructor(private api: ApiService, public dialog: MatDialog, private router: Router) {}

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

      const mutation = await client.mutate<createBoardData>({
        mutation: CreateBoard,
        variables: {
          board: {
            title: result,
          },
        },
      });

      this.router.navigate([['/boards', mutation.data.createBoard.id].join('/')]);
    });
  }
}

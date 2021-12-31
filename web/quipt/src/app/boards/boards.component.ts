import {Component, OnInit} from '@angular/core';
import gql from 'graphql-tag';
import {ApiService} from '../api.service';

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
  constructor(private api: ApiService) {}

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

    await client.mutate({
      mutation: CreateBoard,
      variables: {
        board: {
          title: 'My new board - test',
        },
      },
    });

    await this.ngOnInit();
  }
}

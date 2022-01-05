import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ApiService} from '../api.service';

import gql from 'graphql-tag';

const GetBoardByIdQuery = gql`
  query GetBoardById($id: String!) {
    getBoardById(id: $id) {
      id
      title
      owner
      created
      updated
    }
  }
`;

const DeleteBoardMutation = gql`
  mutation DeleteBoardMutation($id: ID!) {
    deleteBoard(id: $id)
  }
`;

const CreateTokenMuation = gql`
  mutation CreateTokenMuation($hash: String, $size: Int) {
    createToken(hash: $hash, size: $size) {
      key
    }
  }
`;

interface Board {
  id: string;
  owner: string;
  title: string;
}

interface GetBoardById {
  getBoardById: Board;
}

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
})
export class BoardComponent implements OnInit {
  username = '';
  title = '';
  clipCount = 0;
  favorites = 0;
  favorited = false;
  boardId = '';

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private router: Router
  ) {
    this.route.params.subscribe(params => {
      this.boardId = params.boardId;
    });
  }

  async ngOnInit(): Promise<void> {
    const client = await this.api.hc();
    const observable = client.watchQuery<GetBoardById>({
      query: GetBoardByIdQuery,
      variables: {
        id: this.boardId,
      },
      fetchPolicy: 'cache-and-network',
    });

    observable.subscribe(({data}) => {
      if (!data) {
        return console.log('GetBoardById - no data');
      }
      this.title = data.getBoardById.title;
    });
  }

  onFavoriteClick() {
    // API Call

    this.favorited = !this.favorited;
    this.favorites += this.favorited ? 1 : -1;
  }

  async onDeleteClick() {
    const client = await this.api.hc();

    await client.mutate({
      mutation: DeleteBoardMutation,
      variables: {
        id: this.boardId,
      },
    });

    this.router.navigate(['/myboards']);
  }

  toHex(buf: ArrayBuffer) {
    const hashArray = Array.from(new Uint8Array(buf));
    const hashHex = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  }

  async calculateHash(file: File) {
    const client = await this.api.hc();

    const reader = new FileReader();
    reader.onload = async event => {
      if (!event?.target?.result) {
        return;
      }

      const hashBuf = await crypto.subtle.digest(
        'SHA-256',
        event.target.result as BufferSource
      );
      const hash = this.toHex(hashBuf);

      console.log({hash}, {file});
      const res = await client.mutate({
        mutation: CreateTokenMuation,
        variables: {
          hash,
          size: file.size,
        },
      });

      console.log(res);
    };
    reader.readAsArrayBuffer(file);
  }

  async onFileDropped($event: DragEvent) {
    $event.preventDefault();
    const client = await this.api.hc();

    const files = $event?.dataTransfer?.files;

    if (!files?.length) {
      return false;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i)!;

      // calculate hash
      await this.calculateHash(file);
      // createToken
    }

    return false;
  }

  onDragOver($event: DragEvent) {
    $event.preventDefault();
    return false;
  }
}

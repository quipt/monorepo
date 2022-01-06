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
      fields {
        bucket
        X_Amz_Algorithm
        X_Amz_Credential
        X_Amz_Date
        X_Amz_Security_Token
        Policy
        X_Amz_Signature
      }
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

interface Fields {
  bucket: string;
  X_Amz_Algorithm: string;
  X_Amz_Credential: string;
  X_Amz_Date: string;
  X_Amz_Security_Token: string;
  Policy: string;
  X_Amz_Signature: string;
}

interface CreateToken {
  createToken: {
    key: string;
    fields: Fields;
  };
}

interface Duplicate {
  duplicate: boolean;
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

  async uploadFile(file: File, hash: string, key: string, fields: Fields) {
    const form = new FormData();

    form.append('key', key);
    form.append('acl', 'private');
    form.append('Content-Type', file.type);
    form.append('x-amz-content-sha256', hash);
    form.append('x-amz-credential', fields.X_Amz_Credential);
    form.append('x-amz-algorithm', fields.X_Amz_Algorithm);
    form.append('x-amz-date', fields.X_Amz_Date);
    form.append('policy', fields.Policy);
    form.append('x-amz-signature', fields.X_Amz_Signature);
    form.append('x-amz-security-token', fields.X_Amz_Security_Token);
    form.append('file', file);

    const res = await fetch(`https://${fields.bucket}.s3.amazonaws.com/`, {
      method: 'POST',
      body: form,
    });

    console.log(res);
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
      const res = await client.mutate<CreateToken & Duplicate>({
        mutation: CreateTokenMuation,
        variables: {
          hash,
          size: file.size,
        },
      });

      if (res.data?.duplicate) {
        // TODO: Add it to the UI
        console.log('Duplicate found');
        return;
      }

      await this.uploadFile(
        file,
        hash,
        res.data!.createToken.key,
        res.data!.createToken.fields
      );
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

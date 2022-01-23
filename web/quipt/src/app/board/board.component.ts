import {Component, OnInit} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {AuthService} from '@auth0/auth0-angular';
import {ActivatedRoute, Router} from '@angular/router';
import {ApiService} from '../api.service';

import gql from 'graphql-tag';
import {ConfigService} from '../config.service';

const GetBoardByIdQuery = gql`
  query GetBoardById($id: String!) {
    getBoardById(id: $id) {
      id
      title
      owner
      created
      updated
      favorites
      clips {
        caption
        clipId
      }
    }
  }
`;

const UpdateBoardMutation = gql`
  mutation UpdateBoard($board: UpdateBoardInput!) {
    updateBoard(board: $board) {
      title
    }
  }
`;

const GetFavoriteQuery = gql`
  query getFavorite($boardId: ID!) {
    getFavorite(boardId: $boardId) {
      created
    }
  }
`;

const DeleteBoardMutation = gql`
  mutation DeleteBoardMutation($id: ID!) {
    deleteBoard(id: $id)
  }
`;

const CreateTokenMuation = gql`
  mutation CreateTokenMuation($hash: String!, $size: Int!) {
    createToken(hash: $hash, size: $size) {
      __typename

      ... on Token {
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

      ... on Duplicate {
        duplicate
      }
    }
  }
`;

const CreateClipsMutation = gql`
  mutation CreateClipsMutation($boardId: ID!, $clips: [ClipsInput!]) {
    createClips(boardId: $boardId, clips: $clips) {
      clipId
      caption
    }
  }
`;

const DeleteClipMutation = gql`
  mutation DeleteClipMutation($boardId: ID!, $clipId: ID!) {
    deleteClip(boardId: $boardId, clipId: $clipId)
  }
`;

const UpdateClipMutation = gql`
  mutation UpdateClipMutation($boardId: ID!, $clip: ClipsInput!) {
    updateClip(boardId: $boardId, clip: $clip) {
      caption
    }
  }
`;

const CreateFavoriteMutation = gql`
  mutation CreateFavoriteMutation($boardId: ID!) {
    createFavorite(boardId: $boardId) {
      created
    }
  }
`;

const DeleteFavoriteMutation = gql`
  mutation DeleteFavoriteMutation($boardId: ID!) {
    deleteFavorite(boardId: $boardId) {
      created
    }
  }
`;

export interface Clip {
  clipId: string;
  caption: string;
}

interface Board {
  id: string;
  owner: string;
  title: string;
  favorites: number;
  clips: Clip[];
}

interface GetBoardById {
  getBoardById: Board;
}

interface Favorite {
  created: string;
}

interface GetFavorite {
  getFavorite: Favorite;
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
  createToken: {
    duplicate: string;
  };
}

export interface Video {
  clipId?: string;
  caption: string;
  source: string | SafeUrl;
  poster?: string;
  hash?: string;
}

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
})
export class BoardComponent implements OnInit {
  mediaUri = '';
  username = '';
  title = '';
  clipCount = 0;
  favorites = 0;
  favorited = false;
  canEdit = false;
  boardId = '';
  owner = '';
  clips: Video[] = [];

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private router: Router,
    private config: ConfigService,
    public sanitizer: DomSanitizer,
    public auth: AuthService
  ) {
    this.route.params.subscribe(params => {
      this.boardId = params.boardId;
    });

    this.mediaUri = config.mediaUri;
  }

  play($event: MouseEvent) {
    ($event.target as HTMLVideoElement).play();
  }

  async ngOnInit(): Promise<void> {
    const client = await this.api.hc();
    const observable = client.watchQuery<GetBoardById>({
      query: GetBoardByIdQuery,
      variables: {
        id: this.boardId,
      },
      fetchPolicy: 'network-only',
    });

    observable.subscribe(({data}) => {
      if (!data) {
        return console.log('GetBoardById - no data');
      }

      this.title = data.getBoardById.title;
      this.favorites = data.getBoardById.favorites;
      this.owner = data.getBoardById.owner;
      this.auth.user$.subscribe(
        user => (this.canEdit = this.owner === user?.sub)
      );

      this.clips = data.getBoardById.clips!.map(clip => ({
        ...clip,
        source: `${this.mediaUri}${clip.clipId}.mp4`,
        poster: `${this.mediaUri}${clip.clipId}.png`,
      }));
    });

    const res = await client.query<GetFavorite>({
      query: GetFavoriteQuery,
      variables: {
        boardId: this.boardId,
      },
      fetchPolicy: 'network-only',
    });

    if (res.data.getFavorite) {
      this.favorited = true;
    }
  }

  async onFavoriteClick() {
    // API Call
    const client = await this.api.hc();

    if (this.favorited) {
      await client.mutate({
        mutation: DeleteFavoriteMutation,
        variables: {
          boardId: this.boardId,
        },
      });
    } else {
      await client.mutate({
        mutation: CreateFavoriteMutation,
        variables: {
          boardId: this.boardId,
        },
      });
    }

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

    await fetch(`https://${fields.bucket}.s3.amazonaws.com/`, {
      method: 'POST',
      body: form,
    });
  }

  async getIdOrUpload(file: File, hash: string) {
    const client = await this.api.hc();
    const res = await client.mutate<CreateToken & Duplicate>({
      mutation: CreateTokenMuation,
      variables: {
        hash,
        size: file.size,
      },
    });

    const clipId = res.data!.createToken.duplicate;
    const caption = file.name.replace(/\.[^/.]+$/, '');

    if (clipId) {
      // No duplicates allowed
      if (this.clips.some(clip => clip.clipId === clipId)) {
        return;
      }

      this.clips.push({
        caption,
        clipId,
        source: `${this.mediaUri}${clipId}.mp4`,
        poster: `${this.mediaUri}${clipId}.png`,
        hash,
      });

      await client.mutate({
        mutation: CreateClipsMutation,
        variables: {
          boardId: this.boardId,
          clips: [
            {
              caption,
              clipId,
            },
          ],
        },
      });

      return;
    }

    this.clips.push({
      caption,
      clipId: res.data!.createToken.key,
      source: this.sanitizer.bypassSecurityTrustUrl(
        window.URL.createObjectURL(file)
      ),
      hash,
    });

    await this.uploadFile(
      file,
      hash,
      res.data!.createToken.key,
      res.data!.createToken.fields
    );

    await client.mutate({
      mutation: CreateClipsMutation,
      variables: {
        boardId: this.boardId,
        clips: [
          {
            caption,
            clipId: res.data!.createToken.key,
          },
        ],
      },
    });
  }

  async calculateHash(file: File) {
    const result = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => {
        if (!event?.target?.result) {
          return reject();
        }

        return resolve(event.target.result);
      };
      reader.readAsArrayBuffer(file);
    });

    const hashBuf = await crypto.subtle.digest(
      'SHA-256',
      result as BufferSource
    );

    return this.toHex(hashBuf);
  }

  async onFileDropped($event: DragEvent) {
    $event.preventDefault();

    const files = $event?.dataTransfer?.files;

    if (!files?.length) {
      return false;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i)!;
      const hash = await this.calculateHash(file);

      if (file.size > 0x3200000) {
        // Show toast saying size is above 50 MB
        continue;
      }

      if (this.clips.some(clip => clip.hash === hash)) {
        // Show snackbar message saying duplicate found
        continue;
      }

      await this.getIdOrUpload(file, hash);
    }

    return false;
  }

  onDragOver($event: DragEvent) {
    $event.preventDefault();
    return false;
  }

  async deleteClip(clipId: string) {
    const client = await this.api.hc();
    const index = this.clips.findIndex(clip => clip.clipId === clipId);
    this.clips.splice(index, 1);

    await client.mutate({
      mutation: DeleteClipMutation,
      variables: {
        boardId: this.boardId,
        clipId,
      },
    });
  }

  async captionChanged(clip: Clip) {
    const client = await this.api.hc();

    await client.mutate({
      mutation: UpdateClipMutation,
      variables: {
        boardId: this.boardId,
        clip,
      },
    });
  }

  async titleChanged($event: FocusEvent) {
    console.log($event);

    const client = await this.api.hc();
    const title = ($event.target as HTMLSpanElement).innerText;

    await client.mutate({
      mutation: UpdateBoardMutation,
      variables: {
        board: {
          id: this.boardId,
          title,
        },
      },
    });
  }
}

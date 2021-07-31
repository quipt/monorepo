import { Attribute, HashKey, RangeKey, Table } from '@skypress/nestjs-dynamodb';
import { ClipType } from '../clips/models/clip.model';

@Table('boards')
export class Board {
  @HashKey()
  userId: string;

  @RangeKey()
  id: string;

  @Attribute()
  title: string;

  @Attribute()
  favorites: number;

  @Attribute()
  clips: ClipType[];
}

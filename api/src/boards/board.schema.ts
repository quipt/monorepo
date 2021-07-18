import { Attribute, HashKey, Table } from '@skypress/nestjs-dynamodb';
import { ClipType } from '../clips/models/clip.model';

@Table('users')
export class User {
  @HashKey()
  userId: string;

  @Attribute()
  id: string;

  @Attribute()
  title: string;

  @Attribute()
  favorites: number;

  @Attribute()
  clips: ClipType[];
}

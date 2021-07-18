import { Attribute, HashKey, Table } from '@skypress/nestjs-dynamodb';

@Table('users')
export class User {
  @HashKey()
  id: string;

  @Attribute()
  username: string;

  @Attribute()
  firstname?: string;

  @Attribute()
  lastname?: string;
}

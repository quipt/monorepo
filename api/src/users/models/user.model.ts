import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Board } from '../../boards/models/board.model';
import { Medium } from '../../media/models/medium.model';

@ObjectType()
export class User {
  @Field()
  id: string;

  @Field({ nullable: false })
  username: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field(type => [Board])
  boards: Board[];

  @Field(type => [Medium])
  originals: Medium[];
}
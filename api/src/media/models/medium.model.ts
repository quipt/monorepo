import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';

@ObjectType()
export class Medium {
  @Field()
  id: string;

  @Field()
  format: string;

  @Field((type) => Int)
  width: number;

  @Field((type) => Int)
  height: number;

  @Field()
  sha256: string;

  @Field((type) => User)
  originalUploader: User;
}

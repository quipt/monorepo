import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Medium } from '../../media/models/medium.model';

@ObjectType()
export class ClipType {
  @Field(() => Int)
  media: Medium[];

  @Field()
  caption: string;
}

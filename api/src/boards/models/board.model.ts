import { Field, Int, ObjectType } from '@nestjs/graphql';
import {Clip} from '../../clips/models/clip.model';

@ObjectType()
export class Board {
  @Field()
  userId: string;

  @Field()
  id: string;

  @Field()
  title: string;

  @Field(type => Int)
  favorites: number;

  @Field(type => Boolean)
  favorited: boolean;

  @Field(type => [Clip])
  clips: Clip[];
}
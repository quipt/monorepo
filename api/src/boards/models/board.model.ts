import { Field, Int, ID, ObjectType } from '@nestjs/graphql';
import { toGlobalId } from 'graphql-relay';
import { NodeObjectType, NodeType } from '../../nodes/models/node.model';
import { ClipType } from '../../clips/models/clip.model';

@ObjectType(NodeObjectType.Board, { implements: NodeType })
export class BoardType implements NodeType {
  @Field()
  userId: string;

  @Field()
  id: string;

  @Field()
  title: string;

  @Field(() => Int)
  favorites: number;

  @Field(() => Boolean)
  favorited: boolean;

  @Field(() => [ClipType])
  clips: ClipType[];

  @Field(() => ID, { name: 'id' })
  get relayId(): string {
    return toGlobalId('Order', this.id);
  }
}

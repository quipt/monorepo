import { Field, ID, ObjectType } from '@nestjs/graphql';
import { toGlobalId } from 'graphql-relay';
import { NodeObjectType, NodeType } from '../../nodes/models/node.model';
import { BoardType } from '../../boards/models/board.model';
import { Medium } from '../../media/models/medium.model';

@ObjectType(NodeObjectType.User, { implements: NodeType })
export class UserType implements NodeType {
  @Field(() => ID)
  readonly id!: string;

  @Field({ nullable: false })
  username: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field(() => [BoardType])
  boards: BoardType[];

  @Field(() => [Medium])
  originals: Medium[];

  @Field(() => ID, { name: 'id' })
  get relayId(): string {
    return toGlobalId('User', this.id);
  }
}

@ObjectType('UserPayload')
export class UserPayloadType {
  @Field(() => UserType)
  readonly user!: UserType;
}

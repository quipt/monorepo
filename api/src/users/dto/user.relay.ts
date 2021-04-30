import * as Relay from 'graphql-relay';
import { Field, ObjectType } from '@nestjs/graphql';
import { PageInfo } from 'nestjs-graphql-relay';
import { UserType } from './user.type';

@ObjectType({ isAbstract: true })
abstract class UserEdge implements Relay.Edge<UserType> {
  @Field(() => UserType)
  readonly node!: UserType;

  @Field(() => String)
  readonly cursor!: Relay.ConnectionCursor;
}

@ObjectType()
export class UserConnection implements Relay.Connection<UserType | Error> {
  @Field()
  readonly pageInfo!: PageInfo;

  @Field(() => [UserEdge])
  readonly edges!: Array<Relay.Edge<UserType | Error>>;
}

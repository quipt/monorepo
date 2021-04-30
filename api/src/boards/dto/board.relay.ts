import * as Relay from 'graphql-relay';
import { Field, ObjectType } from '@nestjs/graphql';
import { PageInfo } from 'nestjs-graphql-relay';
import { BoardType } from '../models/board.model';

@ObjectType({ isAbstract: true })
abstract class BoardEdge implements Relay.Edge<BoardType> {
  @Field(() => BoardType)
  readonly node!: BoardType;

  @Field(() => String)
  readonly cursor!: Relay.ConnectionCursor;
}

@ObjectType()
export class BoardConnection implements Relay.Connection<BoardType | Error> {
  @Field()
  readonly pageInfo!: PageInfo;

  @Field(() => [BoardEdge])
  readonly edges!: Array<Relay.Edge<BoardType | Error>>;
}

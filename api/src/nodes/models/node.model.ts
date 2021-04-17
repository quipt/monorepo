import { InterfaceType, Field, ID } from '@nestjs/graphql';

export enum NodeObjectType {
  Board = 'Board',
  User = 'User',
}

@InterfaceType('Node')
export abstract class NodeType {
  @Field(() => ID, { name: 'id' })
  relayId!: string;
}

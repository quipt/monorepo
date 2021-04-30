import { Field, ID, ObjectType } from '@nestjs/graphql';
import { toGlobalId } from 'graphql-relay';
import { plainToClass } from 'class-transformer';
import { InternalServerErrorException } from '@nestjs/common';
import { NodeObjectType, NodeType } from '../../nodes/dto/node.type';
import { UserEntity } from '../../db/entities/user.entity';

@ObjectType(NodeObjectType.User, { implements: NodeType })
export class UserType implements NodeType {
  @Field(() => ID)
  readonly id!: string;

  @Field({ nullable: true })
  readonly firstName?: string;

  @Field({ nullable: true })
  readonly middleName?: string;

  @Field({ nullable: true })
  readonly lastName?: string;

  @Field(() => ID, { name: 'id' })
  get relayId(): string {
    return toGlobalId('User', this.id);
  }

  static fromEntity(entity: UserEntity | Error): UserType {
    if (entity instanceof Error) {
      throw new InternalServerErrorException();
    }
    return plainToClass(UserType, entity);
  }
}

@ObjectType('UserPayload')
export class UserPayloadType {
  @Field(() => UserType)
  readonly user!: UserType;
}

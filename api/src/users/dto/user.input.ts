import {
  ArgsType,
  Field,
  HideField,
  ID,
  InputType,
  PartialType,
  PickType,
} from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ConnectionArgs, OrderByDirection } from 'nestjs-graphql-relay';
import { Type } from 'class-transformer';
import { UserEntity } from '../../db/entities/user.entity';
import { UserType } from './user.type';

@InputType()
export class UserCreateInput {
  @Field()
  @IsString()
  readonly firstName!: string;

  @Field()
  @IsString()
  @IsOptional()
  readonly middleName?: string;

  @Field()
  @IsString()
  readonly lastName!: string;
}

@InputType()
export class UserUpdateInput extends PartialType(
  PickType(UserCreateInput, ['firstName', 'middleName', 'lastName'])
) {
  @Field(() => ID)
  @IsString()
  readonly userId!: string;

  @HideField()
  readonly user!: UserEntity;
}

@InputType()
export class UserWhereInput implements Partial<UserType> {
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  readonly firstName?: UserType['firstName'];
}

@InputType()
export class UserOrderByInput {
  @Field(() => OrderByDirection, { nullable: true })
  @IsEnum(OrderByDirection)
  @IsOptional()
  firstName?: OrderByDirection;

  @Field(() => OrderByDirection, { nullable: true })
  @IsEnum(OrderByDirection)
  @IsOptional()
  lastName?: OrderByDirection;
}

@ArgsType()
export class UserConnectionArgs extends ConnectionArgs {
  @Field(() => UserWhereInput, { nullable: true })
  @Type(() => UserWhereInput)
  @ValidateNested()
  @IsOptional()
  readonly where?: UserWhereInput;

  @Field(() => UserOrderByInput, { nullable: true })
  @Type(() => UserOrderByInput)
  @ValidateNested()
  @IsOptional()
  readonly orderBy?: UserOrderByInput;
}

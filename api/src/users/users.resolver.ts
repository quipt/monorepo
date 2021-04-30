import * as Relay from 'graphql-relay';
import {
  Args,
  Context,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Loader } from 'nestjs-graphql-dataloader';
import { UserPayloadType, UserType } from './models/user.model';
import { UsersService } from './users.service';
import { BoardsService } from '../boards/boards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppContext } from '../app.context';
import { UsersLoader } from './users.loader';
import { UserEntity } from '../db/entities/user.entity';
import { UserConnection } from './dto/user.relay';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  UserConnectionArgs,
  UserCreateInput,
  UserUpdateInput,
} from './dto/user.input';
import { BoardConnection } from '../boards/dto/board.relay';
import { OrderConnectionArgs } from '../orders/dto/order.input';
import { OrdersLoader } from '../orders/orders.loader';
import { OrderEntity } from '../db/entities/order.entity';
import { OrderType } from '../orders/dto/order.type';
import { ParseNodeIdPipe } from '../nodes/pipes/parse-node-id.pipe';
import { NodeObjectType } from '../nodes/models/node.model';

@Resolver(() => UserType)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly boardsService: BoardsService,
  ) {}

  @Query(() => UserType)
  @UseGuards(JwtAuthGuard)
  async viewer(
    @Context('req') ctx: AppContext,
    @Loader(UsersLoader)
    usersLoader: DataLoader<UserEntity['id'], UserEntity>,
  ): Promise<UserType> {
    return usersLoader
      .load(ctx.user.id)
      .then((entity) => UserType.fromEntity(entity));
  }

  // @Query(() => UserConnection)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users:list')
  async users(
    @Context('req') ctx: AppContext,
    @Args() { where, orderBy: order, ...connectionArgs }: UserConnectionArgs,
    @Loader(UsersLoader)
    usersLoader: DataLoader<UserEntity['id'], UserEntity>,
  ): Promise<UserConnection> {
    const results = await this.usersService.findAndPaginate(
      where,
      order,
      connectionArgs,
      { ctx },
    );
    return usersLoader.loadMany(results.ids).then((entities) =>
      Relay.connectionFromArraySlice(
        entities.map((entity) => UserType.fromEntity(entity)),
        connectionArgs,
        {
          arrayLength: results.count,
          sliceStart: results.offset || 0,
        },
      ),
    );
  }

  @ResolveField(() => BoardConnection)
  async boards(
    @Context('req') ctx: AppContext,
    @Parent() parent: UserType,
    @Args()
    { where: _where, orderBy: order, ...connectionArgs }: OrderConnectionArgs,
    @Loader(OrdersLoader)
    ordersLoader: DataLoader<OrderEntity['id'], OrderEntity>,
  ): Promise<BoardConnection> {
    const results = await this.boardsService.findAndPaginate(
      { userId: parent.id },
      order,
      connectionArgs,
      { ctx },
    );
    return ordersLoader.loadMany(results.ids).then((entities) =>
      Relay.connectionFromArraySlice(
        entities.map((entity) => OrderType.fromEntity(entity)),
        connectionArgs,
        {
          arrayLength: results.count,
          sliceStart: results.offset || 0,
        },
      ),
    );
  }

  // @Mutation(() => UserPayloadType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:create')
  async userCreate(
    // @Context('req') ctx: AppContext,
    @Args('input') input: UserCreateInput,
  ): Promise<UserPayloadType> {
    // TODO: Verify ctx.user is creating a user for an organization which they are admin.
    const entity = await this.usersService.create(input);
    return { user: UserType.fromEntity(entity) };
  }

  // @Mutation(() => UserPayloadType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:update')
  async userUpdate(
    @Args('input', ParseNodeIdPipe(NodeObjectType.User, 'userId', 'user'))
    input: UserUpdateInput,
  ): Promise<UserPayloadType> {
    const entity = await this.usersService.update(input.user, input);
    return { user: UserType.fromEntity(entity) };
  }
}

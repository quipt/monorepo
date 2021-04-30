import { NodeObjectType } from './models/node.model';
import { fromGlobalId } from 'graphql-relay';
import { BadRequestException, Injectable } from '@nestjs/common';
import { BoardsService } from '../boards/boards.service';
import { OrderLineItemsService } from '../order-line-items/order-line-items.service';
import { UsersService } from '../users/users.service';
import { AppContext } from '../app.context';
import { OrderEntity } from '../db/entities/order.entity';
import { UserEntity } from '../db/entities/user.entity';

@Injectable()
export class NodesService {
  constructor(
    private readonly taxCodesService: TaxCodesService,
    private readonly boardsService: BoardsService,
    private readonly orderLineItemsService: OrderLineItemsService,
    private readonly usersService: UsersService,
  ) {}

  async findById(
    relayId: string,
    options?: {
      ctx?: AppContext;
      enforcedTypes?: NodeObjectType | NodeObjectType[];
    },
  ): Promise<OrderEntity | OrderLineItemEntity | UserEntity | undefined> {
    const { id, type } = fromGlobalId(relayId);
    const nodeObjectType = NodeObjectType[type as NodeObjectType];
    if (
      options?.enforcedTypes &&
      (Array.isArray(options.enforcedTypes)
        ? !options.enforcedTypes.includes(nodeObjectType)
        : options.enforcedTypes !== nodeObjectType)
    ) {
      throw new BadRequestException();
    }

    switch (type) {
      case NodeObjectType.Board:
        return this.boardsService.findById(userId, id, { ctx: options?.ctx });
      // case NodeObjectType.OrderLineItem:
      // case NodeObjectType.OrderLineItemCannabis:
      // case NodeObjectType.OrderLineItemGeneral:
      //   return this.orderLineItemsService.findById(+id, { ctx: options?.ctx });
      // case NodeObjectType.TaxCode:
      // case NodeObjectType.TaxCodeDistrict:
      // case NodeObjectType.TaxCodeProduct:
      //   return this.taxCodesService.findById(id);
      case NodeObjectType.User:
        return this.usersService.findById(id, { ctx: options?.ctx });
      default:
        return;
    }
  }
}

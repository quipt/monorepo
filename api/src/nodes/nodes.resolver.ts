import { Resolver, Query, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TaxCode } from '@libs/rules';
import { NodeType } from './models/node.model';
import { TaxCodeType } from '../tax-codes/dto/tax-code.type';
import { OrderType } from '../orders/dto/order.type';
import { NodesService } from './nodes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppContext } from '../app.context';
import { OrderEntity } from '../db/entities/order.entity';
import { OrderLineItemEntity } from '../db/entities/order-line-item.entity';
import { UserEntity } from '../db/entities/user.entity';
import { OrderLineItemType } from '../order-line-items/dto/order-line-item.type';
import { UserType } from '../users/dto/user.type';

@Resolver()
export class NodesResolver {
  constructor(private readonly nodesService: NodesService) {}

  @Query(() => NodeType, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async node(
    @Context('req') ctx: AppContext,
    @Args({ name: 'id', type: () => ID }) id: string
  ): Promise<NodeType | undefined> {
    const entity = await this.nodesService.findById(id, { ctx });

    switch (true) {
      case entity instanceof OrderEntity:
        return OrderType.fromEntity(entity as OrderEntity);
      case entity instanceof OrderLineItemEntity:
        return OrderLineItemType.fromEntity(entity as OrderLineItemEntity);
      case entity instanceof TaxCode:
        return TaxCodeType.fromEntity(entity as TaxCode);
      case entity instanceof UserEntity:
        return UserType.fromEntity(entity as UserEntity);
      default:
        return;
    }
  }
}

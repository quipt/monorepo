import {
  ArgumentMetadata,
  forwardRef,
  Inject,
  Injectable,
  PipeTransform,
  Scope,
  Type,
} from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';
import { v4 as uuid } from 'uuid';
import { NodeObjectType } from '../models/node.model';
import { AppContext } from '../../app.context';
import { NodesService } from '../nodes.service';

export function ParseNodeIdPipe(type: NodeObjectType): Type<PipeTransform>;

export function ParseNodeIdPipe(
  type: NodeObjectType,
  source?: string,
  target?: string
): Type<PipeTransform>;

export function ParseNodeIdPipe(
  type: NodeObjectType,
  source?: string,
  target?: string
): Type<PipeTransform> {
  return createParseNodeIdPipe(type, source, target);
}

function createParseNodeIdPipe(
  type: NodeObjectType,
  source: string | undefined,
  target: string | undefined
): Type<PipeTransform> {
  class MixinParseNodeIdPipe implements PipeTransform {
    constructor(
      @Inject(CONTEXT) private context: { req: AppContext },
      @Inject(forwardRef(() => NodesService)) private nodesService: NodesService
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async transform(value: any, _metadata: ArgumentMetadata) {
      const sourceValue = source ? value[source] : value;

      if (!sourceValue) {
        return value;
      }

      const targetValue = await this.nodesService.findById(sourceValue, {
        ctx: this.context.req,
        enforcedTypes: type,
      });

      if (!target) {
        return { id: value, entity: targetValue };
      }

      value[target] = targetValue;
      return value;
    }
  }

  return mixin(MixinParseNodeIdPipe);
}

function mixin<T>(mixinClass: Type<T>) {
  Object.defineProperty(mixinClass, 'name', {
    value: uuid(),
  });
  Injectable({ scope: Scope.REQUEST })(mixinClass);
  return mixinClass;
}

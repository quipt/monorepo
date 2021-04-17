import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticationError } from 'apollo-server-core';

@Injectable()
// In order to use AuthGuard together with GraphQL, you have to extend
// the built-in AuthGuard class and override getRequest() method.
export class ExternalJwtAuthGuard extends AuthGuard('auth0-jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  // tslint:disable-next-line:no-any
  handleRequest(err: any, user: any, _info: any) {
    if (err || !user) {
      throw err || new AuthenticationError('Could not authenticate with token');
    }
    return user;
  }
}

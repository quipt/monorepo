import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticationError } from 'apollo-server-core';
import { Auth0JwtPayload } from '../dto/auth0-jwt-payload.dto';
import { AppConfigService } from '../../config/config.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfigService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
    const user = request.user as Auth0JwtPayload;

    if (!request.user) {
      throw new AuthenticationError(
        'Could not authenticate with token or user does not have permissions',
      );
    }

    if (user.iss === this.config.auth0.issuer) {
      return true;
    }

    const permissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!permissions) {
      return true;
    }

    const scopes = user.scp || [];

    return permissions.every((permission) => scopes.includes(permission));
  }
}

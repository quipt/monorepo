import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { AppConfigService } from '../../config/config.service';
import { passportJwtSecret } from 'jwks-rsa';
import { Auth0JwtPayload } from '../dto/auth0-jwt-payload.dto';

@Injectable()
export class Auth0JwtStrategy extends PassportStrategy(Strategy, 'auth0-jwt') {
  constructor(configService: AppConfigService) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${configService.auth0.issuer}.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: configService.auth0.audience,
      issuer: configService.auth0.issuer,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: Auth0JwtPayload) {
    return payload;
  }
}

import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigService } from '../config/config.service';
import { Auth0JwtStrategy } from './strategies/auth0-jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      imports: [],
      inject: [AppConfigService],
    }),
  ],
  providers: [Auth0JwtStrategy],
  exports: [],
})
export class AuthModule {}

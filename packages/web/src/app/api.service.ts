import {Injectable} from '@angular/core';
import {ConfigService} from './config.service';
import AWSAppSyncClient, {AUTH_TYPE} from 'aws-appsync';
import {NormalizedCacheObject} from 'apollo-cache-inmemory';
import {AuthService} from '@auth0/auth0-angular';
import {lastValueFrom} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  _hc: AWSAppSyncClient<NormalizedCacheObject>;

  constructor(authService: AuthService, configService: ConfigService) {
    const client = new AWSAppSyncClient({
      url: configService.aws_mobile.aws_appsync_graphqlEndpoint,
      region: configService.aws_mobile.aws_appsync_region,
      auth: {
        type: AUTH_TYPE.OPENID_CONNECT,
        jwtToken: async () =>
          await lastValueFrom(authService.getAccessTokenSilently()),
      },
    });

    this._hc = client;
  }
  hc() {
    return this._hc.hydrated();
  }
}

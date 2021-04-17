import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Auth0Config {
  issuer: string;
  audience: string;
}

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get auth0(): Auth0Config {
    return {
      issuer: this.configService.get<string>(
        'AUTH0_ISSUER',
        'https://quipt.us.auth0.com/'
      ),
      audience: this.configService.get<string>(
        'AUTH0_AUDIENCE',
        'http://localhost:3000/'
      ),
    };
  }

  get environmentName(): string {
    return this.configService.get<string>('ENVIRONMENT_NAME', 'development');
  }

  get localstackEndpoint(): string {
    return this.configService.get<string>(
      'LOCALSTACK_ENDPOINT',
      'http://localhost:4566'
    );
  }

  get awsClientOptions() {
    return this.environmentName === 'development'
      ? {
          region: 'us-east-1',
          endpoint: this.localstackEndpoint,
        }
      : {};
  }
}

import {Injectable} from '@angular/core';
import {HttpClient, HttpBackend} from '@angular/common/http';
import {AuthClientConfig} from '@auth0/auth0-angular';

interface AwsMobile {
  aws_appsync_graphqlEndpoint: string;
  aws_appsync_region: string;
  aws_appsync_authenticationType: string;
}

interface Config {
  apiUri: string;
  mediaUri: string;
  auth0: {
    domain: string;
    clientId: string;
    audience: string;
  };
  theme: string;
  brand: string;
  awsmobile: AwsMobile;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private config!: Config;
  private http: HttpClient;
  private authClientConfig: AuthClientConfig;

  constructor(httpBackend: HttpBackend, authClientConfig: AuthClientConfig) {
    this.http = new HttpClient(httpBackend);
    this.authClientConfig = authClientConfig;
  }

  private configureAuth0(): void {
    this.authClientConfig.set({
      ...this.config.auth0,
      httpInterceptor: {
        allowedList: [this.apiUri],
      },
    });
  }

  public async load(): Promise<void> {
    this.config = await this.http
      .get<Config>('/assets/config.json')
      .toPromise();

    this.configureAuth0();
  }

  public get apiUri(): string {
    return this.config.apiUri;
  }

  public get theme(): string {
    return this.config.theme;
  }

  public get brand(): string {
    return this.config.brand;
  }

  public get aws_mobile(): AwsMobile {
    return this.config.awsmobile;
  }

  public get mediaUri(): string {
    return this.config.mediaUri;
  }
}

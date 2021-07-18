import {Injectable} from '@angular/core';
import {HttpClient, HttpBackend} from '@angular/common/http';
import {AuthClientConfig} from '@auth0/auth0-angular';

interface Config {
  apiUri: string;
  auth0: {
    domain: string;
    clientId: string;
    audience: string;
  };
  theme: string;
  brand: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private config!: Config;
  private http: HttpClient;
  private authClientConfig: AuthClientConfig;

  constructor(httpBackend: HttpBackend, authClientConfig: AuthClientConfig) {
    console.log('test');
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
}

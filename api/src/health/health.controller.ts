import {
  DiskHealthIndicator,
  HttpHealthIndicator,
  HealthCheck,
  HealthCheckService,
} from '@nestjs/terminus';
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly disk: DiskHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  async healthCheck() {
    return this.health.check([
      async () =>
        this.http.pingCheck(
          'graphql',
          'http://localhost:3000/.well-known/apollo/server-health'
        ),
      async () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.75,
        }),
    ]);
  }
}

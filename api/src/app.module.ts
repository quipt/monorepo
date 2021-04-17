import { BoardsModule } from './boards/boards.module';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { DataLoaderInterceptor } from 'nestjs-graphql-dataloader';
import { NodesModule } from './nodes/nodes.module';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';


@Module({
  imports: [
    BoardsModule,
    GraphQLModule.forRoot({
      installSubscriptionHandlers: true,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
    }),
    AppConfigModule,
    AuthModule,
    HealthModule,
    NodesModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: DataLoaderInterceptor,
    },
  ],
})
export class AppModule { }
import { forwardRef, Module } from '@nestjs/common';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import { BoardsModule } from '../boards/boards.module';
import { UsersLoader } from './users.loader';

@Module({
  imports: []
    forwardRef(() => BoardsModule),
  ],
  providers: [UsersResolver, UsersService, UsersLoader],
  exports: [UsersLoader, UsersService],
})
export class UsersModule {}

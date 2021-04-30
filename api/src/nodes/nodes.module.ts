import { forwardRef, Global, Module } from '@nestjs/common';
import { NodesResolver } from './nodes.resolver';
import { BoardsModule } from '../boards/boards.module';
import { UsersModule } from '../users/users.module';
import { NodesService } from './nodes.service';

@Global()
@Module({
  imports: [forwardRef(() => BoardsModule), forwardRef(() => UsersModule)],
  providers: [NodesService, NodesResolver],
  exports: [NodesService],
})
export class NodesModule {}

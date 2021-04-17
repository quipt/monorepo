import { UserEntity } from './db/entities/user.entity';

export interface AppContext {
  user: UserEntity;
}

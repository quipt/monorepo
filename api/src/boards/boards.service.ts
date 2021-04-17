import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConnectionArgs, getPagingParameters } from 'nestjs-graphql-relay';
import { AppContext } from '../app.context';
import { AppConfigService } from '../config/config.service';

import { DynamoDB } from '@aws-sdk/client-dynamodb';

export interface FindAndPaginateOutput<T> {
  ids: T[];
  count: number;
  offset: number | undefined;
}

@Injectable()
export class BoardsService {
  dynamodb: DynamoDB;

  constructor(
    private configService: AppConfigService
  ) {
    this.dynamodb = new DynamoDB(this.configService.awsClientOptions);
  }

  async findById(
    userId: string,
    id: string,
    options?: { ctx?: AppContext }
  ): Promise<UserEntity> {


    this.dynamodb.getItem({
      TableName: 'boards',
      
    });
    return 
  }

  async findByIds(
    ids: number[],
    options?: { ctx?: AppContext }
  ): Promise<UserEntity[]> {
    return this.usersRepository.findByIds(
      ids,
      this.repositoryOptions(options?.ctx)
    );
  }

  async findAndPaginate(
    where: FindManyOptions<UserEntity>['where'],
    order: FindManyOptions<UserEntity>['order'],
    connectionArgs: ConnectionArgs,
    options?: { ctx?: AppContext }
  ): Promise<FindAndPaginateOutput<UserEntity['id']>> {
    const { limit, offset } = getPagingParameters(connectionArgs);
    const repositoryOptions = this.repositoryOptions(options?.ctx);
    const [entities, count] = await this.usersRepository.findAndCount({
      select: ['id'],
      where: (qb: SelectQueryBuilder<UserEntity>) => {
        if (where) {
          FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, {
            where,
          });
        }
        if (repositoryOptions?.where) {
          FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, {
            where: repositoryOptions.where,
          });
        }
      },
      order,
      skip: offset,
      take: limit,
    });
    return { ids: entities.map((entity) => entity.id), count, offset };
  }

  @Transactional()
  async create(_input: UserCreateInput): Promise<UserEntity> {
    throw new NotImplementedException('TODO');
  }

  @Transactional()
  async update(
    _user: UserEntity,
    _input: Omit<UserUpdateInput, 'userId'>
  ): Promise<UserEntity> {
    throw new NotImplementedException('TODO');
  }

  /**
   * Returns if the user has 'admin' set on the permissions array
   *
   * @param {UserEntity} user
   * @returns {boolean}
   * @memberof UsersService
   */
  isAdmin(user: UserEntity): boolean {
    return user.permissions.includes('admin');
  }

  async checkPassword(user: UserEntity, password: string): Promise<boolean> {
    const entity = await this.usersRepository.findOneOrFail(user.id, {
      select: ['password'],
    });
    return bcrypt.compare(password, entity.password!);
  }

  private repositoryOptions(ctx?: AppContext): FindOneOptions<UserEntity> {
    const options: FindOneOptions<UserEntity> = {};

    if (ctx && !this.isAdmin(ctx.user)) {
      options['where'] = { id: ctx.user.id };
    }

    return options;
  }
}

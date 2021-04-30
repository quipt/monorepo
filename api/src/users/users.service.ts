import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';

export interface FindAndPaginateOutput<T> {
  ids: T[];
  count: number;
  offset: number | undefined;
}

@Injectable()
export class UsersService {
  dynamodb: DynamoDB;

  constructor(private configService: AppConfigService) {
    this.dynamodb = new DynamoDB(this.configService.awsClientOptions);
  }

  async findById(id: string) {
    const data = await this.dynamodb.getItem({
      TableName: 'users',
      Key: {
        id: { S: id },
      },
    });

    return data.Item?.id.S;
  }

  async findByIds(ids: string[]) {
    const data = await this.dynamodb.batchGetItem({
      RequestItems: {
        users: {
          Keys: ids.map((id) => ({ id: { S: id } })),
        },
      },
    });

    return data.Responses.users.map((user) => user.id.S);
  }
}

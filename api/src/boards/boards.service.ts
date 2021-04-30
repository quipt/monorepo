import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

@Injectable()
export class BoardsService {
  dynamodb: DynamoDB;

  constructor(private configService: AppConfigService) {
    this.dynamodb = new DynamoDB(this.configService.awsClientOptions);
  }

  async findById(userId: string, id: string) {
    const data = await this.dynamodb.getItem({
      TableName: 'boards',
      Key: {
        userId: { S: userId },
        id: { S: id },
      },
    });

    return data.Item;
  }
}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../config/config.service';
import { LocalJwtPayload } from './dto/local-jwt-payload.dto';
import * as uuid from 'uuid';
import DynamoDB from 'aws-sdk/clients/dynamodb';
import { AuthenticationError } from 'apollo-server-core';
import { Auth0JwtPayload } from './dto/auth0-jwt-payload.dto';
import { PersonalAccessTokenPayloadType } from './dto/auth.type';
import { OrderPermissions } from '../orders/orders.resolver';
import { OrderLineItemPermissions } from '../order-line-items/order-line-items.resolver';

@Injectable()
export class AuthService {
  dynamodb: DynamoDB;

  constructor(
    private jwtService: JwtService,
    private configService: AppConfigService,
  ) {
    this.dynamodb = new DynamoDB(options);
  }

  private getTimeInSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  async personalAccessTokenCreate(user: Auth0JwtPayload, scopes: string[]) {
    const valid = scopes.every((scope) =>
      this.personalAccessTokenScopes.includes(scope),
    );

    if (!valid) {
      throw new Error('Invalid scope');
    }

    const payload = {
      sub: user.sub,
      iss: this.configService.jwtIssuer,
      jti: uuid.v4(),
      iat: this.getTimeInSeconds(),
      token_use: 'access',
      scp: scopes,
    };

    await this.dynamodb
      .putItem({
        TableName: this.configService.dynamodbTokensTable,
        Item: {
          sub: { S: payload.sub },
          jti: { S: payload.jti },
          iat: { N: `${payload.iat}` },
          scp: { L: scopes.map((scope) => ({ S: scope })) },
        },
      })
      .promise();

    return this.jwtService.sign(payload);
  }

  async checkIfAccessTokenIsRevoked(payload: LocalJwtPayload) {
    try {
      await this.dynamodb
        .updateItem({
          TableName: this.configService.dynamodbTokensTable,
          Key: {
            sub: { S: payload.sub },
            jti: { S: payload.jti },
          },
          ExpressionAttributeNames: {
            '#S': 'sub',
            '#J': 'jti',
            '#R': 'revoked',
            '#LS': 'lastSeen',
          },
          ExpressionAttributeValues: {
            ':ls': { N: `${this.getTimeInSeconds()}` },
          },
          ConditionExpression:
            'attribute_exists(#S) and attribute_exists(#J) and attribute_not_exists(#R)',
          UpdateExpression: 'set #LS = :ls',
          ReturnValues: 'ALL_NEW',
        })
        .promise();
    } catch (err) {
      throw new AuthenticationError(
        `The access token ${payload.jti} has been revoked`,
      );
    }
  }

  async revokePersonalAccessToken(sub: string, jti: string) {
    await this.dynamodb
      .updateItem({
        TableName: this.configService.dynamodbTokensTable,
        Key: {
          sub: { S: sub },
          jti: { S: jti },
        },
        ExpressionAttributeNames: {
          '#S': 'sub',
          '#J': 'jti',
          '#R': 'revoked',
        },
        ExpressionAttributeValues: {
          ':r': { BOOL: true },
        },
        ConditionExpression: 'attribute_exists(#S) and attribute_exists(#J)',
        UpdateExpression: 'SET #R = :r',
      })
      .promise();

    return {
      jti,
      revoked: true,
    };
  }

  async listPersonalAccessTokens(
    sub: string,
    includeRevoked = false,
  ): Promise<PersonalAccessTokenPayloadType[]> {
    const result = await this.dynamodb
      .query({
        TableName: this.configService.dynamodbTokensTable,
        ExpressionAttributeNames: {
          '#S': 'sub',
        },
        ExpressionAttributeValues: {
          ':s': { S: sub },
        },
        KeyConditionExpression: '#S = :s',
        FilterExpression: includeRevoked
          ? undefined
          : 'attribute_not_exists(revoked)',
      })
      .promise();

    return result?.Items
      ? result.Items.map(
          (item) =>
            DynamoDB.Converter.unmarshall(
              item,
            ) as PersonalAccessTokenPayloadType,
        )
      : [];
  }

  get personalAccessTokenScopes() {
    return [OrderPermissions, OrderLineItemPermissions].reduce(
      (acc, val) => [...acc, ...Object.values(val)],
      [] as string[],
    );
  }
}

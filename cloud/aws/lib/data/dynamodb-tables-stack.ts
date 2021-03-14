import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export interface StackProps extends cdk.NestedStackProps {
  replicationRegions: string[];
  isProduction: boolean;
}

export class DynamoDBTablesStack extends cdk.NestedStack {
  constructor(scope: cdk.Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const commonTableProps: Pick<
      dynamodb.TableProps,
      'billingMode' | 'encryption' | 'removalPolicy' | 'replicationRegions'
    > = {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      replicationRegions: props.replicationRegions.length
        ? props.replicationRegions
        : undefined,
    };

    /**
     * Users
     */
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      ...commonTableProps,
      tableName: 'users',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
    });

    /**
     * Stores media/video
     */
    const mediaTable = new dynamodb.Table(this, 'MediaTable', {
      ...commonTableProps,
      tableName: 'media',
      partitionKey: {
        name: 'user',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
    });

    /**
     * Hashes of media
     */
    const hashesTable = new dynamodb.Table(this, 'HashesTable', {
      ...commonTableProps,
      tableName: 'hashes',
      partitionKey: {
        name: 'hash',
        type: dynamodb.AttributeType.BINARY,
      },
    });

    /**
     * Boards
     */
    const boardsTable = new dynamodb.Table(this, 'BoardsTable', {
      ...commonTableProps,
      tableName: 'boards',
      partitionKey: {
        name: 'user',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
    });
  }
}

import { DynamoDB, AWSError } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import {
  DescribeTableOutput,
  CreateTableInput,
  DocumentClient,
  PutItemInput,
  PutItemOutput,
  DeleteTableOutput,
  PutItemInputAttributeMap,
} from 'aws-sdk/clients/dynamodb';

interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export async function getDbInstace(credentials: Credentials | undefined): Promise<DynamoDB> {
  return new DynamoDB(credentials);
}

export async function createTable(
  tableName: string,
  dynamoDb: DynamoDB,
): Promise<PromiseResult<DescribeTableOutput, AWSError>> {
  const params: CreateTableInput = {
    AttributeDefinitions: [
      {
        AttributeName: 'name',
        AttributeType: 'S',
      },
    ],
    KeySchema: [
      {
        AttributeName: 'name',
        KeyType: 'HASH',
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
    TableName: tableName,
  };

  await dynamoDb.createTable(params).promise();

  return dynamoDb
    .waitFor('tableExists', {
      TableName: tableName,
    })
    .promise();
}

export async function deleteTable(
  tableName: string,
  dynamoDb: DynamoDB,
): Promise<PromiseResult<DeleteTableOutput, AWSError>> {
  return await dynamoDb.deleteTable({ TableName: tableName }).promise();
}

export async function insertData(
  tableName: string,
  data: PutItemInputAttributeMap,
  client: DocumentClient,
): Promise<PromiseResult<PutItemOutput, AWSError>> {
  const params: PutItemInput = {
    TableName: tableName,
    Item: data,
  };

  return await client.put(params).promise();
}

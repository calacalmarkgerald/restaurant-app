/*
  Environment variables:
  - `LOYALTY_INTEG_ROLE` (optional): Arn for an existing role that will be assumed in integration tests
  - `LOYALTY_INTEG_EXTERNAL_ID (optional): A unique identifier that might be required when you assume a role in another account
  - `DYNAMODB_TABLE` (optional): Provide the name of an existing DynamoDB table to speed up the tests
  - `QUERY_TIMEOUT` (optional): A timeout in milliseconds between writing data to the table and running a query, because of eventual consitency of queries on global secondary indexes
*/

import { v4 as uuid } from 'uuid';
import DynamoDB, { DocumentClient, PutItemInputAttributeMap } from 'aws-sdk/clients/dynamodb';
import { getCredentials } from './helpers/credentials-helper';
import { getDbInstace, createTable, deleteTable, insertData } from './helpers/dynamodb-helper';
import { wait } from './helpers/timeout-helper';

import { getRestaurants } from '../src/get-restaurants';

const tableName = process.env.DYNAMODB_TABLE ? process.env.DYNAMODB_TABLE : `restaurants-${uuid()}`;
const queryTimeout: number = process.env.QUERY_TIMEOUT ? parseInt(process.env.QUERY_TIMEOUT, 10) : 200;

let dynamoDb: DynamoDB, documentClient: DocumentClient;

describe('restaurant app integration', () => {
  beforeAll(async () => {
    let credentials;
    if (process.env.LOYALTY_INTEG_ROLE !== undefined) {
      credentials = await getCredentials(process.env.LOYALTY_INTEG_ROLE, process.env.LOYALTY_INTEG_EXTERNAL_ID);
    }

    dynamoDb = await getDbInstace(credentials);
    documentClient = new DocumentClient(credentials);
    if (!process.env.DYNAMODB_TABLE) {
      return await createTable(tableName, dynamoDb);
    }

    return Promise.resolve();
  }, 90000); // Increase the timeout for `beforeAll` to 90s, because creating table takes time

  afterAll(async () => {
    if (!process.env.DYNAMODB_TABLE) {
      return await deleteTable(tableName, dynamoDb);
    }
  }, 90000); // Increase the timeout for `afterAll` to 90s, because deleting table takes time

  describe('get-restaurants', () => {
    test('should return an array of 3 restaurants', async () => {
      const restaurants = [
        {
          name: 'Fangtasia',
          image: 'https://d2qt42rcwzspd6.cloudfront.net/manning/fangtasia.png',
          themes: ['true blood'],
        },
        {
          name: "Shoney's",
          image: "https://d2qt42rcwzspd6.cloudfront.net/manning/shoney's.png",
          themes: ['cartoon', 'rick and morty'],
        },
        {
          name: "Freddy's BBQ Joint",
          image: "https://d2qt42rcwzspd6.cloudfront.net/manning/freddy's+bbq+joint.png",
          themes: ['netflix', 'house of cards'],
        },
      ];

      await Promise.all(
        restaurants.map((data) => insertData(tableName, data as PutItemInputAttributeMap, documentClient)),
      );

      await wait(queryTimeout);

      const data = await getRestaurants(3, documentClient, tableName);

      expect(data).toBeInstanceOf(Array);
      expect(data.length).toEqual(3);
      expect(data).toStrictEqual(restaurants);
    });
  });
});

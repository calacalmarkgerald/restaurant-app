/*
  Environment variables:
  - `LOYALTY_INTEG_ROLE` (optional): Arn for an existing role that will be assumed in integration tests
  - `LOYALTY_INTEG_EXTERNAL_ID (optional): A unique identifier that might be required when you assume a role in another account
  - `DYNAMODB_TABLE` (optional): Provide the name of an existing DynamoDB table to speed up the tests
  - `KINESIS_ORDER_STREAM` (optional): Provide the name of an existing Kinesis stream to speed up the tests
  - `QUERY_TIMEOUT` (optional): A timeout in milliseconds between writing data to the table and running a query, because of eventual consitency of queries on global secondary indexes
*/

import { v4 as uuid } from 'uuid';
import DynamoDB, { DocumentClient, PutItemInputAttributeMap } from 'aws-sdk/clients/dynamodb';
import { getCredentials } from './helpers/credentials-helper';
import { getDbInstace, createTable, deleteTable, insertData } from './helpers/dynamodb-helper';
import {
  createKinesisStream,
  deleteKinesisStream,
  getRecordsFromStream,
  getKinesisInstance,
  getKinesisShardIterator,
} from './helpers/kinesis-helper';
import { wait } from './helpers/timeout-helper';

import { getRestaurants } from '../src/get-restaurants';
import { findRestaurantsbyTheme } from '../src/search-restaurants';
import { Order, placeOrder, UnauthorizedError } from '../src/place-order';
import { Kinesis } from 'aws-sdk';

const tableName = process.env.DYNAMODB_TABLE ? process.env.DYNAMODB_TABLE : `restaurants-${uuid()}`;
const orderStreamName = process.env.KINESIS_ORDER_STREAM ? process.env.KINESIS_ORDER_STREAM : `order-stream-${uuid()}`;
const queryTimeout: number = process.env.QUERY_TIMEOUT ? parseInt(process.env.QUERY_TIMEOUT, 10) : 200;

let dynamoDb: DynamoDB, documentClient: DocumentClient;
let kinesis: Kinesis;

describe('restaurant app integration', () => {
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

  beforeAll(async () => {
    let credentials;
    if (process.env.LOYALTY_INTEG_ROLE !== undefined) {
      credentials = await getCredentials(process.env.LOYALTY_INTEG_ROLE, process.env.LOYALTY_INTEG_EXTERNAL_ID);
    }

    dynamoDb = await getDbInstace(credentials);
    documentClient = new DocumentClient(credentials);
    if (!process.env.DYNAMODB_TABLE) {
      await createTable(tableName, dynamoDb);
    }

    kinesis = await getKinesisInstance(credentials);
    if (!process.env.KINESIS_ORDER_STREAM) {
      await createKinesisStream(orderStreamName, 1, kinesis);
    }

    await Promise.all(
      restaurants.map((data) => insertData(tableName, data as PutItemInputAttributeMap, documentClient)),
    );

    await wait(queryTimeout); //This is to give time for GSI to be updated with eventual consistency
    return Promise.resolve();
  }, 90000); // Increase the timeout for `beforeAll` to 90s, because creating table takes time

  afterAll(async () => {
    if (!process.env.DYNAMODB_TABLE) {
      return await deleteTable(tableName, dynamoDb);
    }

    if (!process.env.KINESIS_ORDER_STREAM) {
      await deleteKinesisStream(orderStreamName, kinesis);
    }
  }, 90000); // Increase the timeout for `afterAll` to 90s, because deleting table takes time

  describe('get-restaurants', () => {
    test('should return an array of 3 restaurants', async () => {
      const data = await getRestaurants(3, documentClient, tableName);

      expect(data).toBeInstanceOf(Array);
      expect(data.length).toEqual(3);
      expect(data).toStrictEqual(restaurants);
    });
  });

  describe('search-restaurants', () => {
    test('should return an array of 1 retaurant that have a cartoon theme', async () => {
      const data = await findRestaurantsbyTheme(3, 'cartoon', documentClient, tableName);

      expect(data).toBeInstanceOf(Array);
      expect(data.length).toEqual(1);
      expect(data[0].themes).toContain('cartoon');
      expect(data).toStrictEqual(restaurants.filter((restaurant) => restaurant.themes.includes('cartoon')));
    });
  });

  describe('place-order', () => {
    test('should publish order data to kinesis streamm', async () => {
      const order: Order = {
        orderId: uuid(),
        restaurantName: 'Mang Inasal',
        userEmail: 'juandelacruz@gmail.com',
      };

      const orderStreamData = await placeOrder(order, kinesis, orderStreamName);

      const iterator = await getKinesisShardIterator(
        orderStreamName,
        orderStreamData.shardId,
        orderStreamData.sequenceNumber,
        kinesis,
      );

      const records = await getRecordsFromStream(iterator.ShardIterator!, kinesis);
      const orderData = JSON.parse(records.Records[0].Data.toString());
      expect(orderData).toStrictEqual({ ...order, eventType: 'order_placed' });
    });

    test('should throw unauthorized error when user email is empty', async () => {
      const order: Order = {
        orderId: uuid(),
        restaurantName: 'Mang Inasal',
        userEmail: '',
      };

      expect(placeOrder(order, kinesis, orderStreamName)).rejects.toThrow(UnauthorizedError);
    });
  });
});

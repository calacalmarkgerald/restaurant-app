import * as AWSMock from 'aws-sdk-mock';
import * as AWS from 'aws-sdk';

import { findRestaurantsbyTheme } from '../src/search-restaurants';
import { ScanInput } from 'aws-sdk/clients/dynamodb';

describe('Search Restaurants Function tests', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    AWSMock.restore();
  });

  test('should return items that have the theme : "cartoon"', async () => {
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params: ScanInput, callback: Function) => {
      callback(null, {
        Items: [
          {
            name: "Shoney's",
            image: "https://d2qt42rcwzspd6.cloudfront.net/manning/shoney's.png",
            themes: ['cartoon', 'rick and morty'],
          },
        ],
      });
    });

    const client = new AWS.DynamoDB.DocumentClient();
    const data = await findRestaurantsbyTheme(3, 'cartoon', client, 'restaurant-table');

    expect(data).toBeInstanceOf(Array);
    expect(data.length).toEqual(1);
    expect(data[0].themes).toContain('cartoon');
    expect(data).toStrictEqual([
      {
        name: "Shoney's",
        image: "https://d2qt42rcwzspd6.cloudfront.net/manning/shoney's.png",
        themes: ['cartoon', 'rick and morty'],
      },
    ]);
  });
});

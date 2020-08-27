import * as AWSMock from 'aws-sdk-mock';
import * as AWS from 'aws-sdk';

import { getRestaurants } from '../src/get-restaurants';
import { QueryInput } from 'aws-sdk/clients/dynamodb';

describe('Get Restaurants Function tests', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('should return an array of 3 restaurants', async () => {
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params: QueryInput, callback: Function) => {
      callback(null, {
        Items: [
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
        ],
      });
    });

    const client = new AWS.DynamoDB.DocumentClient();
    const data = await getRestaurants(3, client, 'restaurant-calacalm');

    expect(data).toBeInstanceOf(Array);
    expect(data.length).toEqual(3);
    expect(data).toStrictEqual([
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
    ]);
  });
});

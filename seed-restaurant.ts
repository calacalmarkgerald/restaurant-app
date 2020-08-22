/* eslint-disable no-console */
import { config, DynamoDB } from 'aws-sdk';
import {
  BatchWriteItemInput,
  WriteRequests,
  PutItemInputAttributeMap,
  WriteRequest,
  PutRequest,
} from 'aws-sdk/clients/dynamodb';

config.region = 'ap-southeast-1';
const client: DynamoDB.DocumentClient = new DynamoDB.DocumentClient();

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
  {
    name: 'Pizza Planet',
    image: 'https://d2qt42rcwzspd6.cloudfront.net/manning/pizza+planet.png',
    themes: ['netflix', 'toy story'],
  },
  {
    name: 'Leaky Cauldron',
    image: 'https://d2qt42rcwzspd6.cloudfront.net/manning/leaky+cauldron.png',
    themes: ['movie', 'harry potter'],
  },
  {
    name: "Lil' Bits",
    image: 'https://d2qt42rcwzspd6.cloudfront.net/manning/lil+bits.png',
    themes: ['cartoon', 'rick and morty'],
  },
  {
    name: 'Fancy Eats',
    image: 'https://d2qt42rcwzspd6.cloudfront.net/manning/fancy+eats.png',
    themes: ['cartoon', 'rick and morty'],
  },
  {
    name: 'Don Cuco',
    image: 'https://d2qt42rcwzspd6.cloudfront.net/manning/don%20cuco.png',
    themes: ['cartoon', 'rick and morty'],
  },
];

const putReqs: WriteRequests = restaurants.map((x) => {
  return {
    PutRequest: {
      Item: x as PutItemInputAttributeMap,
    } as PutRequest,
  } as WriteRequest;
});

const req: BatchWriteItemInput = {
  RequestItems: {
    'restaurants-calacalm': putReqs,
  },
};

client
  .batchWrite(req)
  .promise()
  .then(() => console.log('all done'))
  .catch((error) => console.error(error));

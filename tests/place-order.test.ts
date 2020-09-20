import * as AWSMock from 'aws-sdk-mock';
import * as AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';

import { Order, placeOrder, UnauthorizedError } from '../src/place-order';
import { PutRecordInput, PutRecordOutput } from 'aws-sdk/clients/kinesis';

describe('Place Order Function tests', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    AWSMock.restore();
  });

  test('should publish order data to kinesis stream', async () => {
    AWSMock.mock('Kinesis', 'putRecord', (params: PutRecordInput, callback: Function) => {
      const putRecordOutput: PutRecordOutput = {
        ShardId: 'shardId-000000000001',
        SequenceNumber: '21269319989653637946712965403778482177',
        EncryptionType: 'NONE',
      };
      callback(null, putRecordOutput);
    });

    const order: Order = {
      orderId: uuid(),
      restaurantName: 'Mang Inasal',
      userEmail: 'juandelacruz@gmail.com',
    };

    const kinesis = new AWS.Kinesis();
    const data = await placeOrder(order, kinesis, 'order-stream');

    expect(data.shardId).toEqual('shardId-000000000001');
    expect(data.sequenceNumber).toEqual('21269319989653637946712965403778482177');
  });

  test('should throw unauthorized error when user email is empty', () => {
    AWSMock.mock('Kinesis', 'putRecord', (params: PutRecordInput, callback: Function) => {
      const putRecordOutput: PutRecordOutput = {
        ShardId: 'shardId-000000000001',
        SequenceNumber: '21269319989653637946712965403778482177',
        EncryptionType: 'NONE',
      };
      callback(null, putRecordOutput);
    });

    const order: Order = {
      orderId: uuid(),
      restaurantName: 'Mang Inasal',
      userEmail: '',
    };
    const kinesis = new AWS.Kinesis();

    expect(placeOrder(order, kinesis, 'order-stream')).rejects.toThrow(UnauthorizedError);
  });

  test('should throw error when AWS kinesis.putRecord fails', () => {
    AWSMock.mock('Kinesis', 'putRecord', (params: PutRecordInput, callback: Function) => {
      const error: AWS.AWSError = {
        code: '1001',
        message: 'Kinesis is unable to put the record in the stream.',
        retryable: true,
        statusCode: 500,
        time: new Date(),
        hostname: 'hostname',
        region: 'ap-southeast-1',
        retryDelay: 300,
        cfId: uuid(),
        extendedRequestId: uuid(),
        name: 'KinesisPutRecordError',
        requestId: uuid(),
        stack: 'error stack traces...',
      };
      callback(error, null);
    });

    const order: Order = {
      orderId: uuid(),
      restaurantName: 'Mang Inasal',
      userEmail: 'juandelacruz@gmail.com',
    };
    const kinesis = new AWS.Kinesis();

    expect(placeOrder(order, kinesis, 'order-stream')).rejects.toThrow('Unable to put record into kinesis stream');
  });
});

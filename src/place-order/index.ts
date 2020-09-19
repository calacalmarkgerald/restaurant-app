import { v4 as uuid } from 'uuid';
import Kinesis, { PutRecordInput } from 'aws-sdk/clients/kinesis';
import { APIGatewayProxyResult, APIGatewayEvent, Context } from 'aws-lambda';

const kinesis = new Kinesis();
const streamName: string = process.env.order_events_stream!;

/**
 * Order data interface
 */
export interface Order {
  orderId: string;
  userEmail: string;
  restaurantName: string;
}

/**
 * Custom error for unauthorized exception
 */
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Put the order data into a kinesis stream for deferred/queued processing
 * @param {Order} order
 * @param {Kinesis} kinesis
 * @param {string} streamName
 */
export const placeOrder = async (order: Order, kinesis: Kinesis, streamName: string): Promise<string> => {
  if (!order.userEmail) {
    throw new UnauthorizedError('No user email was provided.');
  }

  const params: PutRecordInput = {
    Data: JSON.stringify({ ...order, eventType: 'order_placed' }),
    PartitionKey: order.orderId,
    StreamName: streamName,
  };

  try {
    const data = await kinesis.putRecord(params).promise();
    console.log(`published 'order_placed' event into Kinesis`);

    return data.SequenceNumber;
  } catch (error) {
    console.error(error);
    throw new Error('Unable to put record into kinesis stream');
  }
};

/**
 * Lambda function handler that takes a HTTP event from API GW
 *
 * @param {APIGatewayEvent} event
 * @param {Context} context
 * @returns {Promise<APIGatewayProxyResult>}
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  if (!streamName) {
    throw new Error('Stream name is undefined');
  }

  const orderId = uuid();
  const userEmail: string = event.requestContext.authorizer?.claims.email;
  const restaurantName: string = JSON.parse(event.body!).restaurantName;

  try {
    await placeOrder({ orderId, userEmail, restaurantName }, kinesis, streamName);
  } catch (error) {
    console.log(error);

    if (error instanceof UnauthorizedError) {
      return {
        statusCode: 401,
        body: 'Unauthorized',
      };
    }

    throw error;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ orderId }),
  };
};

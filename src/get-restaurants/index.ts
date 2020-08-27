import { DynamoDB } from 'aws-sdk';
import { DocumentClient, ItemList, ScanInput } from 'aws-sdk/clients/dynamodb';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';

const tableName: string = process.env.restaurants_table!;
const client: DocumentClient = new DynamoDB.DocumentClient();
const defaultResults: number = parseInt(process.env.defaultResults!) || 8;

/**
 * Returns a list of restaurants
 * @param {number} count
 * @param {DocumentClient} client
 * @param {string} tableName
 */
export const getRestaurants = async (count: number, client: DocumentClient, tableName: string): Promise<ItemList> => {
  let items: ItemList = [];
  const params: ScanInput = {
    TableName: tableName,
    Limit: count,
  };

  try {
    const data = await client.scan(params).promise();
    if (data.Items) {
      items = data.Items;
    }
  } catch (error) {
    console.error(error);
    throw new Error('Unable to scan data');
  }

  return items;
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
  if (!tableName) {
    throw new Error('Table name is undefined');
  }

  const restaurants: ItemList = await getRestaurants(defaultResults, client, tableName);

  return {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  };
};

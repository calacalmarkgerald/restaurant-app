import { DynamoDB } from 'aws-sdk';
import { DocumentClient, ItemList, ScanInput, ExpressionAttributeValueMap } from 'aws-sdk/clients/dynamodb';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';

const tableName: string = process.env.restaurants_table!;
const client: DocumentClient = new DynamoDB.DocumentClient();
const defaultResults: number = parseInt(process.env.defaultResults!) || 8;

/**
 * Search and return a list of restaurants
 * @param {number} count
 * @param {string} theme
 */
const findRestaurantsbyTheme = async (
  count: number,
  theme: string,
  client: DocumentClient,
  tableName: string,
): Promise<ItemList> => {
  let items: ItemList = [];
  const params: ScanInput = {
    TableName: tableName,
    Limit: count,
    FilterExpression: 'contains(themes, :theme)',
    ExpressionAttributeValues: { ':theme': theme } as ExpressionAttributeValueMap,
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
 * @param {APIGatewayEvent} event
 * @param {Context} context
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  if (!tableName) {
    throw new Error('Table name is undefined');
  }

  const body = JSON.parse(event.body!);
  const { theme } = body;

  const restaurants: ItemList = await findRestaurantsbyTheme(defaultResults, theme, client, tableName);

  return {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  };
};

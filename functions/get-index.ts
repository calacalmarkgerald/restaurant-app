import fs from 'fs';
import fetch from 'node-fetch';
import mustache from 'mustache';
import aws4 from 'aws4';
import url from 'url';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';

const restaurantsApiRoot = process.env.restaurants_api;
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

let html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Big Mouth</title>
    
    <style>
      .fullscreenDiv {
        background-color: #05bafd;
        width: 100%;
        height: auto;
        bottom: 0px;
        top: 0px;
        left: 0;
        position: absolute;
      }
      .restaurantsDiv {
        background-color: #ffffff;
        width: 100%;
        height: auto;
      }
      .dayOfWeek {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 32px;
        padding: 10px;
        height: auto;
        display: flex;
        justify-content: center;
      }
      .column-container {
        padding: 0;
        margin: 0;
        list-style: none;
        display: flex;
        flex-flow: column;
        flex-wrap: wrap;
        justify-content: center;
      }
      .row-container {
        padding: 0;
        margin: 0;
        list-style: none;
        display: flex;
        flex-flow: row;
        flex-wrap: wrap;
        justify-content: center;
      }
      .item {
        padding: 5px;
        height: auto;
        margin-top: 10px;
        display: flex;
        flex-flow: row;
        flex-wrap: wrap;
        justify-content: center;
      }
      .restaurant {
        background-color: #00a8f7;
        border-radius: 10px;
        padding: 5px;
        height: auto;
        width: auto;
        margin-left: 40px;
        margin-right: 40px;
        margin-top: 15px;
        margin-bottom: 0px;
        display: flex;
        justify-content: center;
      }
      .restaurant-name {
        font-size: 24px;
        font-family:Arial, Helvetica, sans-serif;
        color: #ffffff;
        padding: 10px;
        margin: 0px;
      }
      .restaurant-image {
        padding-top: 0px;
        margin-top: 0px;
      }
      input {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 18px;
      }
      button {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 18px;
      }
    </style>

    <script>      
    </script>
  </head>

  <body>
    <div class="fullscreenDiv">
      <ul class="column-container">
        <li class="item">
          <img id="logo" src="https://d2qt42rcwzspd6.cloudfront.net/manning/big-mouth.png">
        </li>
        <li class="item">
          <input id="theme" type="text" size="50" placeholder="enter a theme, eg. cartoon"/>
          <button onclick="search()">Find Restaurants</button>
        </li>
        <li>
          <div class="restaurantsDiv column-container">
            <b class="dayOfWeek">{{dayOfWeek}}</b>
            <ul class="row-container">
              {{#restaurants}}
              <li class="restaurant">
                <ul class="column-container">
                    <li class="item restaurant-name">{{name}}</li>
                    <li class="item restaurant-image">
                      <img src="{{image}}">
                    </li>
                </ul>
              </li>
              {{/restaurants}}
            </ul> 
          </div>
        </li>
      </ul>
  </div>
  </body>

</html>
`;

/**
 * Load a static index.html file
 */
function loadHtml(): string {
  if (!html) {
    html = fs.readFileSync('static/index.html', 'utf-8');
  }

  return html;
}

/**
 * Calls the get-restaurant api and return the data in response body
 */
const getRestaurants = async (): Promise<[]> => {
  let data = [];
  const apiURL = url.parse(restaurantsApiRoot as string);
  const opts = {
    host: apiURL.hostname,
    path: apiURL.pathname,
    headers: {} as Record<string, string>,
  };

  aws4.sign(opts);

  try {
    const response = await fetch(restaurantsApiRoot as string, {
      headers: {
        Host: opts.headers['Host'],
        Authorization: opts.headers['Authorization'],
        'X-Amz-Date': opts.headers['X-Amz-Date'],
        'X-Amz-Security-Token': opts.headers['X-Amz-Security-Token'],
      },
    });
    data = (await response.json()) as [];
  } catch (error) {
    console.error(error);
    throw new Error('Unable to fetch restaurants data');
  }

  return data;
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
  try {
    const template = loadHtml();
    const restaurants = await getRestaurants();
    const dayOfWeek = days[new Date().getDay()];
    const html = mustache.render(template, { dayOfWeek, restaurants });
    const response: APIGatewayProxyResult = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
      },
      body: html,
    };

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

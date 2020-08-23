import fs from 'fs';
import fetch from 'node-fetch';
import mustache from 'mustache';
import aws4 from 'aws4';
import url from 'url';
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';

const restaurantsApiRoot = process.env.restaurants_api!;
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const awsRegion = process.env.AWS_REGION!;
const cognitoUserPoolId = process.env.cognito_user_pool_id!;
const cognitoClientId = process.env.cognito_client_id!;

let html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Big Mouth</title>

    <script src="https://sdk.amazonaws.com/js/aws-sdk-2.149.0.min.js"></script>
    <script src="https://d2qt42rcwzspd6.cloudfront.net/manning/aws-cognito-sdk.min.js"></script>
    <script src="https://d2qt42rcwzspd6.cloudfront.net/manning/amazon-cognito-identity.min.js"></script>
    <script
      src="https://code.jquery.com/jquery-3.2.1.min.js"
      integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4="
      crossorigin="anonymous"
    ></script>
    <script
      src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js"
      integrity="sha384-Dziy8F2VlJQLMShA6FHWNul/veM9bCkRUaLqr199K94ntO5QUrLJBEbYegdSkkqX"
      crossorigin="anonymous"
    ></script>
    <link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css" />

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
        padding: 5px;
        margin: 5px;
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
        font-family: Arial, Helvetica, sans-serif;
        color: #ffffff;
        padding: 10px;
        margin: 0px;
      }
      .restaurant-image {
        padding-top: 0px;
        margin-top: 0px;
      }
      .row-container-left {
        list-style: none;
        display: flex;
        flex-flow: row;
        justify-content: flex-start;
      }
      .menu-text {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 24px;
        font-weight: bold;
        color: white;
      }
      .text-trail-space {
        margin-right: 10px;
      }
      .hidden {
        display: none;
      }

      lable,
      button,
      input {
        display: block;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 18px;
      }

      fieldset {
        padding: 0;
        border: 0;
        margin-top: 25px;
      }
    </style>

    <script>
      const AWS_REGION = '{{awsRegion}}';
      const COGNITO_USER_POOL_ID = '{{cognitoUserPoolId}}';
      const CLIENT_ID = '{{cognitoClientId}}';
      const SEARCH_URL = '{{& searchUrl}}';

      var regDialog, regForm;
      var verifyDialog;
      var regCompleteDialog;
      var signInDialog;
      var userPool, cognitoUser;
      var idToken;

      function toggleSignOut(enable) {
        enable === true ? $('#sign-out').show() : $('#sign-out').hide();
      }

      function toggleSignIn(enable) {
        enable === true ? $('#sign-in').show() : $('#sign-in').hide();
      }

      function toggleRegister(enable) {
        enable === true ? $('#register').show() : $('#register').hide();
      }

      function init() {
        AWS.config.region = AWS_REGION;
        AWSCognito.config.region = AWS_REGION;

        var data = {
          UserPoolId: COGNITO_USER_POOL_ID,
          ClientId: CLIENT_ID,
        };
        userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(data);
        cognitoUser = userPool.getCurrentUser();

        if (cognitoUser != null) {
          cognitoUser.getSession(function (err, session) {
            if (err) {
              alert(err);
              return;
            }

            idToken = session.idToken.jwtToken;
            console.log('idToken: ' + idToken);
            console.log('session validity: ' + session.isValid());
          });

          toggleSignOut(true);
          toggleSignIn(false);
          toggleRegister(false);
        } else {
          toggleSignOut(false);
          toggleSignIn(true);
          toggleRegister(true);
        }
      }

      function addUser() {
        var firstName = $('#first-name')[0].value;
        var lastName = $('#last-name')[0].value;
        var username = $('#username')[0].value;
        var password = $('#password')[0].value;
        var email = $('#email')[0].value;

        var attributeList = [
          new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
            Name: 'email',
            Value: email,
          }),
          new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
            Name: 'given_name',
            Value: firstName,
          }),
          new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
            Name: 'family_name',
            Value: lastName,
          }),
        ];

        userPool.signUp(username, password, attributeList, null, function (err, result) {
          if (err) {
            alert(err);
            return;
          }
          cognitoUser = result.user;
          console.log('user name is ' + cognitoUser.getUsername());

          regDialog.dialog('close');
          verifyDialog.dialog('open');
        });
      }

      function confirmUser() {
        var verificationCode = $('#verification-code')[0].value;
        cognitoUser.confirmRegistration(verificationCode, true, function (err, result) {
          if (err) {
            alert(err);
            return;
          }
          console.log('verification call result: ' + result);

          verifyDialog.dialog('close');
          regCompleteDialog.dialog('open');
        });
      }

      function authenticateUser() {
        var username = $('#sign-in-username')[0].value;
        var password = $('#sign-in-password')[0].value;

        var authenticationData = {
          Username: username,
          Password: password,
        };
        var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(
          authenticationData
        );
        var userData = {
          Username: username,
          Pool: userPool,
        };
        var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

        cognitoUser.authenticateUser(authenticationDetails, {
          onSuccess: function (result) {
            console.log('access token : ' + result.getAccessToken().getJwtToken());
            /*Use the idToken for Logins Map when Federating User Pools with Cognito Identity or when passing through an Authorization Header to an API Gateway Authorizer*/
            idToken = result.idToken.jwtToken;
            console.log('idToken : ' + idToken);

            signInDialog.dialog('close');
            toggleRegister(false);
            toggleSignIn(false);
            toggleSignOut(true);
          },

          onFailure: function (err) {
            alert(err);
          },
        });
      }

      function signOut() {
        if (cognitoUser != null) {
          cognitoUser.signOut();
          toggleRegister(true);
          toggleSignIn(true);
          toggleSignOut(false);
        }
      }

      function searchRestaurants() {
        var theme = $('#theme')[0].value;

        var xhr = new XMLHttpRequest();
        xhr.open('POST', SEARCH_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', idToken);
        xhr.send(JSON.stringify({ theme }));

        xhr.onreadystatechange = function (e) {
          if (xhr.readyState === 4 && xhr.status === 200) {
            var restaurants = JSON.parse(xhr.responseText);
            var restaurantsList = $('#restaurantsUl');
            restaurantsList.empty();

            for (var restaurant of restaurants) {
              restaurantsList.append(
                '<li class="restaurant"><ul class="column-container"><li class="item restaurant-name">' +
                  restaurant.name +
                  '</li><li class="item restaurant-image"><img src="' +
                  restaurant.image +
                  '"></li></ul></li>'
              );
            }
          } else if (xhr.readyState === 4) {
            alert(xhr.responseText);
          }
        };
      }

      $(document).ready(function () {
        regDialog = $('#reg-dialog-form').dialog({
          autoOpen: false,
          modal: true,
          buttons: {
            'Create an account': addUser,
            Cancel: function () {
              regDialog.dialog('close');
            },
          },
          close: function () {
            regForm[0].reset();
          },
        });

        regForm = regDialog.find('form').on('submit', function (event) {
          event.preventDefault();
          addUser();
        });

        $('#register').on('click', function () {
          regDialog.dialog('open');
        });

        verifyDialog = $('#verify-dialog-form').dialog({
          autoOpen: false,
          modal: true,
          buttons: {
            'Confirm registration': confirmUser,
            Cancel: function () {
              verifyDialog.dialog('close');
            },
          },
          close: function () {
            $(this).dialog('close');
          },
        });

        regCompleteDialog = $('#registered-message').dialog({
          autoOpen: false,
          modal: true,
          buttons: {
            Ok: function () {
              $(this).dialog('close');
            },
          },
        });

        signInDialog = $('#sign-in-form').dialog({
          autoOpen: false,
          modal: true,
          buttons: {
            'Sign in': authenticateUser,
            Cancel: function () {
              signInDialog.dialog('close');
            },
          },
          close: function () {
            $(this).dialog('close');
          },
        });

        $('#sign-in').on('click', function () {
          signInDialog.dialog('open');
        });

        $('#sign-out').on('click', function () {
          signOut();
        });

        init();
      });
    </script>
  </head>

  <body>
    <div class="fullscreenDiv">
      <ul class="column-container">
        <li>
          <ul class="row-container-left">
            <li id="register" class="item text-trail-space hidden">
              <a class="menu-text" href="#">Register</a>
            </li>
            <li id="sign-in" class="item menu-text text-trail-space hidden">
              <a class="menu-text" href="#">Sign in</a>
            </li>
            <li id="sign-out" class="item menu-text text-trail-space hidden">
              <a class="menu-text" href="#">Sign out</a>
            </li>
          </ul>
        </li>
        <li class="item">
          <img id="logo" src="https://d2qt42rcwzspd6.cloudfront.net/manning/big-mouth.png" />
        </li>
        <li class="item">
          <input id="theme" type="text" size="50" placeholder="enter a theme, eg. cartoon" />
          <button onclick="searchRestaurants()">Find Restaurants</button>
        </li>
        <li>
          <div class="restaurantsDiv column-container">
            <b class="dayOfWeek">{{dayOfWeek}}</b>
            <ul id="restaurantsUl" class="row-container">
              {{#restaurants}}
              <li class="restaurant">
                <ul class="column-container">
                  <li class="item restaurant-name">{{name}}</li>
                  <li class="item restaurant-image">
                    <img src="{{image}}" />
                  </li>
                </ul>
              </li>
              {{/restaurants}}
            </ul>
          </div>
        </li>
      </ul>
    </div>

    <div id="reg-dialog-form" title="Register">
      <form>
        <fieldset>
          <label for="first-name">First Name</label>
          <input type="text" id="first-name" class="text ui-widget-content ui-corner-all" />
          <label for="last-name">Last Name</label>
          <input type="text" id="last-name" class="text ui-widget-content ui-corner-all" />
          <label for="email">Email</label>
          <input type="text" name="email" id="email" class="text ui-widget-content ui-corner-all" />
          <label for="username">Username</label>
          <input
            type="text"
            name="username"
            id="username"
            class="text ui-widget-content ui-corner-all"
          />
          <label for="password">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            class="text ui-widget-content ui-corner-all"
          />
        </fieldset>
      </form>
    </div>

    <div id="verify-dialog-form" title="Verify">
      <form>
        <fieldset>
          <label for="verification-code">Verification Code</label>
          <input type="text" id="verification-code" class="text ui-widget-content ui-corner-all" />
        </fieldset>
      </form>
    </div>

    <div id="registered-message" title="Registration complete!">
      <p>
        <span class="ui-icon ui-icon-circle-check" style="float:left; margin:0 7px 50px 0;"></span>
        You are now registered!
      </p>
    </div>

    <div id="sign-in-form" title="Sign in">
      <form>
        <fieldset>
          <label for="sign-in-username">Username</label>
          <input type="text" id="sign-in-username" class="text ui-widget-content ui-corner-all" />
          <label for="sign-in-password">Password</label>
          <input
            type="password"
            id="sign-in-password"
            class="text ui-widget-content ui-corner-all"
          />
        </fieldset>
      </form>
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
  const apiURL = url.parse(restaurantsApiRoot);
  const opts = {
    host: apiURL.hostname,
    path: apiURL.pathname,
    headers: {} as Record<string, string>,
  };

  aws4.sign(opts);

  try {
    const response = await fetch(restaurantsApiRoot, {
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
    const html = mustache.render(template, {
      awsRegion,
      cognitoUserPoolId,
      cognitoClientId,
      dayOfWeek,
      restaurants,
      searchUrl: `${restaurantsApiRoot}/search`,
    });
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

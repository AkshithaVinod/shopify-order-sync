function createSyncTrigger() {
  ScriptApp.newTrigger('getOrders')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('Hourly Shopify order sync trigger created.');
}

function testConnection() {
  const token = PropertiesService
    .getScriptProperties()
    .getProperty('SHOPIFY_ACCESS_TOKEN');

  const url = 'https://my-learning-store-q8ato7cm.myshopify.com/admin/api/2026-07/graphql.json';

  Logger.log(
    token ? 'TOKEN EXISTS' : 'TOKEN IS EMPTY'
  );

  if (!token) {
    throw new Error('Shopify access token is missing.');
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-Shopify-Access-Token': token
    },
    payload: JSON.stringify({
      query: `
        query {
          shop {
            name
          }
        }
      `
    }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);

  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();

  Logger.log('HTTP STATUS: ' + statusCode);
  Logger.log(responseText);

  if (statusCode !== 200) {
    throw new Error(
      'Shopify connection failed. HTTP ' +
      statusCode +
      ': ' +
      responseText
    );
  }

  const data = JSON.parse(responseText);

  if (data.errors) {
    throw new Error(
      'Shopify GraphQL error: ' +
      JSON.stringify(data.errors)
    );
  }

  Logger.log(
    'Connected successfully to Shopify store: ' +
    data.data.shop.name
  );
}

function getShopifyAccesToken(){
  const clientId = PropertiesService
    .getScriptProperties()
    .getProperty('SHOPIFY_CLIENT_ID');

  const clientSecret = PropertiesService
    .getScriptProperties()
    .getProperty('SHOPIFY_CLIENT_SECRET');

  Logger.log(clientId ? 'CLIEND ID FOUND' : 'CLIENT IS MISSING');
  Logger.log(clientSecret ? 'CLIENT SECRET FOUND' : 'CLIENT SECRET MISSING');

  const url = 'https://my-learning-store-q8ato7cm.myshopify.com/admin/oauth/access_token';

 

  const options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    },
    headers: {
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  };

const response = UrlFetchApp.fetch(url, options);
const data = JSON.parse(response.getContentText());
Logger.log(data.access_token ? 'ACCESS TOKEN RECEIVED' : 'NO ACCESS TOKEN');

Logger.log(response.getResponseCode());
Logger.log(response.getContentText());
Logger.log('SCOPES: ' + data.scope);
Logger.log(
  data.access_token ? 'access token recieved' : 'no access token'
);
PropertiesService
  .getScriptProperties()
  .setProperty('SHOPIFY_ACCESS_TOKEN', data.access_token);
}

function getOrders() {
 const token = PropertiesService
  .getScriptProperties()
  .getProperty('SHOPIFY_ACCESS_TOKEN');

  const properties = PropertiesService.getScriptProperties();
  const syncStartedAt = new Date().toISOString();
  const lastSync = properties.getProperty('SHOPIFY_LAST_SYNC');

  const spreadsheet = SpreadsheetApp.openById('1LSLCjZgeLzGvRBPYMTvur0cg11_izVX5weoBj4Osg1U');
  const sheet = spreadsheet.getSheetByName('Sheet1');

  const lastRow = sheet.getLastRow();

  const existingOrderIds = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat()
    : [];

  const existingOrderIdSet = new Set(existingOrderIds);

  const url = 'https://my-learning-store-q8ato7cm.myshopify.com/admin/api/2026-07/graphql.json';

  let hasNextPage = true;
  let cursor = null;

  const newRows = [];

  while (hasNextPage) {

    const pagination = cursor
  ? `after: "${cursor}"`
  : '';

const dateFilter = lastSync
  ? `query: "created_at:>${lastSync}"`
  : '';

const query = `
  query {
    orders(
      first: 10
      ${pagination}
      ${dateFilter}
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          createdAt
        }
      }
    }
  }
`;
Logger.log(query);

    const payload = {
      query: query
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'X-Shopify-Access-Token': token
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    let response;
let attempts = 0;

while (attempts < 3) {
  response = UrlFetchApp.fetch(url, options);

  const statusCode = response.getResponseCode();

  if (statusCode !== 429) {
    break;
  }

  attempts++;

  Logger.log(
    'Rate limited. Retry attempt: ' + attempts
  );

  Utilities.sleep(2000 * attempts);
}

const statusCode = response.getResponseCode();
const responseText = response.getContentText();

Logger.log('HTTP STATUS: ' + statusCode);

if (statusCode !== 200) {
  throw new Error(
    'Shopify API request failed. HTTP ' +
    statusCode +
    ': ' +
    responseText
  );
}

const data = JSON.parse(responseText);

   if (data.errors) {
  throw new Error(
    'Shopify GraphQL error: ' +
    JSON.stringify(data.errors)
  );
}

    const orders = data.data.orders;

    for (const edge of orders.edges) {
      const order = edge.node;

      if (existingOrderIdSet.has(order.id)) {
        continue;
      }

      newRows.push([
        order.id,
        order.name,
        order.createdAt
      ]);

      existingOrderIdSet.add(order.id);
    }

    hasNextPage = orders.pageInfo.hasNextPage;
    cursor = orders.pageInfo.endCursor;

    Logger.log(
      'Page processed. More pages: ' + hasNextPage
    );
  }

  if (newRows.length > 0) {
    sheet
      .getRange(
        sheet.getLastRow() + 1,
        1,
        newRows.length,
        newRows[0].length
      )
      .setValues(newRows);

    Logger.log(newRows.length + ' new orders added.');
  } else {
    Logger.log('No new orders.');
  }

  properties.setProperty('SHOPIFY_LAST_SYNC', syncStartedAt);

Logger.log('Sync completed successfully.');
Logger.log('Last sync: ' + syncStartedAt);
}
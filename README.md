# Shopify Order Sync

A Google Apps Script project that retrieves Shopify orders through the Shopify GraphQL Admin API and synchronizes new orders into Google Sheets.

The project was built to automate the process of retrieving and tracking new Shopify orders without manually exporting order data.

## Architecture

Shopify
    |
    | GraphQL Admin API
    v
Google Apps Script
    |
    v
Google Sheets

A time-driven Apps Script trigger runs the synchronization automatically every hour.

## Technologies

- JavaScript
- Google Apps Script
- Shopify GraphQL Admin API
- Google Sheets
- Git
- GitHub

## Features

### Shopify GraphQL Integration

Retrieves Shopify order information using the Shopify GraphQL Admin API.

### Authentication

Shopify Client ID and Client Secret are stored using Google Apps Script Script Properties rather than being hardcoded in the source code.

An access token is obtained through Shopify's client credentials flow and used for authenticated API requests.

### Incremental Sync

The script stores the timestamp of the previous successful synchronization and requests only orders created after that timestamp.

This prevents unnecessary processing of the complete order history on every run.

### Pagination

GraphQL cursor-based pagination is implemented to process multiple pages of orders.

### Duplicate Prevention

Existing order IDs from Google Sheets are loaded into a JavaScript `Set` and checked before adding new orders.

### Rate Limit Handling

HTTP `429` responses are handled using retry logic with increasing delays between attempts.

### Error Handling

The script checks for:

- HTTP errors
- GraphQL errors
- Missing access tokens
- API request failures

### Scheduled Automation

A Google Apps Script time-driven trigger runs the order synchronization automatically every hour.

## Data Flow

1. Retrieve the Shopify access token from Script Properties.
2. Read the timestamp of the previous synchronization.
3. Query Shopify for orders created after the previous sync.
4. Process additional pages using GraphQL cursors.
5. Check existing order IDs to prevent duplicates.
6. Write new orders to Google Sheets.
7. Store the synchronization timestamp.

## Security

Sensitive Shopify credentials are stored using Google Apps Script Script Properties and are not included in the source code.

The repository does not contain:

- Shopify Client Secret
- Shopify Access Token
- Other authentication credentials

## Current Scope

The current implementation synchronizes basic order information:

- Order ID
- Order name
- Order creation timestamp

The project can be extended to synchronize additional order and fulfillment information as required.


# API Reference

This document provides a comprehensive reference for the SuperSurkhet API.

## API Overview

The SuperSurkhet API provides programmatic access to all platform functionality through a RESTful interface with GraphQL support. The API is designed to be intuitive, consistent, and fully documented.

### Base URL

```
https://api.supersurkhet.com/v1
```

For local development:
```
http://localhost:3000/api
```

### Authentication

All API requests require authentication using JWT tokens obtained through the OAuth 2.0 flow.

```bash
# Example authenticated request
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://api.supersurkhet.com/v1/businesses
```

### Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Anonymous requests**: 100 requests per hour
- **Authenticated requests**: 1000 requests per hour
- **Business operations**: 100 requests per hour per business

Exceeding rate limits will result in a 429 (Too Many Requests) response.

### Response Format

All API responses follow a consistent JSON format:

```json
{
  "success": true,
  "data": {},
  "message": "Optional success message",
  "meta": {
    "timestamp": "2023-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}
```

Error responses follow a similar format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descriptive error message",
    "details": {}
  },
  "message": "User-friendly error message"
}
```

## Core API Endpoints

### Authentication

#### Google OAuth Login
```
POST /auth/google
```

Exchange Google OAuth token for SuperSurkhet JWT token.

**Request Body:**
```json
{
  "access_token": "google_oauth_token"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### Refresh Token
```
POST /auth/refresh
```

Refresh JWT token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "refresh_token"
}
```

**Response:**
```json
{
  "token": "new_jwt_token"
}
```

### Businesses

#### List Businesses
```
GET /businesses
```

Retrieve a list of businesses the authenticated user has access to.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 10, max: 100)
- `search` (string): Search term to filter businesses
- `type` (string): Filter by business type

**Response:**
```json
{
  "data": [
    {
      "id": "business_id",
      "name": "Business Name",
      "basePath": "business-slug",
      "businessType": "retail",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

#### Get Business
```
GET /businesses/{id}
```

Retrieve details for a specific business.

**Response:**
```json
{
  "data": {
    "id": "business_id",
    "name": "Business Name",
    "basePath": "business-slug",
    "businessType": "retail",
    "features": {
      "product": true,
      "order": true,
      "expense": true
    },
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

#### Create Business
```
POST /businesses
```

Create a new business.

**Request Body:**
```json
{
  "name": "New Business",
  "businessType": "retail",
  "features": {
    "product": true,
    "order": true
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "new_business_id",
    "name": "New Business",
    "basePath": "new-business",
    "businessType": "retail",
    "features": {
      "product": true,
      "order": true,
      "expense": false
    },
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

#### Update Business
```
PUT /businesses/{id}
```

Update an existing business.

**Request Body:**
```json
{
  "name": "Updated Business Name",
  "features": {
    "product": true,
    "order": true,
    "expense": true
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "business_id",
    "name": "Updated Business Name",
    "basePath": "business-slug",
    "businessType": "retail",
    "features": {
      "product": true,
      "order": true,
      "expense": true
    },
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T01:00:00Z"
  }
}
```

#### Delete Business
```
DELETE /businesses/{id}
```

Delete a business and all associated data.

**Response:**
```json
{
  "success": true,
  "message": "Business deleted successfully"
}
```

### Users

#### List Business Users
```
GET /businesses/{id}/users
```

Retrieve users associated with a business.

**Response:**
```json
{
  "data": [
    {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "admin",
      "joinedAt": "2023-01-01T00:00:00Z"
    }
  ]
}
```

#### Add User to Business
```
POST /businesses/{id}/users
```

Add a user to a business.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "member"
}
```

**Response:**
```json
{
  "data": {
    "id": "user_id",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "member",
    "joinedAt": "2023-01-01T00:00:00Z"
  }
}
```

#### Update User Role
```
PUT /businesses/{id}/users/{userId}
```

Update a user's role in a business.

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response:**
```json
{
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "admin",
    "joinedAt": "2023-01-01T00:00:00Z"
  }
}
```

#### Remove User from Business
```
DELETE /businesses/{id}/users/{userId}
```

Remove a user from a business.

**Response:**
```json
{
  "success": true,
  "message": "User removed from business"
}
```

## Business Module APIs

Each business module provides specific endpoints for managing module-specific data.

### Products (Retail, Food, etc.)

#### List Products
```
GET /businesses/{id}/products
```

Retrieve products for a business.

**Query Parameters:**
- `page` (integer): Page number
- `limit` (integer): Items per page
- `category` (string): Filter by category
- `search` (string): Search term

**Response:**
```json
{
  "data": [
    {
      "id": "product_id",
      "name": "Product Name",
      "description": "Product description",
      "price": 100.00,
      "category": "Electronics",
      "imageUrl": "https://example.com/image.jpg",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Product
```
GET /businesses/{id}/products/{productId}
```

Retrieve a specific product.

**Response:**
```json
{
  "data": {
    "id": "product_id",
    "name": "Product Name",
    "description": "Product description",
    "price": 100.00,
    "category": "Electronics",
    "imageUrl": "https://example.com/image.jpg",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

#### Create Product
```
POST /businesses/{id}/products
```

Create a new product.

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "price": 150.00,
  "category": "Electronics",
  "imageUrl": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "data": {
    "id": "new_product_id",
    "name": "New Product",
    "description": "Product description",
    "price": 150.00,
    "category": "Electronics",
    "imageUrl": "https://example.com/image.jpg",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

#### Update Product
```
PUT /businesses/{id}/products/{productId}
```

Update an existing product.

**Request Body:**
```json
{
  "name": "Updated Product Name",
  "price": 120.00
}
```

**Response:**
```json
{
  "data": {
    "id": "product_id",
    "name": "Updated Product Name",
    "description": "Product description",
    "price": 120.00,
    "category": "Electronics",
    "imageUrl": "https://example.com/image.jpg",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T01:00:00Z"
  }
}
```

#### Delete Product
```
DELETE /businesses/{id}/products/{productId}
```

Delete a product.

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

### Orders

#### List Orders
```
GET /businesses/{id}/orders
```

Retrieve orders for a business.

**Query Parameters:**
- `page` (integer): Page number
- `limit` (integer): Items per page
- `status` (string): Filter by order status
- `dateFrom` (string): Filter by date range start (ISO 8601)
- `dateTo` (string): Filter by date range end (ISO 8601)

**Response:**
```json
{
  "data": [
    {
      "id": "order_id",
      "customerId": "customer_id",
      "items": [
        {
          "productId": "product_id",
          "quantity": 2,
          "unitPrice": 100.00
        }
      ],
      "totalAmount": 200.00,
      "status": "completed",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Order
```
GET /businesses/{id}/orders/{orderId}
```

Retrieve a specific order.

**Response:**
```json
{
  "data": {
    "id": "order_id",
    "customerId": "customer_id",
    "items": [
      {
        "productId": "product_id",
        "quantity": 2,
        "unitPrice": 100.00
      }
    ],
    "totalAmount": 200.00,
    "status": "completed",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

#### Create Order
```
POST /businesses/{id}/orders
```

Create a new order.

**Request Body:**
```json
{
  "customerId": "customer_id",
  "items": [
    {
      "productId": "product_id",
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "data": {
    "id": "new_order_id",
    "customerId": "customer_id",
    "items": [
      {
        "productId": "product_id",
        "quantity": 2,
        "unitPrice": 100.00
      }
    ],
    "totalAmount": 200.00,
    "status": "pending",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

#### Update Order Status
```
PUT /businesses/{id}/orders/{orderId}/status
```

Update an order's status.

**Request Body:**
```json
{
  "status": "completed"
}
```

**Response:**
```json
{
  "data": {
    "id": "order_id",
    "customerId": "customer_id",
    "items": [
      {
        "productId": "product_id",
        "quantity": 2,
        "unitPrice": 100.00
      }
    ],
    "totalAmount": 200.00,
    "status": "completed",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T01:00:00Z"
  }
}
```

### Appointments (Healthcare, Services, etc.)

#### List Appointments
```
GET /businesses/{id}/appointments
```

Retrieve appointments for a business.

**Query Parameters:**
- `page` (integer): Page number
- `limit` (integer): Items per page
- `status` (string): Filter by appointment status
- `date` (string): Filter by specific date (YYYY-MM-DD)
- `employeeId` (string): Filter by employee

**Response:**
```json
{
  "data": [
    {
      "id": "appointment_id",
      "customerId": "customer_id",
      "employeeId": "employee_id",
      "serviceId": "service_id",
      "startTime": "2023-01-01T10:00:00Z",
      "endTime": "2023-01-01T11:00:00Z",
      "status": "confirmed",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Appointment
```
GET /businesses/{id}/appointments/{appointmentId}
```

Retrieve a specific appointment.

**Response:**
```json
{
  "data": {
    "id": "appointment_id",
    "customerId": "customer_id",
    "employeeId": "employee_id",
    "serviceId": "service_id",
    "startTime": "2023-01-01T10:00:00Z",
    "endTime": "2023-01-01T11:00:00Z",
    "status": "confirmed",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

#### Create Appointment
```
POST /businesses/{id}/appointments
```

Create a new appointment.

**Request Body:**
```json
{
  "customerId": "customer_id",
  "employeeId": "employee_id",
  "serviceId": "service_id",
  "startTime": "2023-01-01T10:00:00Z",
  "endTime": "2023-01-01T11:00:00Z"
}
```

**Response:**
```json
{
  "data": {
    "id": "new_appointment_id",
    "customerId": "customer_id",
    "employeeId": "employee_id",
    "serviceId": "service_id",
    "startTime": "2023-01-01T10:00:00Z",
    "endTime": "2023-01-01T11:00:00Z",
    "status": "pending",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

#### Update Appointment
```
PUT /businesses/{id}/appointments/{appointmentId}
```

Update an existing appointment.

**Request Body:**
```json
{
  "startTime": "2023-01-01T11:00:00Z",
  "endTime": "2023-01-01T12:00:00Z"
}
```

**Response:**
```json
{
  "data": {
    "id": "appointment_id",
    "customerId": "customer_id",
    "employeeId": "employee_id",
    "serviceId": "service_id",
    "startTime": "2023-01-01T11:00:00Z",
    "endTime": "2023-01-01T12:00:00Z",
    "status": "pending",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T01:00:00Z"
  }
}
```

#### Update Appointment Status
```
PUT /businesses/{id}/appointments/{appointmentId}/status
```

Update an appointment's status.

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Response:**
```json
{
  "data": {
    "id": "appointment_id",
    "customerId": "customer_id",
    "employeeId": "employee_id",
    "serviceId": "service_id",
    "startTime": "2023-01-01T11:00:00Z",
    "endTime": "2023-01-01T12:00:00Z",
    "status": "confirmed",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T01:00:00Z"
  }
}
```

## Error Codes

The API uses standard HTTP status codes along with custom error codes:

| HTTP Code | Error Code | Description |
|-----------|------------|-------------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource conflict |
| 422 | UNPROCESSABLE_ENTITY | Unprocessable entity |
| 429 | RATE_LIMITED | Rate limit exceeded |
| 500 | INTERNAL_SERVER_ERROR | Internal server error |
| 503 | SERVICE_UNAVAILABLE | Service unavailable |

## Webhooks

The API supports webhooks for real-time notifications:

### Event Types

- `business.created` - Business created
- `business.updated` - Business updated
- `business.deleted` - Business deleted
- `order.created` - Order created
- `order.updated` - Order updated
- `appointment.created` - Appointment created
- `appointment.updated` - Appointment updated
- `product.created` - Product created
- `product.updated` - Product updated
- `product.deleted` - Product deleted

### Webhook Configuration

```
POST /businesses/{id}/webhooks
```

Configure webhook endpoints for a business.

**Request Body:**
```json
{
  "url": "https://your-service.com/webhook",
  "events": ["order.created", "order.updated"],
  "secret": "webhook_secret_for_verification"
}
```

### Webhook Payload

All webhooks include a signature header for verification:

```
X-SuperSurkhet-Signature: sha256=signature_hash
```

**Payload Structure:**
```json
{
  "id": "event_id",
  "type": "order.created",
  "timestamp": "2023-01-01T00:00:00Z",
  "data": {
    // Event-specific data
  }
}
```

## GraphQL API

In addition to the REST API, SuperSurkhet provides a GraphQL endpoint for more flexible data querying.

### Endpoint

```
POST /graphql
```

### Example Query

```graphql
query GetBusinessWithProducts($businessId: ID!) {
  business(id: $businessId) {
    id
    name
    basePath
    products(first: 10) {
      edges {
        node {
          id
          name
          price
          category
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

### Example Mutation

```graphql
mutation CreateProduct($input: CreateProductInput!) {
  createProduct(input: $input) {
    product {
      id
      name
      price
    }
  }
}
```

## SDKs

Official SDKs are available for popular programming languages:

### JavaScript/TypeScript
```bash
npm install @supersurkhet/sdk
```

```javascript
import { SuperSurkhet } from '@supersurkhet/sdk';

const client = new SuperSurkhet({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.supersurkhet.com/v1'
});

const businesses = await client.businesses.list();
```

### Python
```bash
pip install supersurkhet-sdk
```

```python
from supersurkhet import SuperSurkhet

client = SuperSurkhet(
    api_key='your_api_key',
    base_url='https://api.supersurkhet.com/v1'
)

businesses = client.businesses.list()
```

### Java
```xml
<dependency>
  <groupId>com.supersurkhet</groupId>
  <artifactId>sdk</artifactId>
  <version>1.0.0</version>
</dependency>
```

```java
import com.supersurkhet.SuperSurkhet;

SuperSurkhet client = new SuperSurkhet.Builder()
    .apiKey("your_api_key")
    .baseUrl("https://api.supersurkhet.com/v1")
    .build();

List<Business> businesses = client.businesses().list();
```

## Best Practices

### Error Handling

Always check the response status and handle errors appropriately:

```javascript
try {
  const response = await fetch('/api/businesses', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  const data = await response.json();
  // Process data
} catch (error) {
  // Handle error
  console.error('API Error:', error.message);
}
```

### Pagination

Implement proper pagination handling:

```javascript
async function fetchAllBusinesses() {
  let allBusinesses = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(`/api/businesses?page=${page}&limit=50`);
    const data = await response.json();
    
    allBusinesses = [...allBusinesses, ...data.data];
    
    if (data.meta.page >= data.meta.pages) {
      hasMore = false;
    } else {
      page++;
    }
  }
  
  return allBusinesses;
}
```

### Rate Limiting

Implement exponential backoff for rate limiting:

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || (2 ** i * 1000);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
    }
  }
}
```

This API reference provides comprehensive documentation for integrating with the SuperSurkhet platform. For additional support, please refer to the developer community or contact our support team.
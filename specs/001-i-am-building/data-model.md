# Data Model: SuperSurkhet Super-Dapp/Super-Network Platform

## Core Entities

### Business
*Represents a business entity that signs up to the platform (restaurant, gym, petrol pump, etc.)*

**Fields:**
- `id`: string (unique identifier from GunDB)
- `name`: string (business name)
- `type`: enum (retail, food, service, education, healthcare, logistics, real_estate, cooperative, other, hotel, petrol_pump, gym, cinema, financial_firm, ride_sharing)
- `location`: string (physical address or area)
- `basePath`: string (unique URL path for the business, e.g., /my-shop)
- `features`: record<string, boolean> (map of enabled features for this business)
- `isActive`: boolean (whether the business is currently active)
- `createdAt`: string (ISO date string)
- `updatedAt`: string (ISO date string)

**Relationships:**
- One-to-many with BusinessConfig (max 1 per business)
- One-to-many with User through Membership
- One-to-many with various business-specific entities (products, appointments, etc.)

**Validation:**
- `name` must be unique within the platform
- `basePath` must be unique across all businesses
- `type` must be one of the defined enum values
- Business can only have one configuration record

### User
*Represents an individual who interacts with businesses on the platform*

**Fields:**
- `id`: string (unique identifier from GunDB)
- `email`: string (email address, used for login)
- `password`: string (hashed password)
- `name`: string (full name)
- `avatar`: string (URL to avatar image)
- `phone`: string (contact phone number)
- `isActive`: boolean (whether account is active)
- `role`: string (default: "user")
- `createdAt`: string (ISO date string)
- `updatedAt`: string (ISO date string)

**Relationships:**
- Many-to-many with Business through Membership
- One-to-many with various business-specific entities (orders, appointments, etc.)

**Validation:**
- `email` must be unique across all users
- `email` must be a valid email format

### BusinessConfig
*Represents the business configuration settings with a one-to-one relationship to Business*

**Fields:**
- `id`: string (unique identifier from GunDB)
- `businessId`: string (reference to business)
- `paymentSettings`: object (Fonepay integration settings)
- `customization`: object (UI theme, branding options)
- `analyticsSettings`: object (analytics configuration)
- `notificationSettings`: object (notification preferences)
- `createdAt`: string (ISO date string)
- `updatedAt`: string (ISO date string)

**Relationships:**
- One-to-one with Business (max 1 per business)

**Validation:**
- Each business can have only one configuration record
- `businessId` must reference an existing business

### Membership
*Links users to businesses with specific roles and permissions*

**Fields:**
- `id`: string (unique identifier from GunDB)
- `userId`: string (reference to user)
- `businessId`: string (reference to business)
- `roleId`: string (reference to role)
- `createdAt`: string (ISO date string)
- `updatedAt`: string (ISO date string)

**Relationships:**
- Many-to-one with User
- Many-to-one with Business
- Many-to-one with Role (optional)

**Validation:**
- `userId` must reference an existing user
- `businessId` must reference an existing business
- A user cannot be a member of the same business multiple times

### Role
*Defines hierarchical permissions and access control for users within business contexts*

**Fields:**
- `id`: string (unique identifier from GunDB)
- `name`: string (role name)
- `businessId`: string (reference to specific business)
- `permissions`: record<string, boolean> (permission map)
- `description`: string (role description)
- `createdAt`: string (ISO date string)
- `updatedAt`: string (ISO date string)

**Relationships:**
- One-to-many with Membership
- One-to-one with Business

**Validation:**
- Role names must be unique within a business
- Permissions must be valid platform permissions
- Business reference must exist

### EmployeePermission
*Represents the hierarchical permission structure for employees within a business*

**Fields:**
- `id`: string (unique identifier from GunDB)
- `roleId`: string (reference to role)
- `permissionKey`: string (specific permission identifier)
- `granted`: boolean (whether permission is granted)
- `createdAt`: string (ISO date string)
- `updatedAt`: string (ISO date string)

**Relationships:**
- Many-to-one with Role

**Validation:**
- `permissionKey` must be a valid platform permission
- Each role can have only one record per permission key

### QR Code/DMX
*Represents a unique identifier for each business location that triggers actions when scanned*

**Fields:**
- `id`: string (unique identifier from GunDB)
- `businessId`: string (reference to business)
- `actionType`: string (type of action triggered)
- `locationData`: object (location information)
- `config`: object (specific configuration for this QR code)
- `createdAt`: string (ISO date string)
- `updatedAt`: string (ISO date string)
- `lastScannedAt`: string (ISO date string)
- `scanCount`: number (total scans)

**Relationships:**
- Many-to-one with Business

**Validation:**
- `businessId` must reference an existing business
- Location data must be valid coordinates or address

### Business Offering
*Represents an item or service offered by a business (menu items, gym packages, fuel types)*

**Fields:**
- `id`: string (unique identifier from GunDB)
- `businessId`: string (reference to business)
- `name`: string (offering name)
- `description`: string (offering description)
- `price`: number (price of offering)
- `availability`: boolean (whether offering is available)
- `category`: string (category of offering)
- `metadata`: object (additional data specific to offering type)
- `createdAt`: string (ISO date string)
- `updatedAt`: string (ISO date string)

**Relationships:**
- Many-to-one with Business

**Validation:**
- `businessId` must reference an existing business
- `price` must be positive if specified

### Transaction
*Represents a payment transaction processed through Fonepay*

**Fields:**
- `id`: string (unique identifier from GunDB)
- `amount`: number (transaction amount)
- `businessId`: string (reference to business)
- `userId`: string (reference to user)
- `paymentMethod`: string (payment method used)
- `status`: enum (pending, paid, failed, refunded)
- `paymentGatewayId`: string (reference to payment gateway transaction)
- `createdAt`: string (ISO date string)
- `updatedAt`: string (ISO date string)

**Relationships:**
- Many-to-one with Business
- Many-to-one with User

**Validation:**
- `amount` must be positive
- `status` must be one of defined enum values
- `businessId` and `userId` must reference existing records

### Notification
*Represents a location-based or interaction-based notification sent to users*

**Fields:**
- `id`: string (unique identifier from GunDB)
- `triggerCondition`: object (condition that triggers notification)
- `messageContent`: string (notification text)
- `recipientUserId`: string (user to receive notification)
- `deliveryStatus`: enum (pending, sent, delivered, failed)
- `deliveryAttempts`: number (count of delivery attempts)
- `createdAt`: string (ISO date string)
- `updatedAt`: string (ISO date string)
- `scheduledAt`: string (when to send notification)

**Relationships:**
- Many-to-one with User (recipient)

**Validation:**
- `recipientUserId` must reference an existing user
- `deliveryStatus` must be one of defined enum values

### Analytics Data
*Represents business performance metrics collected from the platform*

**Fields:**
- `id`: string (unique identifier from GunDB)
- `businessId`: string (reference to business)
- `metricType`: string (type of metric)
- `metricValue`: number (value of metric)
- `timestamp`: string (ISO date string)
- `period`: string (time period, e.g., daily, weekly, monthly)

**Relationships:**
- Many-to-one with Business

**Validation:**
- `businessId` must reference an existing business
- `metricValue` must be a number
- `timestamp` must be valid date string

### EmployeeBusinessRole
*Represents the specific role an employee has within a specific business context*

**Fields:**
- `id`: string (unique identifier from GunDB)
- `userId`: string (reference to user who is employee)
- `businessId`: string (reference to business)
- `roleId`: string (reference to specific role)
- `assignedBy`: string (user ID of who assigned this role)
- `isActive`: boolean (whether the role assignment is active)
- `assignedAt`: string (ISO date string)
- `updatedAt`: string (ISO date string)

**Relationships:**
- Many-to-one with User
- Many-to-one with Business
- Many-to-one with Role

**Validation:**
- `userId`, `businessId`, and `roleId` must reference existing records
- An employee can't have multiple active roles in the same business simultaneously

## Schema Relationships

```
[User] 1---* [Membership] *---1 [Business]
          |
          *---1 [Role] 1---* [EmployeePermission]
          
[Business] 1---1 [BusinessConfig]
          |
          *---* [Business Offering]
          *---* [QR Code/DMX]
          *---* [Transaction]
          *---* [Analytics Data]
          
[User] 1---* [EmployeeBusinessRole] *---1 [Business]
          |                              |
          |                              *---1 [Role]
          |
          *---* [Transaction]
          *---* [Notification]
```

## Special Constraints

1. **One-to-One Validation**: Each business can have only one configuration record (BusinessConfig)
2. **Business Context Isolation**: Employee permissions are scoped to specific business contexts
3. **Hierarchical Permissions**: Roles follow a hierarchical structure where higher roles inherit lower permissions
4. **Data Sovereignty**: All data is stored in GunDB ensuring business owners retain control
5. **Schema-Driven Validation**: All entities must conform to Zod schema definitions
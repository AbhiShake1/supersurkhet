# Data Model: SuperSurkhet Super-Dapp/Super-Network Platform

## Core Entities Based on Actual Schemas

### Business
**Description**: Represents a business entity that signs up to the platform (restaurant, gym, petrol pump, etc.)
**Fields** (from businessSchema):
- name (string): Official name of the business
- location (string): Physical address or area of the business (optional)
- basePath (string): Unique URL path for the business (e.g., /my-shop) (optional)
- businessType (string): The primary category of the business (enum: "retail", "food", "service", "education", "healthcare", "logistics", "real_estate", "cooperative", "other", "hotel", "petrol_pump", "gym", "cinema", "financial_firm", "ride_sharing")
- features (record): A map of enabled features for this business (optional)
- isActive (boolean): Whether the business is currently active (default: true)
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- offerings (array): Nested schema items/services offered by this business, using productSchema, menuItemSchema, etc.
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### User
**Description**: Represents an individual who interacts with businesses on the platform
**Fields** (from userSchema):
- email (string): User's email address (required, valid email format)
- password (string): Hashed password for the user (required)
- name (string): Full name of the user (optional)
- avatar (string): URL to user's avatar image (optional, valid URL)
- phone (string): User's contact phone number (optional)
- isActive (boolean): Whether the user account is active (optional, default: true)
- role (string): User role (optional, default: "user")
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- visitedBusinesses (array): References to businesses the user has visited, with visit history details
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### Role
**Description**: Defines permissions and access control for users
**Fields** (from roleSchema):
- name (string): Role name
- permissions (record): Record of permissions enabled for this role (key-value pairs of permission and boolean)
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### Membership
**Description**: Links users to businesses with specific roles
**Fields** (from membershipSchema):
- userId (reference): Reference to the user schema
- businessId (reference): Reference to the business schema
- roleId (reference): Reference to the role schema defining permissions in the business context
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### Base Listing
**Description**: Generalized schema for items/services offered by businesses (used as base for products, menu items, etc.)
**Fields** (from baseListingSchema):
- title (string): Title or name of the listing (required, minimum 1 character)
- description (string): Detailed description (optional)
- price (number): Price of the item/service (required, positive number with coercion)
- category (string): Category of the listing (optional, default: "Others")
- tags (record): Tags associated with the listing (optional, key-value pairs of tag and boolean)
- imageUrl (string): URL of the image (optional, valid URL)
- isFeatured (boolean): Whether the listing is featured (optional)
- isActive (boolean): Whether the listing is active (optional, default: true)
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### Product
**Description**: Specific schema for products offered by businesses
**Fields** (from productSchema):
- title (string): Title or name of the product (required, minimum 1 character)
- description (string): Detailed description (optional)
- price (number): Price of the product (required, positive number with coercion)
- category (string): Category of the product (optional, default: "Others")
- tags (record): Tags associated with the product (optional, key-value pairs of tag and boolean)
- imageUrl (string): URL of the product image (optional, valid URL)
- isFeatured (boolean): Whether the product is featured (optional)
- isActive (boolean): Whether the product is active (optional, default: true)
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- sku (string): Stock Keeping Unit (optional)
- name (string): Name of the item/service (optional)
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### Menu Item
**Description**: Specialized schema for food items on menus
**Fields** (from menuItemSchema):
- title (string): Title or name of the menu item (required, minimum 1 character)
- description (string): Detailed description (optional)
- price (number): Price of the menu item (required, positive number with coercion)
- category (string): Category of the menu item (optional, default: "Others")
- tags (record): Tags associated with the menu item (optional, key-value pairs of tag and boolean)
- imageUrl (string): URL of the menu item image (optional, valid URL)
- isFeatured (boolean): Whether the menu item is featured (optional)
- isActive (boolean): Whether the menu item is active (optional, default: true)
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- sku (string): Stock Keeping Unit (optional)
- name (string): Name of the item/service (optional)
- isVegetarian (boolean): Whether the item is vegetarian (optional, default: false)
- isSpicy (boolean): Whether the item is spicy (optional, default: false)
- isSpecial (boolean): Whether the item is a special (optional)
- preparationTime (number): Time needed to prepare the item (optional, positive integer with coercion)
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### Property Listing
**Description**: Schema for real estate properties
**Fields** (from propertyListingSchema):
- title (string): Title or name of the property (required, minimum 1 character)
- description (string): Detailed description (optional)
- price (number): Price of the property (required, positive number with coercion)
- category (string): Category of the property (optional, default: "Others")
- tags (record): Tags associated with the property (optional, key-value pairs of tag and boolean)
- imageUrl (string): URL of the property image (optional, valid URL)
- isFeatured (boolean): Whether the property is featured (optional)
- isActive (boolean): Whether the property is active (optional, default: true)
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- listingType (enum): Type of listing ("sale" or "rent")
- propertyType (enum): Type of property ("land", "house", "apartment", "commercial")
- size (string): Size of the property (e.g., "1200 sq. ft." or "5 aana")
- amenities (record): Amenities available (optional, key-value pairs of amenity and boolean)
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### Service
**Description**: Schema for services offered by businesses
**Fields** (from serviceSchema):
- title (string): Title or name of the service (required, minimum 1 character)
- description (string): Detailed description (optional)
- price (number): Price of the service (required, positive number with coercion)
- category (string): Category of the service (optional, default: "Others")
- tags (record): Tags associated with the service (optional, key-value pairs of tag and boolean)
- imageUrl (string): URL of the service image (optional, valid URL)
- isFeatured (boolean): Whether the service is featured (optional)
- isActive (boolean): Whether the service is active (optional, default: true)
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- duration (number): Duration of the service in minutes (optional, positive integer with coercion)
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### Order
**Description**: Schema for customer orders
**Fields** (from orderSchema):
- customerId (reference): Reference to the user who placed the order (optional)
- items (record): Ordered items with their details (key-value pairs where value has quantity, unitPrice, customizations, specialInstructions)
- subTotal (number): Subtotal amount (positive number with coercion)
- taxes (number): Tax amount (non-negative number with coercion)
- deliveryFee (number): Delivery fee (non-negative number with coercion)
- totalAmount (number): Total amount including taxes and fees (positive number with coercion)
- orderStatus (enum): Status of the order ("pending", "confirmed", "preparing", "ready", "served", "cancelled")
- paymentStatus (enum): Status of payment ("pending", "paid", "failed")
- paymentMethod (enum): Method of payment ("cash", "card", "online") (optional)
- estimatedDeliveryTime (number): Estimated delivery time in minutes (optional with coercion)
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### Appointment
**Description**: Schema for scheduled appointments
**Fields** (from appointmentSchema):
- customerId (reference): Reference to the customer (required)
- employeeId (reference): Reference to the employee (optional)
- serviceId (reference): Reference to the service (required, from serviceSchema)
- startTime (string): Start time of the appointment (required)
- endTime (string): End time of the appointment (required)
- status (enum): Status of the appointment ("scheduled", "confirmed", "completed", "cancelled", "no_show")
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### Trip
**Description**: Schema for ride-sharing trips
**Fields** (from tripSchema):
- driverId (reference): Reference to the driver (required)
- customerId (reference): Reference to the customer (required)
- startTime (string): Start time of the trip (required)
- endTime (string): End time of the trip (optional)
- startLocation (string): Starting location (required)
- endLocation (string): Ending location (required)
- fare (number): Trip fare (positive number with coercion)
- status (enum): Status of the trip ("requested", "accepted", "in_progress", "completed", "cancelled")
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### Chat Message
**Description**: Schema for chat messages between users
**Fields** (from chatMessageSchema):
- created_by (string): User ID of the creator (optional)
- content (string): Message content (required)
- sender_id (reference): Reference to the sender (required)
- sender_name (string): Name of the sender (required)
- timestamp (number): Unix timestamp of the message (required, integer with coercion)
- delivered (boolean): Whether the message was delivered (optional, default: false)
- read (boolean): Whether the message was read (optional, default: false)
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

### Payment Transaction
**Description**: Schema for payment transactions processed through Fonepay
**Fields** (from paymentTransactionSchema):
- title (string): Title or name of the transaction (required, minimum 1 character)
- description (string): Detailed description (optional)
- price (number): Price of the transaction (required, positive number with coercion)
- category (string): Category of the transaction (optional, default: "Others")
- tags (record): Tags associated with the transaction (optional, key-value pairs of tag and boolean)
- imageUrl (string): URL of the transaction image (optional, valid URL)
- isFeatured (boolean): Whether the transaction is featured (optional)
- isActive (boolean): Whether the transaction is active (optional, default: true)
- created_by (string): User ID of the creator (optional)
- timestamp (number): Unix timestamp of the last update (optional)
- orderId (reference): Reference to the associated order (optional)
- customerId (reference): Reference to the customer who made the payment (optional)
- businessId (reference): Reference to the business receiving the payment (required)
- amount (number): Payment amount in the smallest currency unit (required, positive with coercion)
- currency (string): Three-letter currency code (optional, default: "NPR")
- paymentMethod (enum): Payment method used ("cash", "card", "online", "bank_transfer", "mobile_wallet")
- paymentProvider (string): Payment provider (e.g., Khalti, eSewa, Stripe) (optional)
- transactionId (string): External transaction ID from payment provider (optional)
- status (enum): Current status of the payment ("pending", "processing", "completed", "failed", "refunded", "cancelled") (default: "pending")
- gatewayResponse (string): Raw response from payment gateway (optional)
- refundedAmount (number): Amount refunded (if any, non-negative with coercion, default: 0)
- refundReason (string): Reason for refund (optional)
- metadata (record): Additional metadata about the payment (optional, key-value pairs of string)
- processedAt (string): Timestamp when payment was processed (optional, datetime format)
- completedAt (string): Timestamp when payment was completed (optional, datetime format)
- cancelledAt (string): Timestamp when payment was cancelled (optional, datetime format)
- refundedAt (string): Timestamp when payment was refunded (optional, datetime format)
- failureReason (string): Reason for payment failure (optional)
- ipAddress (string): IP address of the customer making the payment (optional)
- userAgent (string): User agent of the customer making the payment (optional)
- billingAddress (object): Billing address information (optional with fields: name, email, phone, addressLine1, addressLine2, city, state, postalCode, country)
- shippingAddress (object): Shipping address information (optional with fields: name, email, phone, addressLine1, addressLine2, city, state, postalCode, country)
- receiptUrl (string): URL to the payment receipt (optional, valid URL)
- invoiceId (string): ID of the associated invoice (optional)
- subscriptionId (string): ID of the associated subscription (optional)
- notes (string): Internal notes about the payment (optional)
- _ (object): Internal metadata with soul property (added automatically by GunDB as unique identifier)

## Business Type Specific Schemas

### Hotel Schema
**Fields** (extends baseListingSchema):
- roomTypes (record): Available room types (optional, key-value pairs of type and boolean)
- amenities (record): Hotel amenities (optional, key-value pairs of amenity and boolean)
- checkInTime (string): Standard check-in time (optional)
- checkOutTime (string): Standard check-out time (optional)
- cancellationPolicy (string): Cancellation policy details (optional)
- starRating (number): Hotel star rating (1-5, integer, positive)
- numberOfRooms (number): Total number of rooms in the hotel (integer, positive with coercion)
- address (object): Hotel address details (optional with fields: street, city, state, zipCode, country)
- contactInfo (object): Hotel contact information (optional with fields: phone, email, website)
- facilities (record): Hotel facilities and services (optional, key-value pairs of facility and boolean)

### Petrol Pump Schema
**Fields** (extends baseListingSchema):
- fuelTypes (record): Available fuel types and prices (optional, key-value pairs of fuel type and positive number with coercion)
- services (record): Additional services offered (optional, key-value pairs of service and boolean)
- openingHours (string): Opening hours (optional)
- hasRestroom (boolean): Restroom availability (optional, default: false)
- hasFoodCourt (boolean): Food court availability (optional, default: false)
- atmAvailable (boolean): ATM availability (optional, default: false)
- contactInfo (object): Business contact information (optional with fields: phone, email, website)
- address (object): Business address details (optional with fields: street, city, state, zipCode, country)

### Gym Schema
**Fields** (extends baseListingSchema):
- equipment (record): Gym equipment and quantities (optional, key-value pairs of equipment and non-negative integer with coercion)
- membershipPlans (record): Membership plan names and descriptions (optional, key-value pairs of plan name and description)
- classSchedule (record): Class names and schedules (optional, key-value pairs of class name and schedule)
- trainers (record): Trainer names and specializations (optional, key-value pairs of trainer name and specialization)
- amenities (record): Gym amenities (optional, key-value pairs of amenity and boolean)
- contactInfo (object): Business contact information (optional with fields: phone, email, website)
- address (object): Business address details (optional with fields: street, city, state, zipCode, country)

### Cinema Schema
**Fields** (extends baseListingSchema):
- screens (record): Screen names and capacities (optional, key-value pairs of screen name and positive integer with coercion)
- movies (record): Movie titles and showtimes (optional, key-value pairs of movie title and showtime)
- snacks (record): Snack names and prices (optional, key-value pairs of snack name and positive number with coercion)
- showtimes (record): Showtimes and movies (optional, key-value pairs of showtime and movie)
- amenities (record): Cinema amenities (optional, key-value pairs of amenity and boolean)
- contactInfo (object): Business contact information (optional with fields: phone, email, website)
- address (object): Business address details (optional with fields: street, city, state, zipCode, country)

### Financial Firm Schema
**Fields** (extends baseListingSchema):
- services (record): Financial services and descriptions (optional, key-value pairs of service and description)
- products (record): Financial products and details (optional, key-value pairs of product and detail)
- advisors (record): Advisors and specializations (optional, key-value pairs of advisor name and specialization)
- officeHours (string): Office hours (optional)
- appointmentRequired (boolean): Whether appointments are required (optional, default: true)
- contactInfo (object): Business contact information (optional with fields: phone, email, website)
- address (object): Business address details (optional with fields: street, city, state, zipCode, country)
- licensingInfo (object): Business licensing information (optional with fields: licenseNumber, issuingAuthority, expiryDate)
- acceptedPaymentMethods (record): Accepted payment methods (optional, key-value pairs of payment method and boolean)

### Ride Sharing Schema
**Fields** (extends baseListingSchema):
- vehicleTypes (record): Vehicle types and availability (optional, key-value pairs of vehicle type and non-negative integer with coercion)
- pricing (record): Distance ranges and prices (optional, key-value pairs of distance range and positive number with coercion)
- driverProfiles (record): Driver IDs and details (optional, key-value pairs of driver ID and details)
- serviceAreas (record): Service areas coverage (optional, key-value pairs of area and boolean)
- estimatedWaitTime (number): Estimated wait time in minutes (optional, positive integer with coercion)
- contactInfo (object): Business contact information (optional with fields: phone, email, website)
- address (object): Business address details (optional with fields: street, city, state, zipCode, country)
- operatingHours (object): Operating hours by day (optional with fields: monday, tuesday, wednesday, thursday, friday, saturday, sunday)
- cancellationPolicy (string): Cancellation policy details (optional)
- safetyFeatures (record): Safety features offered (optional, key-value pairs of feature and boolean)

### Education Schema
**Fields** (extends baseListingSchema):
- courses (record): Course names and descriptions (optional, key-value pairs of course name and description)
- classSchedule (record): Class names and schedules (optional, key-value pairs of class name and schedule)
- instructors (record): Instructor names and specializations (optional, key-value pairs of instructor name and specialization)
- facilities (record): Facilities and amenities (optional, key-value pairs of facility and boolean)
- enrollmentCapacity (number): Maximum number of students that can be enrolled (optional, non-negative integer with coercion)
- academicYear (string): Academic year or term information (optional)
- admissionRequirements (string): Admission requirements and criteria (optional)

### Healthcare Schema
**Fields** (extends baseListingSchema):
- services (record): Medical services and descriptions (optional, key-value pairs of service and description)
- doctors (record): Doctor names and specializations (optional, key-value pairs of doctor name and specialization)
- departments (record): Department names and descriptions (optional, key-value pairs of department name and description)
- facilities (record): Medical facilities and amenities (optional, key-value pairs of facility and boolean)
- appointmentRequired (boolean): Whether appointments are required (optional, default: true)
- officeHours (string): Office hours (optional)
- emergencyContact (string): Emergency contact number (optional)
- insuranceAccepted (record): Accepted insurance providers (optional, key-value pairs of provider and boolean)

### Real Estate Schema
**Fields** (extends baseListingSchema):
- propertyType (enum): Type of property (optional, "residential", "commercial", "industrial", "land")
- propertyStatus (enum): Current status of the property (optional, "available", "sold", "leased", "under_contract")
- price (number): List price of the property (optional, positive with coercion)
- area (number): Area of the property in square feet (optional, positive with coercion)
- bedrooms (number): Number of bedrooms (optional, non-negative integer with coercion)
- bathrooms (number): Number of bathrooms (optional, non-negative integer with coercion)
- parkingSpaces (number): Number of parking spaces (optional, non-negative integer with coercion)
- yearBuilt (number): Year the property was built (optional, positive integer with coercion)
- features (record): Property features and amenities (optional, key-value pairs of feature and boolean)
- location (object): Property location details (optional with fields: address, city, state, zipCode, country, coordinates)
- agentId (string): ID of the agent responsible for this property (optional)

### Cooperative Schema
**Fields** (extends baseListingSchema):
- memberCount (number): Total number of cooperative members (optional, non-negative integer with coercion)
- shareValue (number): Current value of each share (optional, positive with coercion)
- totalShares (number): Total number of shares issued (optional, non-negative integer with coercion)
- dividendRate (number): Annual dividend rate percentage (optional, non-negative with coercion)
- meetingSchedule (string): Regular meeting schedule information (optional)
- bylaws (string): Cooperative bylaws and regulations (optional)
- boardMembers (record): Board member names and positions (optional, key-value pairs of name and position)
- committees (record): Committee names and descriptions (optional, key-value pairs of committee name and description)
- financialYearEnd (string): End date of the financial year (optional)
- registrationNumber (string): Official registration number (optional)
- governingBody (string): Governing body or authority (optional)

## Relationships

### Business → Listings/Products/MenuItems
- One-to-Many: A business can have multiple listings, products, or menu items
- Implemented as: Listings/Products/MenuItems are nested directly within the Business schema as an offerings array

### User → Business (via Membership)
- Many-to-Many through Membership: A user can belong to multiple businesses with different roles
- Implemented as: Membership schema with references to User, Business, and Role schemas

### User → Orders
- One-to-Many: A user can place multiple orders
- Implemented as: Order.customerId contains a reference to the User schema

### Business → Orders
- One-to-Many: A business can receive multiple orders
- Implemented as: Orders are associated with business through the items they contain

### User → Payment Transactions
- One-to-Many: A user can make multiple payment transactions
- Implemented as: PaymentTransaction.customerId contains a reference to the User schema

### Business → Payment Transactions
- One-to-Many: A business can receive multiple payment transactions
- Implemented as: PaymentTransaction.businessId contains a reference to the Business schema

### General Relationship Implementation
- All references between entities are implemented using GunDB's reference mechanism
- The _.soul property automatically generated by GunDB serves as the unique identifier for all relationships
- For one-to-many relationships, child entities can be nested directly within parent entities
- For many-to-many relationships, junction schemas (like Membership) are used with references to the related entities

## Validation Rules

### Business Entity
- name: Required, minimum 1 character (enforced by schema)
- businessType: Must be one of the predefined business types (enum validation)

### User Entity
- email: Required, must be valid email format (enforced by zod)
- password: Required (enforced by schema)

### Base Listing Entity (and all its extensions)
- title: Required, minimum 1 character (enforced by schema)
- price: Required, must be a positive number with coercion (enforced by zod)

### Payment Transaction Entity
- amount: Required, must be a positive number with coercion (enforced by zod)
- businessId: Required reference to business schema (enforced by schema)
- status: Must be one of predefined values (enum validation)

## State Transitions

### Order Status
- "pending" → "confirmed" (when order is confirmed)
- "confirmed" → "preparing" (when preparation starts)
- "preparing" → "ready" (when prepared)
- "ready" → "served" (when delivered/served)
- Any status → "cancelled" (when order is cancelled)

### Payment Transaction Status
- "pending" → "processing" (when processing starts)
- "processing" → "completed" (on successful payment)
- "processing" → "failed" (on payment failure)
- "completed" → "refunded" (when refunded)
- Any status → "cancelled" (when cancelled)

### Business Status
- "active" → "inactive" (when business closes temporarily)
- "inactive" → "active" (when business reopens)
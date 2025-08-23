# Business Modules Documentation

This document provides comprehensive documentation for all business modules supported by SuperSurkhet.

## Overview

SuperSurkhet supports multiple business types through specialized modules that provide industry-specific functionality while maintaining a consistent user experience. Each module includes:

- **Schema Definitions**: Zod schemas for data validation
- **Admin Components**: Custom admin panel interfaces
- **Client Pages**: Public-facing business interfaces
- **API Endpoints**: Module-specific data operations
- **Business Logic**: Domain-specific workflows
- **Integration Points**: External service connections

## Supported Business Types

### 1. Retail & eCommerce

The Retail & eCommerce module provides comprehensive tools for physical and online stores.

#### Key Features
- Product catalog management
- Inventory tracking
- Point of Sale (POS) system
- Online storefront
- Order management
- Customer management
- Reporting and analytics

#### Schema Structure
```typescript
// Product schema
const productSchema = baseListingSchema.extend({
  sku: z.string().optional().describe("Stock Keeping Unit"),
  imageUrl: z.string().url().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().default(true),
  price: z.number({ coerce: true }).positive(),
  name: z.string().optional(),
});

// Order schema
const orderSchema = z.object({
  customerId: z.string().optional(),
  items: z.record(
    z.string(),
    z.object({
      quantity: z.number({ coerce: true }).int().positive(),
      unitPrice: z.number({ coerce: true }).positive(),
      customizations: z.record(z.string(), z.boolean()).optional(),
      specialInstructions: z.string().optional(),
    }),
  ),
  subTotal: z.number({ coerce: true }).positive(),
  taxes: z.number({ coerce: true }).nonnegative(),
  deliveryFee: z.number({ coerce: true }).nonnegative(),
  totalAmount: z.number({ coerce: true }).positive(),
  orderStatus: z.enum([
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "served",
    "cancelled",
  ]),
  paymentStatus: z.enum(["pending", "paid", "failed"]),
  paymentMethod: z.enum(["cash", "card", "online"]).optional(),
  estimatedDeliveryTime: z.number({ coerce: true }).optional(),
});
```

#### Admin Components
- **Product Management**: Grid view with filtering and bulk actions
- **Order Management**: Kanban board for order status tracking
- **Inventory Dashboard**: Real-time inventory levels and alerts
- **Sales Reports**: Revenue analytics and trend visualization

#### Client Pages
- **Product Catalog**: Responsive grid with search and filtering
- **Shopping Cart**: Interactive cart with quantity adjustments
- **Checkout Flow**: Multi-step checkout with payment options
- **Order Tracking**: Real-time order status updates

### 2. Food & Hospitality

The Food & Hospitality module is designed for restaurants, cafes, and hotels.

#### Key Features
- Digital menu management
- Kitchen Order Ticket (KOT) system
- Table reservation system
- Online ordering
- Delivery management
- Staff scheduling
- Recipe management

#### Schema Structure
```typescript
// Menu Item schema
const menuItemSchema = productSchema.extend({
  isVegetarian: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  isSpecial: z.boolean().optional(),
  preparationTime: z.number({ coerce: true }).int().positive().optional(),
});

// Table schema
const tableSchema = z.object({
  tableNumber: z.string(),
  capacity: z.number({ coerce: true }).int().positive(),
  status: z.enum(["available", "occupied", "reserved", "out_of_service"]),
  location: z.string().optional(),
});

// Reservation schema
const reservationSchema = z.object({
  customerId: z.string(),
  tableId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  partySize: z.number({ coerce: true }).int().positive(),
  specialRequests: z.string().optional(),
  status: z.enum(["pending", "confirmed", "seated", "completed", "cancelled"]),
});
```

#### Admin Components
- **Menu Management**: Visual menu builder with categories
- **Order Kanban**: Real-time order tracking board
- **Table Management**: Interactive floor plan
- **Reservation Calendar**: Booking management interface

#### Client Pages
- **Digital Menu**: Interactive menu with images and descriptions
- **Online Ordering**: Customizable order builder
- **Table Reservation**: Booking system with availability
- **Order Tracking**: Real-time order status updates

### 3. Logistics

The Logistics module supports ride-sharing, delivery, and transportation services.

#### Key Features
- Ride-sharing (Otto auto service)
- Delivery management
- Route optimization
- Driver management
- Vehicle tracking
- Pricing management
- Real-time communication

#### Schema Structure
```typescript
// Driver Profile schema
const driverProfileSchema = z.object({
  userId: z.string().describe("Link to the user schema for this driver"),
  vehicleDetails: z.string().describe("e.g., 'Blue Pulsar 220F'"),
  licensePlate: z.string().describe("Vehicle license plate number"),
  verificationStatus: z.enum(["pending", "verified", "rejected"]),
});

// Trip schema
const tripSchema = z.object({
  driverId: z.string(),
  customerId: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  startLocation: z.string(),
  endLocation: z.string(),
  fare: z.number({ coerce: true }).positive(),
  status: z.enum([
    "requested",
    "accepted",
    "in_progress",
    "completed",
    "cancelled",
  ]),
});
```

#### Admin Components
- **Driver Management**: Driver profiles and verification
- **Trip Tracking**: Real-time trip monitoring
- **Fleet Management**: Vehicle and driver assignment
- **Pricing Dashboard**: Dynamic pricing configuration

#### Client Pages
- **Ride Request**: Simple ride booking interface
- **Driver Tracking**: Real-time driver location
- **Trip History**: Past trips and receipts
- **Driver Ratings**: Feedback and rating system

### 4. ERP (Enterprise Resource Planning)

The ERP module provides integrated business management for larger organizations.

#### Key Features
- Financial management
- Human resources
- Supply chain management
- Project management
- Customer relationship management
- Inventory management
- Reporting and analytics

#### Schema Structure
```typescript
// Employee schema
const employeeSchema = z.object({
  userId: z.string(),
  employeeId: z.string(),
  department: z.string(),
  position: z.string(),
  hireDate: z.date(),
  salary: z.number({ coerce: true }).positive(),
  managerId: z.string().optional(),
});

// Project schema
const projectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]),
  budget: z.number({ coerce: true }).nonnegative(),
  assignedTo: z.array(z.string()).optional(),
});

// Invoice schema
const invoiceSchema = z.object({
  invoiceNumber: z.string(),
  customerId: z.string(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number({ coerce: true }).positive(),
      unitPrice: z.number({ coerce: true }).positive(),
      total: z.number({ coerce: true }).positive(),
    })
  ),
  subtotal: z.number({ coerce: true }).positive(),
  tax: z.number({ coerce: true }).nonnegative(),
  total: z.number({ coerce: true }).positive(),
  dueDate: z.date(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
});
```

#### Admin Components
- **Dashboard**: Executive overview with KPIs
- **Financial Reports**: Revenue, expenses, and profitability
- **HR Management**: Employee records and performance tracking
- **Project Tracking**: Gantt charts and milestone management

#### Client Pages
- **Employee Portal**: Self-service HR functions
- **Customer Portal**: Account management and support
- **Supplier Portal**: Procurement and collaboration
- **Executive Dashboard**: Strategic business insights

### 5. Co-operatives

The Co-operatives module supports member-owned organizations.

#### Key Features
- Member management
- Shareholding tracking
- Meeting management
- Financial reporting
- Voting system
- Document management
- Communication tools

#### Schema Structure
```typescript
// Co-op Member Profile schema
const coOpMemberProfileSchema = z.object({
  userId: z.string().describe("Link to the user schema for this member"),
  membershipNumber: z.string().describe("Official membership number"),
  joinDate: z.date(),
  sharesOwned: z.number({ coerce: true }).int().nonnegative().default(0),
  votingRights: z.boolean().default(true),
});

// Meeting schema
const meetingSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.date(),
  location: z.string(),
  attendees: z.array(z.string()).optional(),
  agenda: z.array(z.string()).optional(),
  minutes: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
});
```

#### Admin Components
- **Member Directory**: Comprehensive member database
- **Share Management**: Shareholding records and transfers
- **Meeting Scheduler**: Calendar-based meeting planning
- **Voting System**: Secure electronic voting platform

#### Client Pages
- **Member Portal**: Personal account and benefits
- **Meeting Portal**: Agenda access and participation
- **Financial Statements**: Transparent financial reporting
- **Document Library**: Shared resources and policies

### 6. Healthcare

The Healthcare module provides tools for clinics, hospitals, and medical practices.

#### Key Features
- Patient management
- Appointment scheduling
- Medical records
- Prescription management
- Billing and insurance
- Teleconsultation
- Lab results tracking

#### Schema Structure
```typescript
// Patient schema
const patientSchema = z.object({
  userId: z.string().optional(),
  patientId: z.string(),
  dateOfBirth: z.date(),
  gender: z.enum(["male", "female", "other"]),
  bloodType: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
  }).optional(),
});

// Medical Record schema
const medicalRecordSchema = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  visitDate: z.date(),
  diagnosis: z.string(),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

// Prescription schema
const prescriptionSchema = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  medication: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  instructions: z.string().optional(),
  issuedDate: z.date(),
  refillCount: z.number({ coerce: true }).int().nonnegative().default(0),
});
```

#### Admin Components
- **Patient Records**: Secure medical record management
- **Appointment Scheduler**: Staff and resource scheduling
- **Prescription Writer**: Digital prescription generation
- **Billing System**: Insurance claims and payment processing

#### Client Pages
- **Patient Portal**: Appointment booking and medical history
- **Teleconsultation**: Video consultation platform
- **Prescription Access**: Digital prescription viewing
- **Health Records**: Personal health information management

### 7. Education

The Education module supports schools, colleges, and training institutions.

#### Key Features
- Student management
- Course catalog
- Class scheduling
- Grade management
- Attendance tracking
- Communication tools
- Resource management

#### Schema Structure
```typescript
// Student Profile schema
const studentProfileSchema = z.object({
  userId: z.string().describe("Link to the user schema for this student"),
  classId: z.string(),
  rollNumber: z.string(),
  enrollmentDate: z.date(),
  parentGuardian: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string().email(),
  }).optional(),
});

// Course schema
const courseSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  credits: z.number({ coerce: true }).int().positive(),
  instructorId: z.string(),
  schedule: z.array(
    z.object({
      day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
      startTime: z.string(),
      endTime: z.string(),
      location: z.string(),
    })
  ).optional(),
});

// Grade schema
const gradeSchema = z.object({
  studentId: z.string(),
  courseId: z.string(),
  assignmentId: z.string().optional(),
  score: z.number({ coerce: true }).nonnegative(),
  maxScore: z.number({ coerce: true }).positive(),
  letterGrade: z.string().optional(),
  comments: z.string().optional(),
  gradedDate: z.date(),
});
```

#### Admin Components
- **Student Information System**: Comprehensive student records
- **Course Management**: Curriculum and scheduling
- **Grade Book**: Assignment and exam grading
- **Attendance Tracker**: Daily attendance recording

#### Client Pages
- **Student Portal**: Course registration and grades
- **Parent Portal**: Student progress monitoring
- **Instructor Portal**: Course management and grading
- **Resource Library**: Educational materials and assignments

### 8. Real Estate

The Real Estate module supports property management and sales.

#### Key Features
- Property listing management
- Client relationship management
- Transaction tracking
- Document management
- Marketing tools
- Commission tracking
- Market analysis

#### Schema Structure
```typescript
// Property Listing schema
const propertyListingSchema = baseListingSchema.extend({
  listingType: z.enum(["sale", "rent"]),
  propertyType: z.enum(["land", "house", "apartment", "commercial"]),
  size: z.string().describe("e.g., '1200 sq. ft.' or '5 aana'"),
  amenities: z.record(z.string(), z.boolean()).optional(),
  bedrooms: z.number({ coerce: true }).int().nonnegative().optional(),
  bathrooms: z.number({ coerce: true }).int().nonnegative().optional(),
  parking: z.number({ coerce: true }).int().nonnegative().optional(),
  yearBuilt: z.number({ coerce: true }).int().positive().optional(),
});

// Client schema
const clientSchema = z.object({
  userId: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string().optional(),
  clientType: z.enum(["buyer", "seller", "renter", "landlord"]),
  preferences: z.object({
    propertyType: z.array(z.string()).optional(),
    budgetRange: z.object({
      min: z.number({ coerce: true }).nonnegative().optional(),
      max: z.number({ coerce: true }).positive().optional(),
    }).optional(),
    locationPreferences: z.array(z.string()).optional(),
  }).optional(),
});
```

#### Admin Components
- **Property Management**: Comprehensive listing system
- **Client Database**: CRM for buyer and seller relationships
- **Transaction Tracker**: Deal pipeline management
- **Commission Calculator**: Automated commission tracking

#### Client Pages
- **Property Search**: Advanced search with filters
- **Virtual Tours**: Interactive property viewing
- **Market Reports**: Local market analysis
- **Client Dashboard**: Personal property tracking

### 9. Financial Services

The Financial Services module supports banks, credit unions, and financial advisors.

#### Key Features
- Client portfolio management
- Product offering management
- Appointment scheduling
- Compliance tracking
- Risk assessment
- Investment tracking
- Reporting

#### Schema Structure
```typescript
// Financial Firm schema
const financialFirmSchema = baseListingSchema.extend({
  services: z.record(z.string(), z.string()).optional()
    .describe("Financial services and descriptions")
    .superRefine(fieldConfig({ fieldType: "record" })),
  products: z.record(z.string(), z.string()).optional()
    .describe("Financial products and details")
    .superRefine(fieldConfig({ fieldType: "record" })),
  advisors: z.record(z.string(), z.string()).optional()
    .describe("Advisors and specializations")
    .superRefine(fieldConfig({ fieldType: "record" })),
  officeHours: z.string().optional().describe("Office hours"),
  appointmentRequired: z.boolean().default(true).optional()
    .describe("Whether appointments are required"),
});

// Client Portfolio schema
const clientPortfolioSchema = z.object({
  clientId: z.string(),
  advisorId: z.string(),
  riskProfile: z.enum(["conservative", "moderate", "aggressive"]),
  investmentGoals: z.array(z.string()).optional(),
  currentHoldings: z.array(
    z.object({
      assetType: z.string(),
      symbol: z.string().optional(),
      name: z.string(),
      quantity: z.number({ coerce: true }),
      purchasePrice: z.number({ coerce: true }).positive(),
      currentValue: z.number({ coerce: true }).positive(),
    })
  ).optional(),
  totalValue: z.number({ coerce: true }).nonnegative(),
  lastUpdated: z.date(),
});
```

#### Admin Components
- **Client Management**: Comprehensive client profiles
- **Portfolio Tracking**: Real-time investment monitoring
- **Compliance Dashboard**: Regulatory requirement tracking
- **Risk Assessment**: Automated risk profiling tools

#### Client Pages
- **Client Portal**: Portfolio viewing and performance
- **Appointment Scheduling**: Advisor booking system
- **Educational Resources**: Financial literacy content
- **Market Insights**: Economic analysis and recommendations

### 10. Fitness & Recreation

The Fitness & Recreation module supports gyms, fitness centers, and recreational facilities.

#### Key Features
- Membership management
- Class scheduling
- Equipment tracking
- Trainer assignment
- Progress tracking
- Payment processing
- Community features

#### Schema Structure
```typescript
// Gym schema
const gymSchema = baseListingSchema.extend({
  equipment: z.record(z.string(), z.number({ coerce: true }).int().nonnegative()).optional()
    .describe("Gym equipment and quantities")
    .superRefine(fieldConfig({ fieldType: "record" })),
  membershipPlans: z.record(z.string(), z.string()).optional()
    .describe("Membership plan names and descriptions")
    .superRefine(fieldConfig({ fieldType: "record" })),
  classSchedule: z.record(z.string(), z.string()).optional()
    .describe("Class names and schedules")
    .superRefine(fieldConfig({ fieldType: "record" })),
  trainers: z.record(z.string(), z.string()).optional()
    .describe("Trainer names and specializations")
    .superRefine(fieldConfig({ fieldType: "record" })),
  amenities: z.record(z.string(), z.boolean()).optional()
    .describe("Gym amenities")
    .superRefine(fieldConfig({ fieldType: "record" })),
});

// Member Progress schema
const memberProgressSchema = z.object({
  memberId: z.string(),
  date: z.date(),
  weight: z.number({ coerce: true }).positive().optional(),
  bodyMeasurements: z.object({
    chest: z.number({ coerce: true }).positive().optional(),
    waist: z.number({ coerce: true }).positive().optional(),
    hips: z.number({ coerce: true }).positive().optional(),
  }).optional(),
  workoutDetails: z.array(
    z.object({
      exercise: z.string(),
      sets: z.number({ coerce: true }).int().positive(),
      reps: z.number({ coerce: true }).int().positive(),
      weight: z.number({ coerce: true }).positive().optional(),
    })
  ).optional(),
  notes: z.string().optional(),
});
```

#### Admin Components
- **Member Management**: Comprehensive membership database
- **Class Scheduler**: Instructor and facility scheduling
- **Equipment Maintenance**: Tracking and maintenance logs
- **Revenue Dashboard**: Membership and class analytics

#### Client Pages
- **Member Portal**: Class booking and schedule
- **Progress Tracking**: Workout logs and measurements
- **Trainer Booking**: Personal training session scheduling
- **Community Forum**: Member interaction and support

### 11. Energy & Utilities

The Energy & Utilities module supports petrol pumps, electricity providers, and utility companies.

#### Key Features
- Fuel price management
- Service tracking
- Customer management
- Inventory management
- Maintenance scheduling
- Billing and payments
- Analytics

#### Schema Structure
```typescript
// Petrol Pump schema
const petrolPumpSchema = baseListingSchema.extend({
  fuelTypes: z.record(z.string(), z.number({ coerce: true }).positive()).optional()
    .describe("Available fuel types and prices")
    .superRefine(fieldConfig({ fieldType: "record" })),
  services: z.record(z.string(), z.boolean()).optional()
    .describe("Additional services offered")
    .superRefine(fieldConfig({ fieldType: "record" })),
  openingHours: z.string().optional().describe("Opening hours"),
  hasRestroom: z.boolean().default(false).optional()
    .describe("Restroom availability"),
  hasFoodCourt: z.boolean().default(false).optional()
    .describe("Food court availability"),
  atmAvailable: z.boolean().default(false).optional()
    .describe("ATM availability"),
});

// Service Record schema
const serviceRecordSchema = z.object({
  customerId: z.string(),
  serviceType: z.string(),
  description: z.string(),
  date: z.date(),
  cost: z.number({ coerce: true }).positive(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  assignedTo: z.string().optional(),
  completionDate: z.date().optional(),
});
```

#### Admin Components
- **Fuel Management**: Real-time price updates
- **Service Tracking**: Customer service management
- **Inventory Control**: Stock level monitoring
- **Maintenance Scheduler**: Preventive maintenance planning

#### Client Pages
- **Fuel Prices**: Current pricing information
- **Service Requests**: Online service booking
- **Account Management**: Billing and payment history
- **Loyalty Program**: Rewards and promotions

### 12. Professional Services

The Professional Services module supports consulting firms, legal practices, and other service-based businesses.

#### Key Features
- Client management
- Project tracking
- Time tracking
- Billing and invoicing
- Document management
- Communication tools
- Resource scheduling

#### Schema Structure
```typescript
// Service schema
const serviceSchema = baseListingSchema.extend({
  duration: z.number({ coerce: true }).int().positive().optional()
    .describe("Duration of the service in minutes"),
  requiredSkills: z.array(z.string()).optional()
    .describe("Skills required to provide this service"),
  prerequisites: z.array(z.string()).optional()
    .describe("Prerequisites for this service"),
});

// Time Entry schema
const timeEntrySchema = z.object({
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  userId: z.string(),
  date: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  duration: z.number({ coerce: true }).positive(),
  description: z.string(),
  billable: z.boolean().default(true),
  billed: z.boolean().default(false),
});
```

#### Admin Components
- **Client Management**: CRM for professional relationships
- **Project Dashboard**: Task and milestone tracking
- **Time Tracking**: Employee time recording and reporting
- **Billing System**: Automated invoice generation

#### Client Pages
- **Client Portal**: Project status and communications
- **Service Catalog**: Available services and descriptions
- **Appointment Scheduling**: Meeting and consultation booking
- **Document Sharing**: Secure file exchange

## Module Development Guidelines

### Schema Design

1. **Extend Base Schemas**: Use `baseListingSchema` as the foundation
2. **Field Documentation**: Provide clear descriptions for all fields
3. **Validation**: Implement appropriate validation rules
4. **Field Configurations**: Use `fieldConfig` for special field types

### Admin Component Design

1. **Consistent UI**: Follow established design patterns
2. **Responsive Layout**: Work on all device sizes
3. **Performance**: Implement lazy loading and pagination
4. **Accessibility**: Ensure WCAG compliance

### Client Page Design

1. **User-Centric**: Focus on end-user experience
2. **Mobile-First**: Optimize for mobile devices
3. **Performance**: Minimize loading times
4. **Intuitive Navigation**: Clear information architecture

### API Design

1. **RESTful Principles**: Follow standard REST conventions
2. **Consistent Naming**: Use clear, descriptive endpoint names
3. **Error Handling**: Provide meaningful error responses
4. **Documentation**: Maintain up-to-date API documentation

### Integration Points

1. **Webhooks**: Implement real-time notifications
2. **Third-Party APIs**: Connect with relevant external services
3. **Data Sync**: Ensure consistent data across integrations
4. **Security**: Secure all integration points

This documentation provides a comprehensive overview of all business modules in SuperSurkhet. Each module is designed to be extensible and customizable to meet specific business needs while maintaining the platform's consistent user experience and technical standards.
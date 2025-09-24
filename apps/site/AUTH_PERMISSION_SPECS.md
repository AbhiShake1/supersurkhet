# Authentication and Permission Management System for SuperSurkhet

## Overview

This document outlines the specifications for a robust, hierarchical authentication and permission management system for SuperSurkhet. The system will support multiple user roles with context-aware permissions, ensuring business owners maintain full control of their data while enabling granular access management.

## System Architecture

### Core Components

1. **User Management System** - Handles user registration, authentication, and profile management
2. **Role-Based Access Control (RBAC)** - Defines roles and their associated permissions
3. **Context-Based Permissions** - Manages permissions within business contexts
4. **Business Hierarchy Management** - Handles relationships between super admins, business owners, and employees

### User Contexts

- **Global Context**: Permissions that apply across the entire platform
- **Business Context**: Permissions that apply within a specific business
- **Feature Context**: Permissions for specific features within a business

## User Roles and Hierarchy

### 1. Super Admin
- Full system access
- Can create and manage business owners
- Can view all businesses and their data
- Can manage platform-wide settings and configurations
- Can override permissions when necessary

### 2. Business Owner
- Full control of their specific business and its data
- Can create and manage employees for their business
- Can define custom roles and permissions within their business
- Can manage business settings and features
- Limited access to platform-wide features

### 3. Employee
- Access determined by business owner
- Permissions are specific to the associated business
- Can have granular feature-level permissions
- Cannot access other businesses' data

### 4. Read-Only User
- Created through standard sign-up process
- Read-only access to public features across the platform
- Limited to viewing public business information
- Cannot modify any data
- Can access their own profile and settings

## Permission System Design

### Hierarchical Permission Structure

```
Super Admin (Global Context)
├── Business Owner (Business Context)
│   ├── Employee (Business Context)
│   │   └── Feature-specific permissions
│   └── Custom Role (Business Context)
└── Read-Only User (Global Context)
```

### Permission Types

#### Global Permissions (Super Admin Only)
- `manage_platform`: Full platform management
- `manage_businesses`: Create and manage businesses
- `manage_admins`: Create and manage other super admins
- `view_all_data`: Access to all platform data

#### Business-Level Permissions (Business Owners)
- `manage_business`: Full control over business settings
- `manage_employees`: Create and manage employees
- `manage_custom_roles`: Create and assign custom roles
- `access_business_data`: Full access to business data
- `manage_business_features`: Enable/disable business features

#### Employee-Level Permissions (Employees)
These permissions are contextual to a specific business and can be granular:

- `view_business_data`: Read access to business data
- `edit_business_data`: Write access to business data
- `manage_inventory`: Inventory-specific permissions
- `handle_orders`: Order management permissions
- `manage_customers`: Customer relationship permissions
- `access_reports`: Reporting and analytics access
- `manage_staff`: Staff management (if supervisor role)

#### Feature-Specific Permissions
Each business feature can have its own permission structure:
- `products:read`, `products:write`, `products:delete`
- `orders:read`, `orders:write`, `orders:delete`
- `customers:read`, `customers:write`, `customers:delete`
- `inventory:read`, `inventory:write`, `inventory:delete`
- `reports:view`, `reports:generate`
- `settings:read`, `settings:write`

### Permission Assignment

1. **Default Roles**: Predefined roles with common permission sets
2. **Custom Roles**: Business owners can create custom roles with specific permissions
3. **Direct Permissions**: Specific permissions can be assigned directly to users
4. **Permission Inheritance**: Permissions flow down the hierarchy but can be restricted

## Authentication System

### Multi-Context Authentication

The system will support authentication in multiple contexts:
- Platform-wide authentication (Google OAuth)
- Business-specific session context
- Role-based access tokens

### User Session Management

- All authentication tokens are session-specific to business context
- Cross-business access requires explicit permission or re-authentication
- Session contexts are maintained separately for each business a user belongs to

## Business Owner Account Creation Process

### By Super Admins
1. Super admin accesses admin panel
2. Selects "Create Business Owner"
3. Provides required business information:
   - Business name and type
   - Business owner contact information
   - Initial business settings
4. System generates invitation link with temporary credentials
5. Business owner receives invitation via email
6. Business owner completes registration, verifies information
7. Account becomes active with full business owner permissions

### By Business Owners (Limited)
- Business owners cannot create other business owner accounts
- This permission is limited to super admins only

## Employee Account Creation Process

### By Business Owners
1. Business owner accesses their business admin panel
2. Selects "Add Employee" in the team management section
3. Provides employee information:
   - Name and contact information
   - Role assignment (default or custom role)
   - Specific permissions if needed
   - Business context (which business they have access to)
4. System sends invitation to employee email
5. Employee completes registration process
6. Employee account is activated with assigned permissions
7. Employee can only access the business they were added to

### Employee Invitation Process
- Invitations are valid for 7 days
- Invitations can be resent if expired
- Invitations can be cancelled before acceptance
- Employee accounts become active only after accepting invitation and completing registration

## Read-Only User Access

### Registration Process
1. User accesses sign-up page
2. Provides basic information (email, name, password)
3. Account is created with "read-only" role by default
4. User has access to public features only

### Permissions for Read-Only Users
- Browse public business information
- View public product listings
- Access public features across businesses
- No data modification capabilities
- Limited to read-only operations
- Can manage their own user profile

### Feature Access for Read-Only Users
- Browse business listings
- View business information
- View product catalogs
- View public announcements
- Access basic features that don't require modification
- Cannot access admin panels or management features
- Cannot access business-specific data that isn't public

## Data Isolation and Security

### Business Data Isolation
- Each business's data is isolated from other businesses
- Employees can only access data related to their assigned businesses
- Business owners can only access their own business data
- Super admins can access all business data (with audit logging)

### Permission Validation
- All access requests are validated against user permissions
- Context validation ensures users can only access appropriate business data
- Permission checks happen at the API layer for all requests
- Client-side permission checks are for UX only, server-side validation is authoritative

### Audit Trail
- All permission-related actions are logged
- Access to sensitive data is audited
- Changes to user permissions are tracked
- Business owner and employee account creation is logged

## Implementation Considerations

### Schema Updates

#### New Schema Objects
- `businessRoleSchema`: Defines business-specific roles
- `permissionSchema`: Defines individual permissions
- `userBusinessAccessSchema`: Links users to businesses with specific permissions

```typescript
// Role schema (enhanced from existing)
export const businessRoleSchema = z.object({
  name: z.string(),
  businessId: z.string(), // Links to specific business
  permissions: z.record(z.string(), z.boolean()), // Permission map
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Permission mapping
export const userBusinessAccessSchema = z.object({
  userId: z.string(),
  businessId: z.string(),
  roleId: z.string().optional(), // Optional, if using custom role
  directPermissions: z.record(z.string(), z.boolean()).optional(), // Direct permissions
  isActive: z.boolean().default(true),
  assignedBy: z.string(), // Who assigned these permissions
  assignedAt: z.string(),
});
```

### API Endpoints

#### Authentication Endpoints
- `POST /api/auth/login` - Platform-wide authentication
- `POST /api/auth/business/{businessId}/switch` - Switch to business context
- `POST /api/auth/logout` - Logout from all contexts

#### Permission Management Endpoints
- `GET /api/permissions` - Get current user's permissions
- `GET /api/businesses/{businessId}/roles` - Get business roles
- `POST /api/businesses/{businessId}/roles` - Create business role
- `PUT /api/businesses/{businessId}/roles/{roleId}` - Update business role
- `POST /api/businesses/{businessId}/employees` - Add employee to business
- `PUT /api/businesses/{businessId}/employees/{userId}` - Update employee permissions
- `DELETE /api/businesses/{businessId}/employees/{userId}` - Remove employee from business

### Frontend Integration

#### Context Provider Enhancement
The existing `AuthProvider` will be enhanced to:
- Track current business context
- Manage business-specific permissions
- Handle context switching between businesses

#### Route Protection
- Enhanced route protection middleware
- Context-aware permission checking
- Business-specific route restrictions

## Integration with Existing System

### GunDB Implementation
- User permissions stored in GunDB
- Business context maintained in user's GunDB profile
- Permission changes propagate through GunDB network
- Decentralized permission validation

### Schema Integration
- New permission schemas added to existing schema system
- Role-based access control integrated with auto-generated admin interfaces
- Business context maintained in existing business schema

This architecture ensures that the authentication and permission system is both robust and flexible enough to support SuperSurkhet's growth while maintaining the decentralized data sovereignty principles.
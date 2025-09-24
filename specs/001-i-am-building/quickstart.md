# Quickstart Guide: SuperSurkhet Super-Dapp/Super-Network Platform

## Overview
This guide will help you get started with the SuperSurkhet platform, a decentralized application that enables business owners to digitize their operations with minimal technical expertise.

## Prerequisites
- Node.js 20.x or higher
- pnpm package manager
- Git
- A Google Cloud Platform account for OAuth setup

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd supersurkhet
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Set Up Environment Variables
Create a `.env.local` file in the `apps/site` directory with the following:
```env
VITE_SENTRY_DSN=<your-sentry-dsn>
VITE_GOOGLE_OAUTH_CLIENT_ID=<your-google-oauth-client-id>
VITE_GOOGLE_LOGIN_BACKDOOR=<your-google-login-backdoor-uuid>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
```

### 4. Start Development Server
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Creating Your First Business

### For Business Owners:
1. Navigate to the platform homepage
2. Click "Sign Up" to create an account (you'll get read-only access initially)
3. Contact support to be upgraded to a business owner account
4. Once approved, click "Create Business" from your dashboard
5. Select your business type (restaurant, gym, etc.)
6. Fill in business details
7. Your business website and admin panel will be automatically generated

### For Super Admins:
1. Access the admin panel at `/admin`
2. Navigate to "Business Management"
3. Click "Create Business Owner Account"
4. Fill in the business owner's details
5. The system will generate an invitation for the business owner

## Using the Schema-Driven UI System

### Auto-Generated Components:
- **AutoAdmin**: Dynamic admin panel based on your business schema
- **AutoTable**: Data tables with sorting and filtering
- **AutoForm**: Forms with validation based on Zod schemas
- **AutoKanban**: Drag-and-drop Kanban boards for workflow management

### Customizing Your Business:
- All UI elements are generated from Zod schemas
- Business owners can customize layout and branding in the settings
- Advanced users can modify schemas for custom data models

## QR/DMX Code Integration

### Generating QR Codes:
1. Go to your business admin panel
2. Navigate to "QR Codes" section
3. Configure the action that should occur when scanned
4. Download the QR code image

### QR Code Capabilities:
- Automatically connect to WiFi (with Expo app)
- Open specific app interfaces
- Share user profile information
- Trigger location-based notifications

## Authentication and Permissions

### User Types:
1. **Super Admin**: Full platform access
2. **Business Owner**: Full access to their business, ability to manage employees
3. **Employee**: Permissions assigned by business owner
4. **Read-Only User**: Public access only

### Adding Employees:
1. Business owners can add employees from the admin panel
2. Assign roles and permissions as needed
3. Employees receive invitations via email
4. Once accepted, they can access the system within the business context

## Payment Integration

### Fonepay Setup:
1. Business owners can configure Fonepay in BusinessConfig
2. Payment settings are encrypted and stored securely
3. Transactions are processed through the integrated Fonepay gateway
4. Transaction history is available in the admin panel

## Mobile Experience

### Progressive Web App:
- The platform works as a PWA on mobile devices
- All functionality is available on mobile
- Offline capability with GunDB synchronization

### Native Mobile Features:
- For enhanced functionality, install the Expo app
- Automatic WiFi connection when scanning QR codes
- Native notifications and device APIs

## Troubleshooting

### Common Issues:
1. **GunDB synchronization problems**: Ensure proper network connectivity; data syncs automatically when connection is restored
2. **OAuth issues**: Verify that your Google OAuth credentials are correctly configured
3. **Schema validation errors**: Check that all required fields are properly filled according to the Zod schema

## Next Steps

1. Explore the different business types to see available features
2. Customize your business schema for specific needs
3. Set up payment processing for your business
4. Generate QR codes for customer interactions
5. Add employees and assign appropriate permissions
6. Monitor analytics to understand customer behavior

## Support

- Documentation: Check the `/docs` directory
- Issue Tracker: Report issues on GitHub
- Community: Join our developer community for support
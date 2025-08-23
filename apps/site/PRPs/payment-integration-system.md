---
document_type: prp
title: Payment Integration System
version: 1.0
author: AI IDE Agent
date: 2025-08-23
status: draft
---

# PRP: Payment Integration System

## Goal

### Feature Goal
Create a comprehensive payment integration system that supports multiple payment providers, with production-ready schemas, custom admin components for payment tracking, and beautiful client pages for payment processing.

### Deliverable
A complete implementation including:
1. Production-ready Zod schema for payment transactions with all necessary fields
2. Custom admin component for payment tracking and management that renders as a tab in the AutoAdmin panel
3. Beautiful, modern client page for payment processing
4. Proper GunDB integration with awareness of graph database limitations
5. Responsive design that works on all device sizes
6. Support for multiple payment providers (Fonepay, eSewa, Khalti, etc.)

### Success Definition
Implementation will be considered successful when:
- The payment schema is properly defined with appropriate fields for transaction management
- The admin component renders correctly in the AutoAdmin panel with functionality for tracking and managing payments
- The client page displays payment options in an intuitive and visually appealing way with secure payment processing
- All components follow the existing code patterns and conventions
- The implementation integrates seamlessly with the existing GunDB data layer
- Performance is optimized and all components are responsive across device sizes
- Code passes all validation checks and follows project standards
- Supports multiple payment providers with a unified interface

## Context

### Documentation
```yaml
existing_codebase_files:
  - file: src/lib/schema.ts
    purpose: Contains all Zod schemas and business type definitions
    relevance: This is where the payment schema will be defined, following the existing pattern
    
  - file: src/components/ui/admin/hotel-management.tsx
    purpose: Example of a custom admin component for hotel schema
    relevance: This pattern will be replicated for the payment admin component
    
  - file: src/components/pages/hotel/hotel-client-page.tsx
    purpose: Example of a client page implementation for the hotel business type
    relevance: This pattern will be replicated for the payment client page with appropriate variations
    
  - file: src/routes/$businessName/index.tsx
    purpose: Main route that determines which client page to render based on business type
    relevance: This file will need to be updated to handle payment processing
    
  - file: src/lib/gun.ts
    purpose: GunDB configuration and initialization
    relevance: Understanding how to properly integrate with the decentralized database

existing_design_system:
  - file: src/components/ui/card.tsx
    purpose: Core card component used throughout the application
    relevance: Should be used as the base for content display in both admin and client components
    
  - file: src/components/ui/button.tsx
    purpose: Primary button component with variants
    relevance: Should be used for all CTAs in both admin and client components
    
  - file: src/components/ui/tabs.tsx
    purpose: Tab component used in admin panel
    relevance: Understanding how tabs work in the AutoAdmin implementation

existing_animations:
  - file: src/components/hero-section.tsx
    purpose: Contains Earth globe and other animated elements
    relevance: Study animation implementations for consistency in client pages

existing_styling:
  - file: src/styles.css
    purpose: Global styles and design system
    relevance: Must follow existing color palette, typography, and spacing
```

### Existing Code Patterns
1. Use of Zod schemas with `withMeta` and `withLabel` helpers for field descriptions
2. Schema extension pattern using `.extend(table)` to include common fields
3. Custom component registration in schema definitions using async components function
4. Admin component pattern that receives slug as prop and renders custom UI
5. Client page pattern that receives slug and renders business-specific UI
6. Use of AutoForm for automatic form generation from schemas
7. Use of AutoTable for automatic table generation from schemas
8. Consistent use of Lucide React icons throughout the application
9. Responsive design with Tailwind classes
10. Component composition pattern with clear separation of concerns

### Gotchas
1. **GunDB Limitations**: GunDB is a graph database that has limitations with arrays. Instead of storing arrays directly, we should use records/maps with boolean values to represent collections.
2. **Performance**: Animations should be optimized and not block the main thread. Prefer transform and opacity changes for better performance.
3. **Schema Consistency**: All schemas should extend the base `table` schema to include common fields like `created_by`, `timestamp`, and `_`.
4. **Async Component Loading**: Custom admin components are loaded asynchronously, so they must be properly exported and imported.
5. **Field Configurations**: Use `fieldConfig` to specify special field types like `image`, `record`, etc.
6. **Type Safety**: All components must maintain proper TypeScript typing for better developer experience and fewer runtime errors.
7. **Mobile Responsiveness**: All components must work beautifully on mobile devices with proper touch interactions.
8. **Dark Mode**: All components must support dark mode with appropriate styling.
9. **Security**: Payment processing must follow strict security standards and never expose sensitive information.

### Current State
The current implementation includes:
1. A core schema system with Zod schemas for various business entities
2. Some existing payment-related code in src/lib/payment/
3. Basic expenseSchema that could be enhanced for payment tracking
4. AutoAdmin panel that automatically renders tabs for schemas with custom components

The problem identified is that we need a comprehensive payment integration system that supports multiple providers and provides both admin and client interfaces.

### Dependencies
1. Zod for schema definition
2. GunDB for data storage
3. Tailwind CSS for styling
4. Lucide React for icons
5. Existing Card, Button, Tabs, and other UI components
6. AutoForm, AutoTable for automatic UI generation
7. React Query for data fetching
8. Payment provider SDKs (Fonepay, eSewa, Khalti, etc.)

### Environment Variables
New environment variables will be required for payment provider configurations:
- FONEPAY_MERCHANT_CODE
- FONEPAY_SECRET_KEY
- ESEWA_MERCHANT_ID
- ESEWA_SECRET_KEY
- KHALTI_PUBLIC_KEY
- KHALTI_SECRET_KEY

## Implementation Blueprint

### Phase 1: Schema Development
```yaml
task_1_create_payment_schema:
  title: Create Payment Schema
  description: Define comprehensive Zod schema for payment transactions
  files:
    - src/lib/schema.ts
  details: |
    - Create paymentTransactionSchema with fields:
      * transactionId (string) - Unique transaction identifier
      * businessId (string) - ID of the business
      * customerId (string) - ID of the customer (if applicable)
      * amount (number) - Transaction amount
      * currency (string) - Currency code (NPR)
      * paymentMethod (enum) - Payment method used (fonepay, esewa, khalti, cash, card)
      * paymentProvider (enum) - Payment provider (Fonepay, eSewa, Khalti)
      * status (enum) - Transaction status (pending, completed, failed, refunded)
      * referenceId (string) - Provider reference ID
      * createdAt (string) - Timestamp of creation
      * completedAt (string) - Timestamp of completion
      * refundedAt (string) - Timestamp of refund (if applicable)
      * description (string) - Transaction description
      * metadata (object) - Additional transaction data
    - Add proper field descriptions and labels
    - Ensure it's properly registered in featureSchema
    - Add validation where appropriate

task_2_enhance_expense_schema:
  title: Enhance Expense Schema for Payment Tracking
  description: Add payment-related fields to the existing expense schema
  files:
    - src/lib/schema.ts
  details: |
    - Enhance the existing expenseSchema with payment-related fields:
      * paymentTransactionId (string) - Link to payment transaction
      * paymentStatus (enum) - Payment status for the expense
      * vendorPaymentInfo (object with vendor payment details)
    - Add proper field descriptions and labels
    - Ensure it's properly registered in featureSchema
```

### Phase 2: Payment Provider Integration
```yaml
task_3_implement_fonepay_integration:
  title: Implement Fonepay Payment Integration
  description: Create Fonepay payment provider integration
  files:
    - src/lib/payment/fonepay.ts
  details: |
    - Enhance existing Fonepay integration
    - Implement payment request generation
    - Implement payment verification
    - Implement refund processing
    - Add proper error handling
    - Add logging and monitoring

task_4_implement_esewa_integration:
  title: Implement eSewa Payment Integration
  description: Create eSewa payment provider integration
  files:
    - src/lib/payment/esewa.ts
  details: |
    - Create eSewa payment provider integration
    - Implement payment request generation
    - Implement payment verification
    - Implement refund processing
    - Add proper error handling
    - Add logging and monitoring

task_5_implement_khalti_integration:
  title: Implement Khalti Payment Integration
  description: Create Khalti payment provider integration
  files:
    - src/lib/payment/khalti.ts
  details: |
    - Create Khalti payment provider integration
    - Implement payment request generation
    - Implement payment verification
    - Implement refund processing
    - Add proper error handling
    - Add logging and monitoring

task_6_create_payment_service:
  title: Create Unified Payment Service
  description: Create a unified service that handles all payment providers
  files:
    - src/lib/payment/index.ts
  details: |
    - Create PaymentService class that abstracts payment provider differences
    - Implement provider selection logic
    - Implement common payment operations
    - Add proper error handling and fallback mechanisms
    - Add logging and monitoring
```

### Phase 3: Admin Component Development
```yaml
task_7_create_payment_admin_component:
  title: Create Payment Admin Component
  description: Create a custom admin component for payment management
  files:
    - src/components/ui/admin/payment-management.tsx
    - src/lib/schema.ts
  details: |
    - Create PaymentManagement component following the HotelManagement pattern
    - Include sections for:
      * Transaction overview and statistics
      * Transaction list with filtering and sorting
      * Transaction details view
      * Refund processing
      * Payment provider status monitoring
      * Reporting and analytics
    - Register component in paymentTransactionSchema components function
    - Ensure proper TypeScript typing
    - Use existing UI components (Card, Button, Tabs, etc.)
    - Implement proper form validation
```

### Phase 4: Client Page Development
```yaml
task_8_create_payment_client_page:
  title: Create Payment Client Page
  description: Create a beautiful client page for payment processing
  files:
    - src/components/pages/payment/payment-client-page.tsx
    - src/routes/$businessName/index.tsx
  details: |
    - Create PaymentClientPage component following the HotelClientPage pattern
    - Include sections for:
      * Payment method selection
      * Secure payment form
      * Transaction status tracking
      * Payment history
      * Receipt generation
      * Refund request submission
    - Implement responsive design for all screen sizes
    - Add smooth animations and transitions
    - Ensure dark mode compatibility
    - Implement proper security measures
    - Add proper error handling and user feedback
```

### Phase 5: Integration and Testing
```yaml
task_9_update_autoadmin_integration:
  title: Update AutoAdmin Integration
  description: Ensure the new admin component properly integrates with AutoAdmin
  files:
    - src/components/auto-admin/index.tsx
    - src/lib/schema.ts
  details: |
    - Verify that the component loading mechanism works for the paymentTransaction schema
    - Test that tabs are properly rendered for schemas with custom components
    - Ensure proper error handling for component loading
    - Verify that the tab system works correctly with the new component

task_10_implement_data_validation:
  title: Implement Data Validation
  description: Add proper validation and error handling for the payment schema
  files:
    - src/lib/schema.ts
  details: |
    - Add custom validation where needed for payment specific requirements
    - Implement proper error messages for validation failures
    - Test schema validations with various data inputs
    - Ensure GunDB compatibility with all field types

task_11_performance_optimization:
  title: Performance Optimization
  description: Optimize all new components for performance and responsiveness
  files:
    - All new component files
  details: |
    - Implement React.memo where appropriate
    - Optimize animations to prevent jank
    - Ensure proper lazy loading for images
    - Test performance on various devices
    - Optimize data fetching patterns
    - Optimize payment processing performance

task_12_security_implementation:
  title: Implement Security Features
  description: Ensure all payment components are secure
  files:
    - All new component files
  details: |
    - Implement proper input sanitization
    - Ensure secure communication with payment providers
    - Implement proper authentication checks
    - Add proper encryption for sensitive data
    - Implement proper error handling without exposing sensitive information
    - Add security headers and CSP policies
```

## Validation

### Level 1: Syntax and Type Checking
```bash
# Run TypeScript compiler to check for type errors
pnpm tsc --noEmit

# Run Biome formatter to ensure code style consistency
pnpm biome format --write src/lib/schema.ts src/lib/payment/*.ts src/components/ui/admin/payment-management.tsx src/components/pages/payment/payment-client-page.tsx

# Run Biome linter to catch potential issues
pnpm biome lint src/lib/schema.ts src/lib/payment/*.ts src/components/ui/admin/payment-management.tsx src/components/pages/payment/payment-client-page.tsx
```

### Level 2: Component Unit Tests
```bash
# Run existing test suite to ensure no regressions
pnpm test

# If specific tests are added for new components, run them
# pnpm test src/components/ui/admin/payment-management.test.tsx
# pnpm test src/components/pages/payment/payment-client-page.test.tsx
# pnpm test src/lib/payment/*.test.ts
```

### Level 3: Integration Testing
```bash
# Start development server to test integration
pnpm dev

# Manual checks:
# 1. The payment schema is properly defined and exported
# 2. Admin component renders correctly in AutoAdmin panel
# 3. Client page renders correctly for payment processing
# 4. Data flows properly between components and GunDB
# 5. All animations work smoothly
# 6. Responsive design works on all screen sizes
# 7. Dark mode styling is correct
# 8. Accessibility features work properly
# 9. Payment providers integrate correctly
```

### Level 4: End-to-End Testing
```bash
# If E2E tests exist, run them to ensure no regressions
# pnpm test:e2e

# Manual end-to-end checks:
# 1. Create a business with payment capabilities
# 2. Verify admin component renders in the panel
# 3. Test all functionality in admin component
# 4. Visit client page for payment processing
# 5. Verify all client page features work correctly
# 6. Test payment processing with all providers
# 7. Test refund processing
# 8. Test on multiple browsers and devices
# 9. Check performance in Chrome DevTools
# 10. Verify accessibility with screen reader
```

## Additional Context

### Security Considerations
1. Ensure any user-generated content is properly sanitized
2. Validate all inputs if accepting user data
3. Follow existing security patterns in the codebase
4. Ensure no sensitive data is exposed in client pages
5. Implement proper authentication checks for admin components
6. Ensure payment data is properly secured and encrypted
7. Implement proper PCI DSS compliance measures
8. Use secure communication channels with payment providers
9. Implement proper rate limiting to prevent abuse
10. Add proper logging and monitoring for security events

### Testing Strategies
1. Unit test component rendering with different props
2. Test form validation and submission
3. Verify responsive design breakpoints
4. Test accessibility features with automated tools
5. Performance test animations and transitions
6. Cross-browser compatibility testing
7. Test GunDB integration with various data scenarios
8. Test error handling and edge cases
9. Test payment processing with all providers
10. Test refund and cancellation scenarios
11. Test failure scenarios and proper error handling
12. Test security measures and penetration testing

### Monitoring and Logging
1. Add error boundaries around new components
2. Log any client-side errors to Sentry
3. Monitor performance metrics in production
4. Track user interactions with new features
5. Implement proper analytics for business metrics
6. Monitor payment processing success rates
7. Monitor payment provider status and performance
8. Add alerts for payment failures and security events

### Performance Optimization
1. Use React.memo for components where appropriate
2. Implement code splitting for large dependencies
3. Optimize images and illustrations
4. Use CSS containment where beneficial
5. Defer non-critical animations
6. Implement proper lazy loading for images
7. Optimize data fetching with React Query
8. Minimize re-renders with useCallback and useMemo
9. Optimize payment processing performance
10. Implement proper caching for payment provider status
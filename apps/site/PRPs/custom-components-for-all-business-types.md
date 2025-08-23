---
document_type: prp
title: Custom Components for All Business Types
version: 1.0
author: AI IDE Agent
date: 2025-08-23
status: draft
---

# PRP: Custom Components for All Business Types

## Goal

### Feature Goal
Create a comprehensive system of custom components for all business types that automatically render as tabs in the admin panel and as beautiful, intuitive client pages. Each business type should have production-ready schemas with custom admin components and sleek, modern client interfaces that feel premium and thoughtfully designed.

### Deliverable
A complete implementation including:
1. Production-ready Zod schemas for 15+ business types (restaurants, retail stores, ride sharing, schools, hotels, petrol pumps, gyms, cinemas, financial firms, cooperatives, etc.)
2. Custom admin components that render as additional tabs in the AutoAdmin panel for each business type
3. Beautiful, modern client pages for each business type with intuitive UX that requires no learning curve
4. Consistent design language following Bruno Simon's premium aesthetic principles
5. Proper GunDB integration with awareness of graph database limitations

### Success Definition
Implementation will be considered successful when:
- All 15+ business types have properly defined schemas with appropriate fields
- Each business type has at least one custom admin component that renders as a tab in the AutoAdmin panel
- Client pages for each business type are visually stunning, intuitive, and require no user training
- All components follow the existing code patterns and conventions
- The implementation integrates seamlessly with the existing GunDB data layer
- Performance is optimized and all components are responsive across device sizes
- Code passes all validation checks and follows project standards

## Context

### Documentation
```yaml
existing_codebase_files:
  - file: src/lib/schema.ts
    purpose: Contains all Zod schemas and business type definitions
    relevance: This is where all new schemas and components will be defined, following the menuItem pattern
    
  - file: src/components/ui/admin/menu-management.tsx
    purpose: Example of a custom admin component for menuItem schema
    relevance: This pattern will be replicated for all business types to create custom admin components
    
  - file: src/components/ui/admin/order-kanban.tsx
    purpose: Example of another custom admin component using AutoKanban
    relevance: Shows how to create more complex admin components with different UI patterns
    
  - file: src/components/auto-admin/index.tsx
    purpose: Main AutoAdmin component that renders tabs based on schema components
    relevance: Understanding how the tab system works to integrate new components properly
    
  - file: src/components/pages/restaurant/restaurant-client-page.tsx
    purpose: Example of a client page implementation for the food business type
    relevance: This pattern will be replicated for all other business types with appropriate variations
    
  - file: src/routes/$businessName/index.tsx
    purpose: Main route that determines which client page to render based on business type
    relevance: This file will need to be updated to handle all new business types
    
  - file: src/lib/gun.ts
    purpose: GunDB configuration and initialization
    relevance: Understanding how to properly integrate with the decentralized database
    
  - file: src/components/ui/autoform/AutoForm.tsx
    purpose: AutoForm implementation that generates forms from Zod schemas
    relevance: Understanding how field configurations work and how to customize form fields

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
    
  - file: src/components/ui/text-effect.tsx
    purpose: Text animation components
    relevance: Reference for animation patterns and performance

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
8. Use of AutoKanban for Kanban board views
9. Consistent use of Lucide React icons throughout the application
10. Responsive design with Tailwind classes
11. Component composition pattern with clear separation of concerns

### Gotchas
1. **GunDB Limitations**: GunDB is a graph database that has limitations with arrays. Instead of storing arrays directly, we should use records/maps with boolean values to represent collections. For example, instead of `tags: string[]`, we use `tags: z.record(z.string(), z.boolean()).optional()`.
2. **Performance**: Animations should be optimized and not block the main thread. Prefer transform and opacity changes for better performance.
3. **Schema Consistency**: All schemas should extend the base `table` schema to include common fields like `created_by`, `timestamp`, and `_`.
4. **Async Component Loading**: Custom admin components are loaded asynchronously, so they must be properly exported and imported.
5. **Field Configurations**: Use `fieldConfig` to specify special field types like `image`, `record`, etc.
6. **Type Safety**: All components must maintain proper TypeScript typing for better developer experience and fewer runtime errors.
7. **Mobile Responsiveness**: All components must work beautifully on mobile devices with proper touch interactions.
8. **Dark Mode**: All components must support dark mode with appropriate styling.

### Current State
The current implementation includes:
1. A core schema system with Zod schemas for various business entities
2. A menuItem schema with a custom MenuManagement admin component
3. An order schema with a custom OrderKanban admin component
4. A restaurant client page implementation
5. A basic business type enum with limited options
6. AutoAdmin panel that automatically renders tabs for schemas with custom components
7. Routing system that directs to appropriate client pages based on business type

The problem identified is that we only have implementations for a few business types, and we need to expand this to cover all the business types mentioned in the requirements with production-ready schemas and beautiful interfaces.

### Dependencies
1. Zod for schema definition
2. GunDB for data storage
3. Tailwind CSS for styling
4. Framer Motion for animations
5. Lucide React for icons
6. Existing Card, Button, Tabs, and other UI components
7. AutoForm, AutoTable, AutoKanban for automatic UI generation
8. React Query for data fetching

### Environment Variables
No new environment variables required for this feature.

## Implementation Blueprint

### Phase 1: Schema Definition and Extension
```yaml
task_1_define_additional_business_types:
  title: Define Additional Business Types in Schema
  description: Extend the businessType enum to include all required business types
  files:
    - src/lib/schema.ts
  details: |
    - Add new business types to the businessSchema enum:
      * "retail" (already exists)
      * "food" (already exists)
      * "service" (already exists)
      * "education" (already exists)
      * "healthcare" (already exists)
      * "logistics" (already exists)
      * "real_estate" (already exists)
      * "cooperative" (already exists)
      * "other" (already exists)
      * "hotel"
      * "petrol_pump"
      * "gym"
      * "cinema"
      * "financial_firm"
      * "ride_sharing"
    - Ensure all business types are properly typed

task_2_create_hotel_schema:
  title: Create Hotel Business Schema
  description: Define a comprehensive schema for hotel businesses
  files:
    - src/lib/schema.ts
  details: |
    - Create hotelSchema extending baseListingSchema
    - Include fields for:
      * roomTypes (record of room type names to availability)
      * amenities (record of amenity names to boolean)
      * checkInTime (string)
      * checkOutTime (string)
      * cancellationPolicy (string)
      * starRating (number 1-5)
      * locationDetails (object with address, coordinates, etc.)
    - Add proper field descriptions and labels
    - Extend with table schema
    - Register in featureSchema

task_3_create_petrol_pump_schema:
  title: Create Petrol Pump Business Schema
  description: Define a comprehensive schema for petrol pump businesses
  files:
    - src/lib/schema.ts
  details: |
    - Create petrolPumpSchema extending baseListingSchema
    - Include fields for:
      * fuelTypes (record of fuel type names to prices)
      * services (record of service names to boolean)
      * openingHours (string)
      * hasRestroom (boolean)
      * hasFoodCourt (boolean)
      * atmAvailable (boolean)
    - Add proper field descriptions and labels
    - Extend with table schema
    - Register in featureSchema

task_4_create_gym_schema:
  title: Create Gym Business Schema
  description: Define a comprehensive schema for gym businesses
  files:
    - src/lib/schema.ts
  details: |
    - Create gymSchema extending baseListingSchema
    - Include fields for:
      * equipment (record of equipment names to quantity)
      * membershipPlans (record of plan names to details)
      * classSchedule (record of class names to schedule)
      * trainers (record of trainer names to details)
      * amenities (record of amenity names to boolean)
    - Add proper field descriptions and labels
    - Extend with table schema
    - Register in featureSchema

task_5_create_cinema_schema:
  title: Create Cinema Business Schema
  description: Define a comprehensive schema for cinema businesses
  files:
    - src/lib/schema.ts
  details: |
    - Create cinemaSchema extending baseListingSchema
    - Include fields for:
      * screens (record of screen names to capacity)
      * movies (record of movie titles to showtimes)
      * snacks (record of snack names to prices)
      * showtimes (record of times to movies)
      * amenities (record of amenity names to boolean)
    - Add proper field descriptions and labels
    - Extend with table schema
    - Register in featureSchema

task_6_create_financial_firm_schema:
  title: Create Financial Firm Business Schema
  description: Define a comprehensive schema for financial firm businesses
  files:
    - src/lib/schema.ts
  details: |
    - Create financialFirmSchema extending baseListingSchema
    - Include fields for:
      * services (record of service names to descriptions)
      * products (record of product names to details)
      * advisors (record of advisor names to specializations)
      * officeHours (string)
      * appointmentRequired (boolean)
    - Add proper field descriptions and labels
    - Extend with table schema
    - Register in featureSchema

task_7_create_ride_sharing_schema:
  title: Create Ride Sharing Business Schema
  description: Define a comprehensive schema for ride sharing businesses
  files:
    - src/lib/schema.ts
  details: |
    - Create rideSharingSchema extending baseListingSchema
    - Include fields for:
      * vehicleTypes (record of vehicle type names to availability)
      * pricing (record of distance ranges to prices)
      * driverProfiles (record of driver IDs to details)
      * serviceAreas (record of area names to coverage)
      * estimatedWaitTime (number)
    - Add proper field descriptions and labels
    - Extend with table schema
    - Register in featureSchema

task_8_create_service_business_schema:
  title: Create Service Business Schema
  description: Enhance the existing service schema with more comprehensive fields
  files:
    - src/lib/schema.ts
  details: |
    - Enhance serviceSchema with additional fields:
      * serviceCategories (record of category names to boolean)
      * appointmentSystem (boolean)
      * walkInAllowed (boolean)
      * serviceAreas (record of area names to boolean)
      * certifications (record of certification names to boolean)
    - Add proper field descriptions and labels
    - Ensure it's properly registered in featureSchema
```

### Phase 2: Admin Component Development
```yaml
task_9_create_hotel_admin_component:
  title: Create Hotel Admin Component
  description: Create a custom admin component for hotel management
  files:
    - src/components/ui/admin/hotel-management.tsx
    - src/lib/schema.ts
  details: |
    - Create HotelManagement component following the MenuManagement pattern
    - Include sections for:
      * Room type management with availability controls
      * Amenities management
      * Booking calendar view
      * Revenue statistics
    - Register component in hotelSchema components function
    - Ensure proper TypeScript typing
    - Use existing UI components (Card, Button, Tabs, etc.)

task_10_create_petrol_pump_admin_component:
  title: Create Petrol Pump Admin Component
  description: Create a custom admin component for petrol pump management
  files:
    - src/components/ui/admin/petrol-pump-management.tsx
    - src/lib/schema.ts
  details: |
    - Create PetrolPumpManagement component following the MenuManagement pattern
    - Include sections for:
      * Fuel price management
      * Inventory tracking
      * Sales reporting
      * Service management
    - Register component in petrolPumpSchema components function
    - Ensure proper TypeScript typing
    - Use existing UI components (Card, Button, Tabs, etc.)

task_11_create_gym_admin_component:
  title: Create Gym Admin Component
  description: Create a custom admin component for gym management
  files:
    - src/components/ui/admin/gym-management.tsx
    - src/lib/schema.ts
  details: |
    - Create GymManagement component following the MenuManagement pattern
    - Include sections for:
      * Membership management
      * Class schedule management
      * Equipment maintenance tracking
      * Trainer assignment
    - Register component in gymSchema components function
    - Ensure proper TypeScript typing
    - Use existing UI components (Card, Button, Tabs, etc.)

task_12_create_cinema_admin_component:
  title: Create Cinema Admin Component
  description: Create a custom admin component for cinema management
  files:
    - src/components/ui/admin/cinema-management.tsx
    - src/lib/schema.ts
  details: |
    - Create CinemaManagement component following the MenuManagement pattern
    - Include sections for:
      * Movie scheduling
      * Showtime management
      * Ticket sales tracking
      * Concession inventory
    - Register component in cinemaSchema components function
    - Ensure proper TypeScript typing
    - Use existing UI components (Card, Button, Tabs, etc.)

task_13_create_financial_firm_admin_component:
  title: Create Financial Firm Admin Component
  description: Create a custom admin component for financial firm management
  files:
    - src/components/ui/admin/financial-firm-management.tsx
    - src/lib/schema.ts
  details: |
    - Create FinancialFirmManagement component following the MenuManagement pattern
    - Include sections for:
      * Client portfolio management
      * Product offering management
      * Appointment scheduling
      * Compliance tracking
    - Register component in financialFirmSchema components function
    - Ensure proper TypeScript typing
    - Use existing UI components (Card, Button, Tabs, etc.)

task_14_create_ride_sharing_admin_component:
  title: Create Ride Sharing Admin Component
  description: Create a custom admin component for ride sharing management
  files:
    - src/components/ui/admin/ride-sharing-management.tsx
    - src/lib/schema.ts
  details: |
    - Create RideSharingManagement component following the MenuManagement pattern
    - Include sections for:
      * Driver management
      * Vehicle tracking
      * Ride history and analytics
      * Pricing management
    - Register component in rideSharingSchema components function
    - Ensure proper TypeScript typing
    - Use existing UI components (Card, Button, Tabs, etc.)

task_15_update_autoadmin_integration:
  title: Update AutoAdmin Integration for New Components
  description: Ensure all new admin components properly integrate with AutoAdmin
  files:
    - src/components/auto-admin/index.tsx
    - src/lib/schema.ts
  details: |
    - Verify that the component loading mechanism works for all new schemas
    - Test that tabs are properly rendered for schemas with custom components
    - Ensure proper error handling for component loading
    - Verify that the tab system works correctly with multiple components
```

### Phase 3: Client Page Development
```yaml
task_16_create_hotel_client_page:
  title: Create Hotel Client Page
  description: Create a beautiful client page for hotel businesses
  files:
    - src/components/pages/hotel/hotel-client-page.tsx
    - src/routes/$businessName/index.tsx
  details: |
    - Create HotelClientPage component following the RestaurantClientPage pattern
    - Include sections for:
      * Hero section with hotel images
      * Room type showcase with filtering
      * Amenities gallery
      * Booking form with calendar
      * Location map
      * Reviews section
    - Implement responsive design for all screen sizes
    - Add smooth animations and transitions
    - Ensure dark mode compatibility
    - Update the business route to handle hotel business type

task_17_create_petrol_pump_client_page:
  title: Create Petrol Pump Client Page
  description: Create a beautiful client page for petrol pump businesses
  files:
    - src/components/pages/petrol-pump/petrol-pump-client-page.tsx
    - src/routes/$businessName/index.tsx
  details: |
    - Create PetrolPumpClientPage component following the RestaurantClientPage pattern
    - Include sections for:
      * Fuel price display with real-time updates
      * Services offered
      * Location and directions
      * Loyalty program information
      * Contact information
    - Implement responsive design for all screen sizes
    - Add smooth animations and transitions
    - Ensure dark mode compatibility
    - Update the business route to handle petrol pump business type

task_18_create_gym_client_page:
  title: Create Gym Client Page
  description: Create a beautiful client page for gym businesses
  files:
    - src/components/pages/gym/gym-client-page.tsx
    - src/routes/$businessName/index.tsx
  details: |
    - Create GymClientPage component following the RestaurantClientPage pattern
    - Include sections for:
      * Class schedule with filtering
      * Membership plans with pricing
      * Equipment showcase
      * Trainer profiles
      * Location and facilities tour
    - Implement responsive design for all screen sizes
    - Add smooth animations and transitions
    - Ensure dark mode compatibility
    - Update the business route to handle gym business type

task_19_create_cinema_client_page:
  title: Create Cinema Client Page
  description: Create a beautiful client page for cinema businesses
  files:
    - src/components/pages/cinema/cinema-client-page.tsx
    - src/routes/$businessName/index.tsx
  details: |
    - Create CinemaClientPage component following the RestaurantClientPage pattern
    - Include sections for:
      * Now showing movies with trailers
      * Showtime schedule
      * Ticket booking system
      * Concession menu
      * Upcoming releases
    - Implement responsive design for all screen sizes
    - Add smooth animations and transitions
    - Ensure dark mode compatibility
    - Update the business route to handle cinema business type

task_20_create_financial_firm_client_page:
  title: Create Financial Firm Client Page
  description: Create a beautiful client page for financial firm businesses
  files:
    - src/components/pages/financial-firm/financial-firm-client-page.tsx
    - src/routes/$businessName/index.tsx
  details: |
    - Create FinancialFirmClientPage component following the RestaurantClientPage pattern
    - Include sections for:
      * Services offered with descriptions
      * Financial products
      * Advisor profiles
      * Appointment booking system
      * Educational resources
    - Implement responsive design for all screen sizes
    - Add smooth animations and transitions
    - Ensure dark mode compatibility
    - Update the business route to handle financial firm business type

task_21_create_ride_sharing_client_page:
  title: Create Ride Sharing Client Page
  description: Create a beautiful client page for ride sharing businesses
  files:
    - src/components/pages/ride-sharing/ride-sharing-client-page.tsx
    - src/routes/$businessName/index.tsx
  details: |
    - Create RideSharingClientPage component following the RestaurantClientPage pattern
    - Include sections for:
      * Ride booking form with location services
      * Estimated pricing
      * Driver tracking map
      * Ride history
      * Loyalty program
    - Implement responsive design for all screen sizes
    - Add smooth animations and transitions
    - Ensure dark mode compatibility
    - Update the business route to handle ride sharing business type

task_22_create_generic_client_page:
  title: Create Generic Client Page for Other Business Types
  description: Create a generic but beautiful client page for unimplemented business types
  files:
    - src/components/pages/generic/generic-client-page.tsx
    - src/routes/$businessName/index.tsx
  details: |
    - Create GenericClientPage component as a fallback for all other business types
    - Include sections for:
      * Business information display
      * Service/product showcase
      * Contact information
      * Location map
      * Booking/appointment system
    - Implement responsive design for all screen sizes
    - Add smooth animations and transitions
    - Ensure dark mode compatibility
    - Update the business route to handle all other business types
```

### Phase 4: Integration and Testing
```yaml
task_23_integrate_all_business_types_in_routing:
  title: Integrate All Business Types in Routing
  description: Update the business route to handle all new business types
  files:
    - src/routes/$businessName/index.tsx
  details: |
    - Add cases for all new business types in the switch statement
    - Ensure proper fallback to generic client page for unimplemented types
    - Test all business type routing
    - Verify proper 404 handling for non-existent businesses

task_24_implement_data_validation:
  title: Implement Data Validation for All Schemas
  description: Add proper validation and error handling for all new schemas
  files:
    - src/lib/schema.ts
  details: |
    - Add custom validation where needed for business-specific requirements
    - Implement proper error messages for validation failures
    - Test all schema validations with various data inputs
    - Ensure GunDB compatibility with all field types

task_25_performance_optimization:
  title: Performance Optimization for All Components
  description: Optimize all new components for performance and responsiveness
  files:
    - All new component files
  details: |
    - Implement React.memo where appropriate
    - Optimize animations to prevent jank
    - Ensure proper lazy loading for images
    - Test performance on various devices
    - Optimize data fetching patterns

task_26_accessibility_implementation:
  title: Implement Accessibility Features
  description: Ensure all new components are accessible
  files:
    - All new component files
  details: |
    - Add proper ARIA labels and roles
    - Ensure keyboard navigation works properly
    - Implement focus management
    - Test with screen readers
    - Ensure color contrast meets accessibility standards
```

## Validation

### Level 1: Syntax and Type Checking
```bash
# Run TypeScript compiler to check for type errors
pnpm tsc --noEmit

# Run Biome formatter to ensure code style consistency
pnpm biome format --write src/lib/schema.ts src/components/ui/admin/*.tsx src/components/pages/*/*.tsx src/routes/$businessName/index.tsx

# Run Biome linter to catch potential issues
pnpm biome lint src/lib/schema.ts src/components/ui/admin/*.tsx src/components/pages/*/*.tsx src/routes/$businessName/index.tsx
```

### Level 2: Component Unit Tests
```bash
# Run existing test suite to ensure no regressions
pnpm test

# If specific tests are added for new components, run them
# pnpm test src/components/ui/admin/hotel-management.test.tsx
# pnpm test src/components/pages/hotel/hotel-client-page.test.tsx
```

### Level 3: Integration Testing
```bash
# Start development server to test integration
pnpm dev

# Manual checks:
# 1. All new schemas are properly defined and exported
# 2. Admin components render correctly in AutoAdmin panel
# 3. Client pages render correctly for each business type
# 4. Data flows properly between components and GunDB
# 5. All animations work smoothly
# 6. Responsive design works on all screen sizes
# 7. Dark mode styling is correct
# 8. Accessibility features work properly
```

### Level 4: End-to-End Testing
```bash
# If E2E tests exist, run them to ensure no regressions
# pnpm test:e2e

# Manual end-to-end checks:
# 1. Create businesses of each new type
# 2. Verify admin components render in the panel
# 3. Test all functionality in admin components
# 4. Visit client pages for each business type
# 5. Verify all client page features work correctly
# 6. Test on multiple browsers and devices
# 7. Check performance in Chrome DevTools
# 8. Verify accessibility with screen reader
```

## Additional Context

### Security Considerations
1. Ensure any user-generated content is properly sanitized
2. Validate all inputs if accepting user data
3. Follow existing security patterns in the codebase
4. Ensure no sensitive data is exposed in client pages
5. Implement proper authentication checks for admin components

### Testing Strategies
1. Unit test component rendering with different props
2. Test form validation and submission
3. Verify responsive design breakpoints
4. Test accessibility features with automated tools
5. Performance test animations and transitions
6. Cross-browser compatibility testing
7. Test GunDB integration with various data scenarios
8. Test error handling and edge cases

### Monitoring and Logging
1. Add error boundaries around new components
2. Log any client-side errors to Sentry
3. Monitor performance metrics in production
4. Track user interactions with new features
5. Implement proper analytics for business metrics

### Performance Optimization
1. Use React.memo for components where appropriate
2. Implement code splitting for large dependencies
3. Optimize images and illustrations
4. Use CSS containment where beneficial
5. Defer non-critical animations
6. Implement proper lazy loading for images
7. Optimize data fetching with React Query
8. Minimize re-renders with useCallback and useMemo
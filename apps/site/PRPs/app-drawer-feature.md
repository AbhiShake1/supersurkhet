---
document_type: prp
title: App Drawer Feature
version: 1.0
author: AI IDE Agent
date: 2025-09-26
status: draft
---

# PRP: App Drawer Feature

## Goal

### Feature Goal
Create a comprehensive app drawer feature that functions as a centralized launcher for all business applications within the SuperSurkhet ecosystem, with support for grouping, search, customization, and offline functionality. The app drawer will serve as the primary interface for users to access various business applications, replacing the current business listing approach with a more launcher-like experience similar to Android's Pixel launcher.

### Deliverable
A complete implementation including:
1. A new `/apps` route with app drawer UI featuring grid and list view options
2. App grid/list display with search, sorting, and filtering capabilities
3. Drag-and-drop functionality to create app groups/folders with touch support
4. Settings panel (credenza) for customizing grid appearance (columns, icon size)
5. Integration with existing business data via `api.business.useGet()`
6. Proper offline caching using service workers for app drawer and accessed pages
7. Persistence of user preferences and folder organization in GunDB with localStorage fallback
8. Responsive design supporting both desktop and mobile interactions

### Success Definition
Implementation will be considered successful when:
- The app drawer displays all businesses as app icons with proper icons and fallbacks
- Users can search, sort, and filter apps effectively
- Drag-and-drop functionality works seamlessly on both desktop and mobile for grouping apps
- Settings panel allows customization of grid appearance with proper persistence
- Offline caching works for app drawer and accessed business pages
- User preferences and folder organization persist across sessions and devices
- All components follow existing codebase patterns and conventions
- Performance is optimized and all components are responsive across device sizes
- Code passes all validation checks and follows project standards
- The feature integrates seamlessly with existing authentication and data layers

## Context

### Documentation
```yaml
existing_codebase_files:
  - file: src/lib/schema.ts
    purpose: Contains all Zod schemas and business type definitions
    relevance: This is where the business schema is defined with the new icon field that will be used in the app drawer
    details: The businessSchema now includes an icon field that will be used for app icons with proper base64 encoding

  - file: src/components/business-list.tsx
    purpose: Current implementation of business listing
    relevance: This provides the base implementation pattern for fetching and displaying business data that will be transformed for the app drawer
    details: Will be referenced for the api.business.useGet() pattern and business filtering logic
    
  - file: src/components/ui/credenza.tsx
    purpose: Modal/drawer component used for settings and forms
    relevance: This will be used for the settings panel in the app drawer
    details: Provides consistent mobile/desktop modal experience using Dialog/Drawer based on screen size
    
  - file: src/components/ui/kanban.tsx
    purpose: Implementation of drag-and-drop features using dnd-kit
    relevance: This provides the pattern for implementing app grouping functionality
    details: Contains full implementation of dnd-kit with touch, mouse, and keyboard support
    
  - file: src/routes/__root.tsx
    purpose: Root route configuration with global context setup
    relevance: Will need to include the new /apps route and maintain context for app drawer
    details: Contains authentication and GunDB context that will be available in the app drawer
    
  - file: src/components/ui/card.tsx
    purpose: Core card component used throughout the application
    relevance: May be used as base for app cards in the app drawer
    details: Consistent design system component that follows project styling
    
  - file: src/components/ui/button.tsx
    purpose: Primary button component with variants
    relevance: Will be used for various actions in the app drawer
    details: Follows consistent design system and has loading states

libraries_and_dependencies:
  - name: @dnd-kit/core
    purpose: Core drag-and-drop functionality
    relevance: Will be used for implementing app grouping and reordering capabilities
    url: https://npm.im/@dnd-kit/core
    
  - name: @dnd-kit/sortable
    purpose: Sortable drag-and-drop utilities
    relevance: Will be used for drag-and-drop in the app drawer
    url: https://npm.im/@dnd-kit/sortable
    
  - name: @dnd-kit/modifiers
    purpose: Drag-and-drop modifiers for constraints
    relevance: Will be used for drag constraints and restrictions
    url: https://npm.im/@dnd-kit/modifiers
    
  - name: @dnd-kit/utilities
    purpose: Utility functions for dnd-kit
    relevance: Will be used for CSS transforms and other utilities
    url: https://npm.im/@dnd-kit/utilities

existing_patterns_to_follow:
  - pattern: Schema-driven UI with Zod schemas
    example_file: src/lib/schema.ts
    description: All data models are defined as Zod schemas with proper typing and validation
    
  - pattern: AutoAdmin component structure
    example_file: src/components/auto-admin/index.tsx
    description: Components are built with proper TypeScript typing and integration patterns
    
  - pattern: Route structure
    example_file: src/routes/__root.tsx
    description: Routes are defined using TanStack Router with proper context and authentication
    
  - pattern: Component architecture
    example_file: src/components/business-list.tsx
    description: Components follow React patterns with proper state management and data fetching
    
  - pattern: UI component patterns
    example_file: src/components/ui/credenza.tsx
    description: UI components are built with accessibility and responsive design in mind
    gotchas_and_considerations:
  - consideration: GunDB data persistence
    description: User preferences and folder organization need to be stored in GunDB for cross-device sync
    solution: Implement proper GunDB structure with fallback to localStorage for non-logged-in users
    
  - consideration: Mobile touch drag-and-drop
    description: Drag-and-drop needs to work effectively on touch devices
    solution: Use existing dnd-kit patterns that already support mobile from kanban implementation
    
  - consideration: Offline caching
    description: App drawer and accessed business pages should work offline
    solution: Leverage existing service worker implementation in public/sw.js to cache app drawer pages
    
  - consideration: Icon handling
    description: Business icons are stored as base64 and need fallback mechanisms
    solution: Implement proper base64 to image conversion with Lucide icon fallbacks
    
  - consideration: Performance with many apps
    description: App drawer should remain responsive with many business apps
    solution: Implement virtualization or proper rendering optimizations for large numbers of apps
```

### External Research
```yaml
similar_implementations:
  - name: Android App Drawer
    description: Standard app launcher interface with search and grouping
    url: https://www.android.com/
    relevance: Primary inspiration for the desired user experience
    
  - name: Google Pixel Launcher
    description: Clean, efficient app launcher with frequently used apps
    url: https://store.google.com/product/pixel/
    relevance: Reference for the desired clean and efficient UI
    
  - name: Progressive Web Apps with Web App Manifest
    description: PWA implementations that work as app launchers
    url: https://web.dev/progressive-web-apps/
    relevance: Shows how web-based app launchers can work effectively
    
  - name: React Drag and Drop Libraries
    description: Implementation patterns for drag-and-drop in React
    url: https://dndkit.com/
    relevance: Best practices for implementing drag-and-drop in React applications

best_practices:
  - practice: Touch-First Drag and Drop
    description: Ensure drag-and-drop works effectively on touch devices
    source: dnd-kit documentation
    url: https://docs.dndkit.com/
    
  - practice: Progressive Enhancement
    description: Core functionality works without JavaScript, enhanced with JS
    source: Web platform best practices
    url: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
    
  - practice: Accessibility
    description: Ensure all functionality is accessible to users with disabilities
    source: WCAG guidelines
    url: https://www.w3.org/WAI/standards-guidelines/wcag/
    
  - practice: Offline First
    description: Design for offline use with network as enhancement
    source: Offline First movement
    url: https://offlinefirst.org/

common_pitfalls:
  - pitfall: Poor touch drag-and-drop experience
    description: Drag-and-drop not optimized for touch interfaces
    solution: Use proper activation constraints and touch-specific sensors
    
  - pitfall: Performance issues with large datasets
    description: Slow rendering when many apps are present
    solution: Implement virtualization or rendering optimizations
    
  - pitfall: Inconsistent cross-device experience
    description: User settings not persisting across devices
    solution: Properly implement GunDB persistence with localStorage fallback
    
  - pitfall: Inadequate offline support
    description: App drawer not working when offline
    solution: Proper service worker caching implementation
```

## Implementation Blueprint

### Phase 1: Route and Basic App Drawer UI
```yaml
task_1_create_apps_route:
  title: Create /apps route
  description: Create the main route for the app drawer feature
  files:
    - src/routes/apps/index.tsx
    - src/routes/apps/__root.tsx (if needed)
  details: |
    - Create new route at /apps to host the app drawer
    - Set up proper TanStack Router configuration
    - Ensure route has access to necessary context (auth, GunDB)
    - Implement basic layout structure
    - Include navigation back to home if needed

task_2_create_app_drawer_component:
  title: Create App Drawer Component
  description: Create the main app drawer UI component
  files:
    - src/components/app-drawer/index.tsx
  details: |
    - Fetch business data using api.business.useGet()
    - Transform business data to app format with {name, icon, description}
    - Implement grid layout with responsive columns
    - Add loading and error states
    - Include search functionality
    - Sort apps alphabetically by default
```

### Phase 2: Search, Sorting and Icon Handling
```yaml
task_3_implement_app_search:
  title: Implement App Search
  description: Add search functionality to filter apps
  files:
    - src/components/app-drawer/index.tsx
  details: |
    - Add search input field with clear functionality
    - Filter apps by name, business type, and location
    - Implement keyboard accessibility for search
    - Show clear search button when text is entered

task_4_implement_icon_handling:
  title: Implement Icon Handling
  description: Handle business icons with proper fallbacks
  files:
    - src/components/app-drawer/index.tsx
    - src/lib/utils.ts (new utility functions)
  details: |
    - Convert base64 business icons to image elements
    - Implement Lucide icon fallback when business icon is missing
    - Handle image loading errors gracefully
    - Optimize icon rendering for performance
```

### Phase 3: Drag-and-Drop Grouping Feature
```yaml
task_5_implement_app_grouping:
  title: Implement App Grouping
  description: Add drag-and-drop functionality to create app groups
  files:
    - src/components/app-drawer/grouping.tsx (new component)
    - src/components/app-drawer/index.tsx
  details: |
    - Use dnd-kit to implement drag-and-drop grouping
    - Create visual feedback when dragging apps over each other
    - Generate folder when app is dropped onto another app
    - Support both desktop and mobile touch interactions
    - Show folder icons for grouped apps
    - Implement proper collision detection and drop handling

task_6_persistence_for_groups:
  title: Implement Group Persistence
  description: Save group organization to GunDB with localStorage fallback
  files:
    - src/lib/gun.ts
    - src/components/app-drawer/grouping.tsx
  details: |
    - Create GunDB structure for storing app groups
    - Implement localStorage fallback for non-authenticated users
    - Handle data synchronization between devices
    - Add proper error handling for persistence operations
```

### Phase 4: Settings and Customization
```yaml
task_7_create_settings_panel:
  title: Create Settings Panel
  description: Implement settings panel for app drawer customization
  files:
    - src/components/app-drawer/settings.tsx
    - src/components/app-drawer/index.tsx
  details: |
    - Create settings panel using Credenza component
    - Add options for number of apps per row
    - Add option for icon size
    - Add toggle for grid/list view
    - Implement state management for settings
    - Persist settings to GunDB with localStorage fallback

task_8_implement_grid_list_toggle:
  title: Implement Grid/List Toggle
  description: Add option to switch between grid and list views
  files:
    - src/components/app-drawer/index.tsx
    - src/components/app-drawer/app-grid.tsx (new component)
    - src/components/app-drawer/app-list.tsx (new component)
  details: |
    - Create separate components for grid and list views
    - Implement toggle switch in the UI
    - Store view preference in settings
    - Ensure both views have proper responsive behavior
```

### Phase 5: Offline Support and Performance
```yaml
task_9_enhance_service_worker:
  title: Enhance Service Worker for Offline Support
  description: Update service worker to properly cache app drawer pages
  files:
    - public/sw.js
    - src/routes/apps/index.tsx
  details: |
    - Update cache strategy to include app drawer routes
    - Ensure business pages accessed from app drawer are cached
    - Test offline functionality works properly
    - Implement proper cache invalidation when needed

task_10_performance_optimization:
  title: Performance Optimization
  description: Optimize app drawer performance for many apps
  files:
    - src/components/app-drawer/index.tsx
    - src/components/app-drawer/app-grid.tsx
  details: |
    - Implement React.memo for app components where appropriate
    - Optimize rendering with proper keys and virtualization if needed
    - Lazy load icons and images
    - Optimize drag-and-drop performance
    - Test with large numbers of apps
```

### Phase 6: Integration and Testing
```yaml
task_11_integrate_with_expo_app:
  title: Integrate with Expo App
  description: Ensure app drawer works as initial route in Android Expo app
  files:
    - src/routes/__root.tsx
    - package.json (Android specific changes if needed)
  details: |
    - Update initial route configuration for Android
    - Ensure all context providers are available
    - Test app drawer as initial route in Expo environment
    - Add any necessary Android-specific optimizations

task_12_comprehensive_testing:
  title: Comprehensive Testing
  description: Test all functionality and edge cases
  files:
    - All new files created for the app drawer
  details: |
    - Test drag-and-drop functionality on mobile and desktop
    - Verify offline caching works correctly
    - Test icon handling with and without business icons
    - Validate settings persistence works properly
    - Ensure all accessibility requirements are met
    - Test with various numbers of apps
```

## Validation

### Level 1: Syntax and Type Checking
```bash
# Run TypeScript compiler to check for type errors
pnpm tsc --noEmit

# Run Biome formatter to ensure code style consistency
pnpm biome format --write src/routes/apps/**/* src/components/app-drawer/**/*

# Run Biome linter to catch potential issues
pnpm biome lint src/routes/apps/**/* src/components/app-drawer/**/*
```

### Level 2: Component Unit Tests
```bash
# Run existing test suite to ensure no regressions
pnpm test

# If specific tests are added for new components, run them
# pnpm test src/components/app-drawer/index.test.tsx
```

### Level 3: Integration Testing
```bash
# Start development server to test integration
pnpm dev

# Manual checks:
# 1. The app drawer route renders correctly at /apps
# 2. Business data is properly fetched and transformed
# 3. Search functionality works as expected
# 4. Drag-and-drop grouping works on both desktop and mobile
# 5. Settings panel properly customizes the app drawer
# 6. Data persists correctly in GunDB and localStorage
# 7. All animations work smoothly
# 8. Responsive design works on all screen sizes
# 9. Dark mode styling is correct
# 10. Accessibility features work properly
```

### Level 4: End-to-End Testing
```bash
# If E2E tests exist, run them to ensure no regressions
# pnpm test:e2e

# Manual end-to-end checks:
# 1. Navigate to /apps route and verify app drawer displays
# 2. Search for apps and verify filtering works
# 3. Drag apps to create groups and verify persistence
# 4. Adjust settings and verify customization
# 5. Test offline functionality for app drawer and business pages
# 6. Test on multiple browsers and devices
# 7. Check performance in Chrome DevTools
# 8. Verify accessibility with screen reader
# 9. Test initial route in Expo Android environment
# 10. Verify data synchronization across devices
```

## Additional Context

### Security Considerations
1. Ensure user preferences and group organization are properly scoped to individual users
2. Validate all inputs if accepting user data for app group names
3. Follow existing security patterns in the codebase
4. Ensure no sensitive data is exposed in client components
5. Implement proper authentication checks where needed
6. Ensure app data is properly secured
7. Add proper rate limiting to prevent abuse of grouping functionality
8. Implement proper logging and monitoring for security events

### Testing Strategies
1. Unit test component rendering with different app data
2. Test drag-and-drop functionality with various scenarios
3. Verify responsive design breakpoints work properly
4. Test accessibility features with automated tools
5. Performance test with large numbers of apps
6. Cross-browser compatibility testing
7. Test GunDB integration with various data scenarios
8. Test error handling and edge cases
9. Test offline functionality and service worker behavior
10. Test touch-specific interactions on mobile devices
11. Test keyboard navigation and accessibility
12. Test data persistence across devices and sessions

### Monitoring and Logging
1. Add error boundaries around new components
2. Log any client-side errors to Sentry
3. Monitor performance metrics in production
4. Track user interactions with new features
5. Implement proper analytics for app usage
6. Monitor drag-and-drop performance
7. Add alerts for persistence failures
8. Add alerts for performance degradation

### Performance Optimization
1. Use React.memo for app components where appropriate
2. Implement virtualization for large numbers of apps if needed
3. Optimize icon rendering and loading
4. Use CSS containment where beneficial
5. Defer non-critical animations
6. Implement proper lazy loading for images
7. Optimize data fetching with React Query
8. Minimize re-renders with useCallback and useMemo
9. Optimize drag-and-drop performance with proper constraints
10. Implement proper caching for app data
11. Optimize service worker caching strategy
12. Implement proper pagination for large datasets if needed
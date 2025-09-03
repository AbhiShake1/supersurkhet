---
document_type: prp
title: DataMatrix QR System Implementation
version: 1.0
author: AI IDE Agent
date: 2025-09-03
status: draft
---

# PRP: DataMatrix QR System Implementation

## Goal

### Feature Goal
Create a revolutionary DataMatrix-based interaction system that enables bidirectional communication between physical objects and digital services. This system will allow business owners to visually build complex interaction flows and generate DataMatrix codes that end users can scan to trigger sophisticated workflows across all business types.

The system will enable scenarios where a single scan can trigger incredibly sophisticated workflows while maintaining a responsive user experience through progressive action execution.

### Deliverable
A complete implementation including:
1. Production-ready Zod schema for DataMatrix actions with support for complex bidirectional interactions
2. Powerful visual flow builder admin component that allows business owners to create any interaction flow
3. Beautiful, modern client page for the DataMatrix scanner with support for both QR and DataMatrix formats
4. DataMatrix generation and scanning capabilities with progressive action execution
5. Integration with existing GunDB data layer for decentralized data management
6. Route at `/feature/qr` to showcase the DataMatrix builder and scanner

### Success Definition
Implementation will be considered successful when:
- The DataMatrix schema supports all discussed action types including bidirectional communication
- The visual flow builder allows creation of complex interaction sequences without coding
- The scanner works reliably with both QR codes and DataMatrix formats
- Progressive action execution works seamlessly with proper state management
- The system integrates with existing authentication and data layers
- Performance is optimized and all components are responsive across device sizes
- Code passes all validation checks and follows project standards
- The `/feature/qr` route provides a complete showcase of the system capabilities
- Business owners can create sophisticated DataMatrix interactions equivalent to enterprise applications

## Context

### Documentation
```yaml
existing_codebase_files:
  - file: src/lib/schema.ts
    purpose: Contains all Zod schemas and business type definitions
    relevance: This is where the DataMatrix schema will be defined, following the existing pattern
    
  - file: src/components/ui/admin/menu-management.tsx
    purpose: Example of a custom admin component with visual interface
    relevance: This pattern will be replicated for the DataMatrix flow builder with enhanced capabilities
    
  - file: src/components/ui/qr-code.tsx
    purpose: Existing QR code generation component
    relevance: Will be extended to support DataMatrix generation
    
  - file: src/components/pages/restaurant/restaurant-client-page.tsx
    purpose: Example of a client page implementation
    relevance: This pattern will be replicated for the DataMatrix scanner page
  
  - file: src/routes/__root.tsx
    purpose: Root route with global context setup
    relevance: Authentication and GunDB context will be available for DataMatrix actions

libraries_and_dependencies:
  - name: @yudiel/react-qr-scanner
    purpose: Existing QR scanning library
    relevance: Will be used for scanning functionality with potential extension for DataMatrix
    url: https://npm.im/@yudiel/react-qr-scanner
    
  - name: @barcode-bakery/barcode-datamatrix
    purpose: DataMatrix generation library
    relevance: Will be used for generating DataMatrix codes
    url: https://npm.im/@barcode-bakery/barcode-datamatrix
    
  - name: react-datamatrix-svg
    purpose: React component for DataMatrix rendering
    relevance: Alternative option for DataMatrix visualization
    url: https://npm.im/react-datamatrix-svg

existing_patterns_to_follow:
  - pattern: Schema-driven UI with Zod schemas
    example_file: src/lib/schema.ts
    description: All data models are defined as Zod schemas with proper typing and validation
    
  - pattern: AutoAdmin component structure
    example_file: src/components/auto-admin/index.tsx
    description: Admin panels are built using the AutoAdmin component with tabs for different views
    
  - pattern: Custom admin components
    example_file: src/components/ui/admin/menu-management.tsx
    description: Complex admin interfaces are implemented as custom components that integrate with AutoAdmin
    
  - pattern: Client page implementation
    example_file: src/components/pages/restaurant/restaurant-client-page.tsx
    description: Client-facing pages are implemented as React components with proper state management
    
  - pattern: Route structure
    example_file: src/routes/__root.tsx
    description: Routes are defined using TanStack Router with proper context and authentication
  
gotchas_and_considerations:
  - consideration: DataMatrix size limitations
    description: DataMatrix can only hold a limited amount of data, so we need smart payload design with references
    solution: Use templates and references rather than storing everything in the DataMatrix
    
  - consideration: Progressive action execution
    description: Complex workflows need to be executed progressively to maintain good UX
    solution: Implement state machine for action execution with proper loading states
    
  - consideration: Bidirectional communication
    description: The system needs to both read from and write to DataMatrix codes
    solution: Implement action definitions that can request data from users
    
  - consideration: Context awareness
    description: Actions should be context-aware based on user profile and environment
    solution: Leverage existing authentication context and device APIs
    
  - consideration: Security and privacy
    description: User data collection must be secure and respect privacy
    solution: Implement proper consent flows and data encryption where needed
```

### External Research
```yaml
similar_implementations:
  - name: QR Code Action Systems
    description: Systems that use QR codes to trigger actions
    url: https://en.wikipedia.org/wiki/QR_code#Uses
    relevance: Provides foundation for understanding action-based QR systems
    
  - name: Progressive Web Apps with QR Integration
    description: PWA implementations that use QR codes for enhanced experiences
    url: https://web.dev/progressive-web-apps/
    relevance: Shows how to create seamless web-based QR experiences
    
  - name: No-Code Workflow Builders
    description: Visual tools for creating complex workflows without coding
    url: https://zapier.com/
    relevance: Inspiration for the visual flow builder interface
    
best_practices:
  - practice: Payload Optimization
    description: Minimize data stored in codes by using references
    source: DataMatrix specification standards
    url: https://en.wikipedia.org/wiki/Data_Matrix#Storage_types
    
  - practice: Error Handling
    description: Graceful handling of scanning errors and invalid codes
    source: Barcode scanning best practices
    url: https://barcode.software/resources/best-practices/
    
  - practice: Accessibility
    description: Ensure scanning interfaces work for users with disabilities
    source: WCAG guidelines
    url: https://www.w3.org/WAI/standards-guidelines/wcag/
    
  - practice: Security
    description: Protect user data and prevent malicious code execution
    source: OWASP security guidelines
    url: https://owasp.org/www-project-top-ten/
    
common_pitfalls:
  - pitfall: Overloading codes with data
    description: Storing too much data in codes leads to scanning difficulties
    solution: Use references and progressive loading
    
  - pitfall: Poor error handling
    description: Not handling scanning errors gracefully degrades user experience
    solution: Implement comprehensive error states and recovery options
    
  - pitfall: Ignoring accessibility
    description: Scanning interfaces that don't work for all users limit adoption
    solution: Follow accessibility guidelines and test with assistive technologies
```

## DataMatrix Action Schemas

The power of the DataMatrix system lies in its sophisticated action schemas that enable complex interactions through a single scan. These schemas define complete interaction blueprints that can adapt based on context, user profile, and real-time conditions.

### Core Action Schema Structure

The foundational schema structure supports all the powerful capabilities we've discussed:

```json
{
  "version": "1.0",
  "action": "wifi_connect_and_navigate",
  "wifi": {
    "ssid": "GymWiFi_Pro",
    "password": "AES256:encrypted_password_here",
    "security": "WPA2"
  },
  "navigation": {
    "url": "https://supersurkhet.com/gym/profile",
    "params": {
      "auto_login": true,
      "user_context": "from_device_id"
    }
  },
  "post_connect": {
    "notification": {
      "title": "Welcome to FitLife Gym",
      "message": "Your session is active. Scan equipment for workout guidance."
    }
  }
}
```

### Profile Request with Conditional Logic

Sophisticated conditional logic enables personalized experiences:

```json
{
  "version": "1.0",
  "action": "profile_enrichment",
  "checks": [
    {
      "field": "emergency_contact",
      "required": true,
      "if_missing": {
        "type": "form_request",
        "schema": {
          "title": "Emergency Contact Required",
          "fields": [
            {
              "name": "emergency_name",
              "type": "string",
              "required": true,
              "label": "Emergency Contact Name"
            },
            {
              "name": "emergency_phone",
              "type": "phone",
              "required": true,
              "label": "Emergency Contact Phone"
            }
          ]
        }
      }
    },
    {
      "field": "fitness_goals",
      "required": false,
      "if_missing": {
        "type": "choice_selection",
        "options": [
          {"value": "weight_loss", "label": "Weight Loss"},
          {"value": "muscle_gain", "label": "Muscle Building"},
          {"value": "endurance", "label": "Cardio Endurance"},
          {"value": "flexibility", "label": "Flexibility"}
        ],
        "multiple": true
      }
    }
  ],
  "on_complete": {
    "type": "navigate",
    "url": "/gym/dashboard",
    "message": "Profile updated successfully!"
  }
}
```

### Equipment Access with Session Management

Complex multi-step interactions with state management:

```json
{
  "version": "1.0",
  "action": "equipment_session",
  "equipment": {
    "id": "treadmill_001",
    "type": "cardio",
    "location": "floor_2_section_a"
  },
  "session": {
    "duration": 30,
    "max_duration": 60,
    "extendable": true
  },
  "user_validation": {
    "membership_required": true,
    "min_fitness_level": "beginner"
  },
  "actions": {
    "on_start": {
      "type": "equipment_control",
      "command": "activate",
      "parameters": {
        "user_id": "from_context",
        "session_id": "generate_new"
      }
    },
    "on_extend": {
      "type": "confirm",
      "message": "Extend session by 15 minutes?",
      "actions": {
        "confirm": {
          "type": "equipment_control",
          "command": "extend_session",
          "duration": 15
        }
      }
    },
    "on_end": {
      "type": "equipment_control",
      "command": "deactivate"
    }
  }
}
```

### Progressive Restaurant Ordering

Multi-phase customer experiences with real-time adaptations:

```json
{
  "version": "1.0",
  "action": "restaurant_ordering",
  "restaurant": {
    "id": "anjal_restaurant",
    "table": "from_context_or_manual"
  },
  "flow": {
    "steps": [
      {
        "step": 1,
        "type": "menu_display",
        "categories": ["appetizers", "main_course", "desserts"],
        "filters": {
          "dietary": "from_user_profile",
          "availability": "real_time"
        }
      },
      {
        "step": 2,
        "type": "order_building",
        "features": {
          "customization": true,
          "special_requests": true,
          "combo_suggestions": true
        }
      },
      {
        "step": 3,
        "type": "order_confirmation",
        "validation": {
          "allergen_check": true,
          "preparation_time": "real_time"
        }
      },
      {
        "step": 4,
        "type": "payment_selection",
        "options": ["card", "mobile_payment", "cash"],
        "tip_suggestions": [10, 15, 20]
      }
    ]
  }
}
```

### Smart Retail Product Interaction

Rich multimedia experiences with multiple interaction modes:

```json
{
  "version": "1.0",
  "action": "product_interaction",
  "product": {
    "id": "smart_watch_x1",
    "sku": "SW-X1-BLK-001"
  },
  "interactions": {
    "info": {
      "type": "product_details",
      "sections": ["specifications", "reviews", "availability"]
    },
    "demo": {
      "type": "ar_experience",
      "model": "smart_watch_x1_ar_model",
      "features": ["wear_simulation", "interface_preview"]
    },
    "compare": {
      "type": "product_comparison",
      "related_products": ["smart_watch_x1_silver", "smart_watch_x2"]
    },
    "purchase": {
      "type": "quick_buy",
      "options": {
        "delivery": ["in_store", "home_delivery"],
        "payment": ["card", "upi", "emi"]
      }
    }
  }
}
```

## Progressive Action Execution Engine

The engine that makes this system truly revolutionary is the progressive action execution engine, which maintains responsive user experience while executing complex workflows.

### Core Engine Principles

1. **Immediate Actions First**: Execute time-critical actions immediately (WiFi connection, basic authentication)
2. **Contextual Loading**: Fetch user profile and contextual data in the background
3. **Progressive Enhancement**: Enhance the experience as more data becomes available
4. **Graceful Degradation**: Provide basic functionality even if some steps fail

### Execution Flow Example

```
Scan DataMatrix → 
Parse Action Definition →
Execute Phase 1 (0-2 seconds):
  - WiFi Connection
  - Basic Authentication
  - Initial Content Loading
↓
Execute Phase 2 (2-5 seconds):
  - User Profile Retrieval
  - Personalized Content Assembly
  - Real-time Data Fetching
↓
Execute Phase 3 (5+ seconds):
  - Dynamic UI Generation
  - Real-time Updates
  - Ongoing Interaction
```

### State Management

The engine maintains state through a sophisticated state machine:

```javascript
class ActionExecutor {
  constructor(actionDefinition) {
    this.action = actionDefinition;
    this.state = {
      phase: 'initial',
      context: {},
      userData: null,
      permissions: [],
      history: []
    };
    this.progressCallbacks = [];
  }
  
  async execute() {
    // Phase 1: Immediate Actions
    await this.executePhase1();
    
    // Phase 2: Contextual Loading (non-blocking)
    this.executePhase2();
    
    // Phase 3: Interactive Experience
    return this.executePhase3();
  }
  
  async executePhase1() {
    // Execute critical immediate actions
    if (this.action.wifi) {
      await this.connectWiFi(this.action.wifi);
    }
    
    if (this.action.authentication) {
      await this.authenticate(this.action.authentication);
    }
    
    this.updateState({ phase: 'context_loading' });
  }
  
  executePhase2() {
    // Load contextual data in background
    this.loadUserProfile();
    this.loadBusinessData();
    this.loadRealTimeInfo();
  }
  
  async executePhase3() {
    // Build interactive experience
    return this.buildInteractiveExperience();
  }
}
```

### Context Awareness System

The engine leverages multiple data sources for real-time adaptations:

1. **User Profile**: Preferences, history, permissions
2. **Time & Location**: Time of day, day of week, GPS location
3. **Device Capabilities**: Camera, Bluetooth, NFC, sensors
4. **Network Conditions**: Bandwidth, latency
5. **Business Context**: Current load, promotions, inventory

This allows actions to adapt in real-time:

```javascript
const adaptiveAction = {
  type: "restaurant_ordering",
  adaptations: {
    "time_based": {
      "breakfast_hours": { menu_filters: ["breakfast"] },
      "lunch_hours": { menu_filters: ["lunch_specials"] },
      "dinner_hours": { menu_filters: ["dinner"] }
    },
    "user_history": {
      "frequent_customer": { 
        suggestions: ["favorite_items"],
        discount: "loyalty_10_percent"
      }
    },
    "location_context": {
      "nearby": { delivery_options: ["pickup", "quick_delivery"] },
      "far": { delivery_options: ["standard_delivery", "scheduled"] }
    }
  }
};
```

## Visual Flow Builder Concepts

The visual flow builder is what makes this system accessible to non-technical business owners, enabling them to create sophisticated interactions without coding.

### Core Builder Interface

The builder would be a drag-and-drop interface with these key components:

1. **Action Library Panel**: Pre-built action blocks (WiFi Connect, Form Request, Navigation, etc.)
2. **Canvas Area**: Where users arrange and connect action blocks
3. **Property Inspector**: Configuration panel for each selected action
4. **Preview Panel**: Real-time preview of the generated DataMatrix
5. **Template Library**: Saved templates for common use cases

### Block-Based Workflow Design

Users would build flows by dragging blocks onto the canvas:

```
[WiFi Connect] → [Profile Check] → [Conditional Logic] → [Form Request] → [Navigation]
     ↓
[Notification] ← [Equipment Control] ← [Session Management]
```

Each block would have:
- Visual icon representing the action type
- Configurable parameters in the property inspector
- Connection points for defining flow sequence
- Conditional logic capabilities

### Conditional Logic Visualization

A powerful feature would be visual conditional logic:

```
Profile Check
├── If missing: emergency_contact → [Form Request Block]
├── If missing: fitness_goals → [Choice Selection Block]
└── Else → [Navigate to Dashboard]
```

### Template System

The builder would include templates for common scenarios:
1. **Restaurant Experience**: Table QR → Menu → Ordering → Payment
2. **Gym Session**: Equipment Scan → Profile Check → Session Start → Progress Tracking
3. **Retail Product**: Product Scan → Info Display → AR Demo → Purchase
4. **Healthcare Check-in**: Clinic Scan → Registration → Queue Management → Doctor Assignment

### Advanced Features

1. **Progressive Disclosure**: Show/hide advanced options based on user expertise
2. **Smart Suggestions**: Recommend next actions based on current flow
3. **Validation Engine**: Real-time validation of action combinations
4. **Import/Export**: Save and share flow templates
5. **Version Control**: Track changes to flows over time

### User Experience Levels

The builder would adapt to different user expertise levels:

**Beginner Mode**:
- Simplified action blocks with common presets
- Guided workflow creation
- Template-based starting points
- Limited advanced options

**Advanced Mode**:
- Full parameter control for all actions
- Custom JavaScript expressions for logic
- API integration capabilities
- Performance optimization options

## DataMatrix Scanner Capabilities

The scanner component is the user-facing interface that makes all this magic possible, providing a seamless bridge between the physical and digital worlds.

### Multi-Format Support

The scanner would support multiple barcode formats:
1. **DataMatrix**: Primary format for high-density, small-size codes
2. **QR Codes**: For larger payloads and broader compatibility
3. **Future Expansion**: Support for other 2D formats as needed

### Intelligent Scanning Experience

```
Camera Viewfinder
├── Real-time Format Detection
├── Automatic Focus Adjustment
├── Lighting Optimization
├── Decoding Feedback
└── Result Processing
```

### Progressive Action Interface

When a DataMatrix is scanned, the scanner would provide a progressive experience:

1. **Immediate Feedback**: "Processing..." indicator
2. **Action Recognition**: "Connecting to WiFi..." 
3. **Progress Updates**: Real-time status of multi-step actions
4. **Interactive Elements**: Form requests, confirmations, choices
5. **Completion State**: Success/failure notification

### Device Feature Integration

The scanner would leverage native device capabilities:

1. **Camera Access**: High-quality image capture for reliable scanning
2. **GPS/Location**: Context-aware actions based on location
3. **Bluetooth/NFC**: Device pairing and communication
4. **Push Notifications**: Post-scan updates and reminders
5. **File System**: Local storage for offline capabilities
6. **Sensors**: Motion detection, ambient light adjustment

### User Experience Features

1. **Scan History**: List of recent scans with timestamps
2. **Favorite Actions**: Quick access to frequently used flows
3. **Offline Mode**: Cache for previously scanned codes
4. **Accessibility**: Voice feedback, large text options
5. **Security**: Permission controls, encryption for sensitive data

### Error Handling & Recovery

Robust error handling would ensure a smooth experience:

1. **Scanning Errors**: 
   - "Code not recognized" with retake option
   - Lighting/environmental suggestions
   - Manual code entry alternative

2. **Action Failures**:
   - Graceful degradation to basic functionality
   - Clear error messages with recovery options
   - Automatic retry for transient failures

3. **Network Issues**:
   - Offline mode for cached actions
   - Queueing for later execution
   - Sync when connectivity is restored

### Security & Privacy

1. **Permission Management**: Granular control over device feature access
2. **Data Encryption**: AES-256 encryption for sensitive payloads
3. **Privacy Controls**: User consent for data collection
4. **Audit Trail**: Logging of scan activities (user-controlled)

### Cross-Platform Consistency

The scanner would work consistently across:
1. **Mobile Web**: Progressive Web App with native feature access
2. **Native Mobile Apps**: Full native capabilities
3. **Desktop**: Webcam-based scanning for laptop users
4. **Tablets**: Optimized interface for larger screens

## Complete DataMatrix QR System Architecture

The complete system architecture enables the revolutionary capabilities we've discussed, where a single scan can trigger incredibly sophisticated workflows while maintaining security, privacy, and performance.

### System Overview

```
Business Owner                    End User
     |                                |
     ↓                                ↓
[Visual Flow Builder] ←→ [DataMatrix Generator] → [DataMatrix Scanner]
     |                                |
     ↓                                ↓
[Action Schema DB] ←→ [Progressive Executor] → [Device Features]
```

### Key Integration Points

1. **Schema Registry**: Central repository of all action schemas
2. **Template Library**: Pre-built flows for common business scenarios
3. **Context Engine**: Real-time data about users, environment, and business conditions
4. **Execution Engine**: Progressive action processor with state management
5. **Device Bridge**: Interface to native device capabilities

### Data Flow

1. **Creation Flow**:
   - Business owner designs flow in visual builder
   - System validates and optimizes action schema
   - DataMatrix code is generated and displayed
   - Code is printed/attached to physical objects

2. **Usage Flow**:
   - User scans DataMatrix with mobile device
   - Scanner parses action definition
   - Progressive executor begins processing
   - Context engine provides real-time data
   - Device features are accessed as needed
   - User interacts with progressive interface
   - Actions complete with appropriate feedback

### Technical Architecture

```
Frontend Layer:
├── Visual Flow Builder (React Admin Component)
├── DataMatrix Generator (React Component)
├── DataMatrix Scanner (React Component)
├── Progressive UI (React Components)

Business Logic Layer:
├── Action Schema Validator
├── Progressive Execution Engine
├── Context Awareness System
├── Device Feature Abstraction

Data Layer:
├── Schema Storage (GunDB)
├── User Context (GunDB/Auth)
├── Business Data (GunDB)
├── Template Library (GunDB)

Device Layer:
├── Camera Access
├── GPS/Location
├── Bluetooth/NFC
├── Push Notifications
└── File System
```

### Scalability Features

1. **Template-Based Actions**: Most codes reference templates rather than containing full payloads
2. **Progressive Enhancement**: Basic functionality works even with limited connectivity
3. **Caching Strategy**: Frequently used templates and data cached locally
4. **Load Distribution**: Actions can trigger server-side processing for complex operations
5. **Version Management**: Backward compatibility for older codes

### Security Model

1. **Payload Encryption**: Sensitive data in codes is encrypted
2. **Permission System**: Granular permissions for device feature access
3. **User Consent**: Explicit consent for data collection and sharing
4. **Audit Logging**: Optional logging of scan activities
5. **Expiration Controls**: Time-limited codes for sensitive actions

## Implementation Tasks

### 1. DataMatrix Schema Definition
```yaml
task: Define Zod schema for DataMatrix actions
file: src/lib/schema.ts
description: Create comprehensive schema for DataMatrix action definitions
dependencies: 
  - None
details:
  - Define core action types (wifi_connect, form_request, navigate, etc.)
  - Implement conditional logic support
  - Add bidirectional communication capabilities
  - Support for progressive action sequences
  - Context-aware action parameters
  - Security and validation fields
```

### 2. DataMatrix Generation Component
```yaml
task: Create DataMatrix generation component
file: src/components/ui/datamatrix-code.tsx
description: React component for generating DataMatrix codes from action definitions
dependencies:
  - DataMatrix schema definition
details:
  - Integrate @barcode-bakery/barcode-datamatrix library
  - Support for both QR and DataMatrix formats
  - Dynamic code generation from action definitions
  - Size optimization for different use cases
  - Error handling for invalid action definitions
```

### 3. Visual Flow Builder Admin Component
```yaml
task: Implement visual flow builder admin component
file: src/components/ui/admin/datamatrix-flow-builder.tsx
description: Drag-and-drop interface for creating DataMatrix action flows
dependencies:
  - DataMatrix schema definition
  - DataMatrix generation component
details:
  - Block-based interface for building action sequences
  - Conditional logic visualization
  - Preview of generated DataMatrix codes
  - Template management system
  - Import/export capabilities
  - User-friendly form for action configuration
```

### 4. DataMatrix Scanner Component
```yaml
task: Create DataMatrix scanner component
file: src/components/ui/datamatrix-scanner.tsx
description: Camera-based scanner for reading DataMatrix and QR codes
dependencies:
  - None (uses existing @yudiel/react-qr-scanner)
details:
  - Integration with @yudiel/react-qr-scanner
  - Support for both QR and DataMatrix formats
  - Progressive action execution engine
  - User interface for data collection forms
  - Error handling and recovery
  - Access to device features (camera, GPS, etc.)
```

### 5. Progressive Action Executor
```yaml
task: Implement progressive action execution engine
file: src/lib/datamatrix/action-executor.ts
description: Engine for executing complex action sequences progressively
dependencies:
  - DataMatrix schema definition
  - DataMatrix scanner component
details:
  - State machine for action execution
  - Context-aware action processing
  - Progressive loading and feedback
  - Error handling and recovery
  - Integration with existing API hooks
```

### 6. DataMatrix Admin Integration
```yaml
task: Integrate DataMatrix components with AutoAdmin
file: src/lib/schema.ts
description: Register DataMatrix components with the schema system
dependencies:
  - DataMatrix schema definition
  - Visual flow builder admin component
details:
  - Add DataMatrix schema to appSchema
  - Register flow builder as admin component
  - Configure tab in AutoAdmin panel
```

### 7. Feature Showcase Route
```yaml
task: Create /feature/qr route for showcasing the system
file: src/routes/feature/qr/index.tsx
description: Complete showcase of DataMatrix builder and scanner capabilities
dependencies:
  - All previous implementation tasks
details:
  - Demonstration of flow builder interface
  - Live scanner with sample actions
  - Generated code examples
  - Documentation and usage instructions
```

### 8. Client Page Implementation
```yaml
task: Create client-facing DataMatrix scanner page
file: src/components/pages/datamatrix/datamatrix-client-page.tsx
description: User-friendly interface for scanning DataMatrix codes
dependencies:
  - DataMatrix scanner component
  - Progressive action executor
details:
  - Clean, intuitive scanning interface
  - Progressive action feedback
  - Form rendering for data collection
  - Error states and recovery options
  - Responsive design for all devices
```

## Validation Gates

### 1. Schema Validation
```yaml
command: pnpm check
description: Ensure all Zod schemas are properly defined and typed
expected_result: No type errors or validation issues
```

### 2. Component Rendering Tests
```yaml
command: pnpm test
description: Verify all components render correctly without errors
expected_result: All component tests pass
```

### 3. Integration Testing
```yaml
command: pnpm test:integration
description: Test integration between components and data layer
expected_result: All integration tests pass
```

### 4. End-to-End Testing
```yaml
command: pnpm test:e2e
description: Test complete user flows from flow building to scanning
expected_result: All end-to-end tests pass
```

### 5. Performance Testing
```yaml
command: pnpm test:performance
description: Ensure scanning and action execution performance is acceptable
expected_result: All performance metrics within acceptable ranges
```

### 6. Manual QA Checklist
```yaml
checks:
  - Verify DataMatrix schema supports all required action types
  - Test flow builder with various action combinations
  - Validate scanning works on different devices and lighting conditions
  - Confirm progressive action execution works correctly
  - Check bidirectional communication functionality
  - Ensure proper error handling and recovery
  - Test accessibility features
  - Verify security measures are in place
  - Confirm responsive design works on all screen sizes
  - Validate integration with existing authentication system
```

## Final Validation Checklist

- [ ] DataMatrix schema properly defined with all action types
- [ ] Visual flow builder allows creation of complex interaction flows
- [ ] DataMatrix generation component works with both QR and DataMatrix formats
- [ ] Scanner component reliably reads codes on various devices
- [ ] Progressive action execution engine works correctly
- [ ] Bidirectional communication functionality implemented
- [ ] Integration with AutoAdmin panel successful
- [ ] /feature/qr route provides complete showcase
- [ ] Client-facing scanner page is user-friendly and responsive
- [ ] All validation commands pass without errors
- [ ] Manual QA checklist completed successfully
- [ ] Performance is optimized across all components
- [ ] Code follows project conventions and standards
- [ ] Documentation is complete and accurate
# SuperSurkhet Skills System

The SuperSurkhet Skills System provides standardized ways to perform common operations in the application, following existing architecture patterns and reusing existing components.

## Schema & Data Management Skills

The Schema & Data Management Skills provide a unified interface to interact with the schema-driven data management system in SuperSurkhet.

### Available Skills

#### 1. Record Operations
- `createRecord` - Create new records in the database
- `readRecords` - Fetch records from the database
- `updateRecord` - Update existing records
- `deleteRecord` - Remove records from the database

#### 2. Data Validation
- `validateData` - Validate data against schemas before operations

#### 3. Configuration Generation
- `generateFormConfig` - Create form configuration based on schemas
- `generateTableConfig` - Create table configuration based on schemas

### Usage

```ts
import { skills } from '@/lib/skills';

// Create a new product
const result = await skills.schema.createRecord(
  'product',
  {
    title: 'New Product',
    price: 100,
  },
  'business-slug'
);

if (result.success) {
  console.log('Product created:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### Benefits

1. **Consistency**: All operations follow the same patterns
2. **Validation**: Built-in schema validation for all operations
3. **Error Handling**: Standardized error handling across operations
4. **Type Safety**: Full TypeScript support with proper typing
5. **Integration**: Seamlessly integrates with existing SuperSurkhet architecture

### Architecture

The skills system builds on top of:
- The existing Zod schema system
- The GunDB integration
- The auto-generated admin interfaces
- The existing API layer (`api.schemaName.useGet/useCreate/useUpdate/useDelete`)

This ensures that all skills follow the same patterns as the rest of the application.

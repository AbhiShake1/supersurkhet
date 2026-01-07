# Schema & Data Management Skills

This document describes the Schema & Data Management Skills available in the SuperSurkhet platform. These skills provide standardized ways to interact with the schema-driven data management system, following existing patterns and reusing existing components.

## Available Skills

### 1. Create Records

Use the `createRecord` function to add new records to the database:

```ts
import { skills } from "@/lib/skills";

const result = await skills.schema.createRecord(
  'product',           // schema name
  {                    // data to create
    title: 'New Product',
    price: 100,
    stockQuantity: 10
  },
  'my-business'       // optional business slug
);

if (result.success) {
  console.log('Created:', result.data);
} else {
  console.error('Error:', result.error);
  console.error('Validation errors:', result.validationErrors);
}
```

### 2. Read Records

Use the `readRecords` function to fetch records from the database:

```ts
import { skills } from "@/lib/skills";

const result = await skills.schema.readRecords(
  'product',           // schema name
  'my-business',       // optional business slug
  { category: 'electronics' }  // optional filters
);

if (result.success) {
  console.log('Records:', result.data);
}
```

### 3. Update Records

Use the `updateRecord` function to update existing records:

```ts
import { skills } from "@/lib/skills";

const result = await skills.schema.updateRecord(
  'product',           // schema name
  'product-id',        // record ID
  {                    // updates
    price: 120,
    stockQuantity: 5
  },
  'my-business'       // optional business slug
);

if (result.success) {
  console.log('Updated:', result.data);
}
```

### 4. Delete Records

Use the `deleteRecord` function to remove records:

```ts
import { skills } from "@/lib/skills";

const result = await skills.schema.deleteRecord(
  'product',           // schema name
  'product-id',        // record ID
  'my-business'       // optional business slug
);

if (result.success) {
  console.log('Record deleted');
}
```

### 5. Validate Data

Use the `validateData` function to validate data against a schema:

```ts
import { skills } from "@/lib/skills";

const result = await skills.schema.validateData(
  'product',           // schema name
  {                    // data to validate
    title: 'New Product',
    price: 100,
    stockQuantity: 10
  }
);

if (result.success) {
  console.log('Valid data:', result.data);
} else {
  console.error('Validation errors:', result.validationErrors);
}
```

### 6. Generate Form Configuration

Use the `generateFormConfig` function to create form configuration based on a schema:

```ts
import { skills } from "@/lib/skills";

const formConfig = skills.schema.generateFormConfig('product');
console.log('Form fields:', formConfig.fields);
```

### 7. Generate Table Configuration

Use the `generateTableConfig` function to create table configuration based on a schema:

```ts
import { skills } from "@/lib/skills";

const tableConfig = skills.schema.generateTableConfig('product');
console.log('Table columns:', tableConfig.columns);
```

## Best Practices

1. Always check the `success` property of the result before using the data
2. Handle validation errors appropriately in your UI
3. Use business slugs when working with multi-tenant data
4. Leverage the validation functions before performing operations
5. Use the configuration generators to maintain consistency with existing UI patterns

## Error Handling

All skill functions return a `DataOperationResult` with the following structure:

```ts
{
  success: boolean;           // Whether the operation succeeded
  data?: any;                // The result data (if successful)
  error?: string;            // Error message (if failed)
  validationErrors?: z.ZodIssue[];  // Validation errors (if validation failed)
}
```

Always check the `success` property before using the result data.
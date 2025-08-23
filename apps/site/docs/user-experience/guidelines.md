# Unified User Experience Guidelines

This document outlines the user experience principles and implementation guidelines for all components in the SuperSurkhet ecosystem.

## UX Principles

1. **Consistency** - Maintain consistent patterns across all business types
2. **Simplicity** - Keep interfaces simple and intuitive
3. **Accessibility** - Ensure all users can access and use the platform
4. **Performance** - Optimize for fast loading and responsive interactions
5. **Feedback** - Provide clear feedback for user actions

## Navigation Patterns

### Main Navigation

All client pages should use a consistent navigation structure:

```tsx
// Header with consistent navigation
<header className="sticky top-0 z-50 w-full border-b bg-background">
  <div className="container flex h-16 items-center justify-between">
    <div className="flex items-center gap-2">
      <Logo />
      <span className="font-bold">Business Name</span>
    </div>
    <nav className="hidden md:flex items-center gap-4">
      <a href="#" className="text-sm font-medium">Home</a>
      <a href="#" className="text-sm font-medium">Services</a>
      <a href="#" className="text-sm font-medium">Contact</a>
    </nav>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">Sign In</Button>
      <Button size="sm">Get Started</Button>
    </div>
  </div>
</header>
```

### Admin Navigation

All admin panels should use a consistent sidebar navigation:

```tsx
// Sidebar with consistent navigation
<aside className="hidden md:flex flex-col border-r bg-background w-64 fixed inset-y-0 left-0 z-40">
  <div className="flex h-16 items-center border-b px-4">
    <Logo className="h-6 w-6" />
    <span className="ml-2 font-bold">Admin</span>
  </div>
  <nav className="flex-1 overflow-y-auto py-4">
    <ul className="space-y-1 px-2">
      <li>
        <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
          <DashboardIcon className="h-4 w-4" />
          Dashboard
        </a>
      </li>
      <li>
        <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
          <UsersIcon className="h-4 w-4" />
          Users
        </a>
      </li>
    </ul>
  </nav>
</aside>
```

## Search and Filtering

Implement consistent search and filtering patterns:

```tsx
// Search bar with consistent styling
<div className="relative w-full md:w-64">
  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
  <Input
    type="search"
    placeholder="Search..."
    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[300px]"
  />
</div>

// Filter dropdown with consistent styling
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      <Filter className="h-4 w-4 mr-2" />
      Filter
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuCheckboxItem checked>
      Active
    </DropdownMenuCheckboxItem>
    <DropdownMenuCheckboxItem>
      Inactive
    </DropdownMenuCheckboxItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Data Visualization

Use consistent data visualization components:

```tsx
// Consistent card layout for data display
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">
      Total Revenue
    </CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">$45,231.89</div>
    <p className="text-xs text-muted-foreground">
      +20.1% from last month
    </p>
  </CardContent>
</Card>

// Consistent table layout for data display
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-medium">Olivia Martin</TableCell>
      <TableCell>
        <Badge variant="outline">Active</Badge>
      </TableCell>
      <TableCell className="text-right">$450.00</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## User Feedback and Notifications

Implement consistent feedback mechanisms:

```tsx
// Toast notifications for user actions
import { toast } from "sonner"

// Success notification
toast.success("Item created successfully")

// Error notification
toast.error("Failed to create item")

// Loading indicator for async actions
<Button loading={isLoading}>
  {isLoading ? "Saving..." : "Save"}
</Button>

// Progress indicators for long-running tasks
<Progress value={progress} className="w-full" />
```

## Form Patterns

Use consistent form patterns:

```tsx
// Consistent form layout
<form className="space-y-6">
  <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="name">Name</Label>
      <Input id="name" placeholder="Enter name" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="Enter email" />
    </div>
  </div>
  <div className="flex justify-end gap-2">
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Save</Button>
  </div>
</form>
```

## Business Type Specific Guidelines

### Retail Businesses

- Focus on product catalog and shopping cart
- Implement inventory management views
- Provide order tracking and history

### Service Businesses

- Emphasize appointment scheduling
- Provide service catalog with descriptions
- Include staff/employee management views

### Food Businesses

- Highlight menu items with images
- Implement online ordering system
- Provide kitchen order ticket views

### Healthcare Businesses

- Focus on appointment scheduling
- Include patient record management
- Provide teleconsultation features

### Education Businesses

- Emphasize course catalog and enrollment
- Provide student management views
- Include communication tools

## Accessibility

Ensure all components follow accessibility guidelines:

1. Use semantic HTML
2. Provide proper ARIA attributes
3. Ensure keyboard navigation
4. Maintain color contrast ratios
5. Provide alternative text for images
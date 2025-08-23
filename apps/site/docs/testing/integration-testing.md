# Integration Testing Guidelines

This document outlines the integration testing principles and implementation guidelines for the SuperSurkhet ecosystem.

## Testing Principles

1. **Comprehensive Coverage** - Test all business types and their integrations
2. **Data Flow Validation** - Ensure data flows correctly between modules
3. **Component Integration** - Verify admin components integrate properly
4. **Routing Validation** - Test client page routing for all business types
5. **Service Integration** - Validate shared service integration

## Test Structure

All integration tests should follow this structure:

```tsx
// __tests__/integration/business-creation.test.tsx
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BusinessCreationForm } from "@/components/business-creation-form"

describe("Business Creation Integration", () => {
  it("should create a new business with correct features", async () => {
    const user = userEvent.setup()
    const mockOnSubmit = vi.fn()
    
    render(<BusinessCreationForm onSubmit={mockOnSubmit} />)
    
    // Fill in business name
    await user.type(screen.getByLabelText("Business Name"), "Test Business")
    
    // Select business type
    await user.click(screen.getByText("Retail"))
    
    // Verify recommended features are selected
    expect(screen.getByLabelText("Product")).toBeChecked()
    expect(screen.getByLabelText("Order")).toBeChecked()
    
    // Submit form
    await user.click(screen.getByText("Create Business"))
    
    // Verify onSubmit was called with correct data
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "Test Business",
        businessType: "retail",
        features: {
          product: true,
          order: true,
          expense: true
        }
      })
    })
  })
})
```

## Business Type Integration Tests

### Retail Business Integration

```tsx
// __tests__/integration/retail-business.test.tsx
import { render, screen, waitFor } from "@testing-library/react"
import { RetailClientPage } from "@/components/pages/retail/retail-client-page"
import { api } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  api: {
    product: {
      useGet: vi.fn().mockReturnValue({
        data: [
          { id: "1", name: "Product 1", price: 100 },
          { id: "2", name: "Product 2", price: 200 }
        ],
        isLoading: false
      })
    },
    order: {
      useGet: vi.fn().mockReturnValue({
        data: [],
        isLoading: false
      })
    }
  }
}))

describe("Retail Business Integration", () => {
  it("should display products and order functionality", async () => {
    render(<RetailClientPage slug="test-retail" />)
    
    // Verify products are displayed
    expect(await screen.findByText("Product 1")).toBeInTheDocument()
    expect(screen.getByText("Product 2")).toBeInTheDocument()
    
    // Verify pricing is displayed correctly
    expect(screen.getByText("Rs. 100.00")).toBeInTheDocument()
    expect(screen.getByText("Rs. 200.00")).toBeInTheDocument()
  })
})
```

### Food Business Integration

```tsx
// __tests__/integration/food-business.test.tsx
import { render, screen, waitFor } from "@testing-library/react"
import { RestaurantClientPage } from "@/components/pages/restaurant/restaurant-client-page"
import { api } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  api: {
    menuItem: {
      useGet: vi.fn().mockReturnValue({
        data: [
          { id: "1", name: "Burger", price: 150, isVegetarian: false },
          { id: "2", name: "Salad", price: 100, isVegetarian: true }
        ],
        isLoading: false
      })
    }
  }
}))

describe("Food Business Integration", () => {
  it("should display menu items with dietary information", async () => {
    render(<RestaurantClientPage slug="test-restaurant" />)
    
    // Verify menu items are displayed
    expect(await screen.findByText("Burger")).toBeInTheDocument()
    expect(screen.getByText("Salad")).toBeInTheDocument()
    
    // Verify pricing is displayed correctly
    expect(screen.getByText("Rs. 150.00")).toBeInTheDocument()
    expect(screen.getByText("Rs. 100.00")).toBeInTheDocument()
    
    // Verify dietary information
    expect(screen.getByText("Vegetarian")).toBeInTheDocument()
  })
})
```

## Admin Component Integration Tests

### Menu Management Integration

```tsx
// __tests__/integration/menu-management.test.tsx
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MenuManagement } from "@/components/ui/admin/menu-management"
import { api } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  api: {
    menuItem: {
      useGet: vi.fn().mockReturnValue({
        data: [
          { 
            id: "1", 
            name: "Burger", 
            price: 150, 
            isActive: true,
            isFeatured: true
          }
        ],
        isLoading: false
      }),
      useUpdate: vi.fn().mockReturnValue({
        mutate: vi.fn()
      })
    }
  }
}))

describe("Menu Management Integration", () => {
  it("should toggle item availability", async () => {
    const user = userEvent.setup()
    const mockUpdate = vi.fn()
    
    vi.mocked(api.menuItem.useUpdate).mockReturnValue({
      mutate: mockUpdate
    } as any)
    
    render(<MenuManagement />)
    
    // Verify item is displayed
    expect(await screen.findByText("Burger")).toBeInTheDocument()
    
    // Toggle availability
    await user.click(screen.getByRole("switch"))
    
    // Verify update was called
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        id: "1",
        isActive: false
      })
    })
  })
})
```

## Routing Integration Tests

### Business Routing Integration

```tsx
// __tests__/integration/business-routing.test.tsx
import { render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { Route } from "@/routes/$businessName"

vi.mock("@/lib/api", () => ({
  api: {
    business: {
      useGet: vi.fn().mockReturnValue({
        data: [
          { 
            id: "1", 
            name: "Test Restaurant", 
            basePath: "test-restaurant",
            businessType: "food"
          }
        ]
      })
    }
  }
}))

describe("Business Routing Integration", () => {
  it("should render restaurant page for food business", async () => {
    const router = createMemoryRouter([
      {
        path: "/:businessName",
        Component: Route.component
      }
    ], {
      initialEntries: ["/test-restaurant"]
    })
    
    render(<RouterProvider router={router} />)
    
    // Verify restaurant page is rendered
    expect(await screen.findByText("Test Restaurant")).toBeInTheDocument()
  })
})
```

## Shared Service Integration Tests

### Payment Integration

```tsx
// __tests__/integration/payment-service.test.tsx
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PaymentForm } from "@/components/payment/payment-form"
import { usePayment } from "@/lib/payment"

vi.mock("@/lib/payment", () => ({
  usePayment: vi.fn().mockReturnValue({
    processPayment: vi.fn().mockResolvedValue({ success: true })
  })
}))

describe("Payment Service Integration", () => {
  it("should process payment successfully", async () => {
    const user = userEvent.setup()
    const mockProcessPayment = vi.fn().mockResolvedValue({ success: true })
    
    vi.mocked(usePayment).mockReturnValue({
      processPayment: mockProcessPayment
    } as any)
    
    render(<PaymentForm amount={1000} />)
    
    // Fill in payment details
    await user.type(screen.getByLabelText("Card Number"), "1234567890123456")
    await user.type(screen.getByLabelText("Expiry Date"), "12/25")
    await user.type(screen.getByLabelText("CVV"), "123")
    
    // Submit payment
    await user.click(screen.getByText("Pay Rs. 1000"))
    
    // Verify payment was processed
    await waitFor(() => {
      expect(mockProcessPayment).toHaveBeenCalledWith({
        amount: 1000,
        cardNumber: "1234567890123456",
        expiryDate: "12/25",
        cvv: "123"
      })
    })
  })
})
```

## Data Flow Integration Tests

### Business Data Flow

```tsx
// __tests__/integration/business-data-flow.test.tsx
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BusinessCreationForm } from "@/components/business-creation-form"
import { api } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  api: {
    business: {
      useCreate: vi.fn().mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({
          id: "1",
          name: "Test Business",
          businessType: "retail"
        })
      })
    }
  }
}))

describe("Business Data Flow Integration", () => {
  it("should create business and update UI", async () => {
    const user = userEvent.setup()
    const mockCreate = vi.fn().mockResolvedValue({
      id: "1",
      name: "Test Business",
      businessType: "retail"
    })
    
    vi.mocked(api.business.useCreate).mockReturnValue({
      mutateAsync: mockCreate
    } as any)
    
    render(<BusinessCreationForm />)
    
    // Fill in form
    await user.type(screen.getByLabelText("Business Name"), "Test Business")
    await user.click(screen.getByText("Retail"))
    
    // Submit form
    await user.click(screen.getByText("Create Business"))
    
    // Verify business was created
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        name: "Test Business",
        businessType: "retail",
        basePath: "test-business",
        isActive: true
      })
    })
  })
})
```

## Test Execution

Run integration tests with:

```bash
# Run all integration tests
pnpm test:integration

# Run specific integration test
pnpm test:integration __tests__/integration/business-creation.test.tsx

# Run integration tests in watch mode
pnpm test:integration --watch
```

## Test Coverage

Ensure tests cover:

1. **Business Creation Flow** - All business types and feature selection
2. **Data Persistence** - CRUD operations for all schemas
3. **Component Integration** - Admin components and client pages
4. **Routing** - All business type routes
5. **Shared Services** - Payment, notifications, etc.
6. **Error Handling** - Graceful error handling and user feedback
7. **Performance** - Loading states and optimized data fetching
# Security Implementation Guidelines

This document outlines the security principles and implementation guidelines for the SuperSurkhet ecosystem.

## Security Principles

1. **Authentication** - Verify user identity
2. **Authorization** - Control access to resources
3. **Data Protection** - Protect sensitive data
4. **Input Validation** - Validate all user input
5. **Error Handling** - Handle errors securely
6. **Monitoring** - Monitor for security events

## Authentication and Authorization

### User Authentication

```tsx
// lib/auth.ts
import { useState, useEffect } from "react"
import { useRouter } from "@tanstack/react-router"
import { useGoogleLogin } from "@react-oauth/google"
import { api } from "@/lib/api"

interface User {
  id: string
  email: string
  name: string
  role: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem("auth-token")
    if (token) {
      // Verify token and fetch user data
      verifyToken(token)
        .then(userData => {
          setUser(userData)
          setIsLoading(false)
        })
        .catch(() => {
          localStorage.removeItem("auth-token")
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        // Exchange Google token for app token
        const { token, user: userData } = await api.auth.googleLogin(response.access_token)
        
        // Store token securely
        localStorage.setItem("auth-token", token)
        setUser(userData)
        
        // Redirect to dashboard
        router.navigate({ to: "/dashboard" })
      } catch (error) {
        console.error("Login failed:", error)
        // Show error to user
      }
    },
    onError: (error) => {
      console.error("Google login error:", error)
    }
  })

  const logout = () => {
    // Clear session
    localStorage.removeItem("auth-token")
    setUser(null)
    
    // Redirect to login
    router.navigate({ to: "/login" })
  }

  return {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user
  }
}
```

### Role-Based Access Control

```tsx
// components/role-guard.tsx
import { useAuth } from "@/lib/auth"

interface RoleGuardProps {
  roles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return fallback || <div>Access denied. Please log in.</div>
  }

  if (!roles.includes(user.role)) {
    return fallback || <div>Access denied. Insufficient permissions.</div>
  }

  return <>{children}</>
}
```

### Protected Route Implementation

```tsx
// routes/_protected.tsx
import { createRoute } from "@tanstack/react-router"
import { useAuth } from "@/lib/auth"
import { RoleGuard } from "@/components/role-guard"

export const protectedRoute = createRoute({
  beforeLoad: ({ location }) => {
    const { isAuthenticated } = useAuth.getState()
    
    if (!isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      })
    }
  },
})

// Usage in specific routes
export const adminRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/admin",
  component: () => (
    <RoleGuard roles={["admin"]}>
      <AdminDashboard />
    </RoleGuard>
  ),
})
```

## Input Validation and Sanitization

### Zod Schema Validation

```tsx
// lib/validation.ts
import { z } from "zod"

// Business creation validation
export const businessCreationSchema = z.object({
  name: z.string()
    .min(1, "Business name is required")
    .max(100, "Business name must be less than 100 characters")
    .trim(),
  
  businessType: z.enum([
    "retail", "food", "service", "education", "healthcare",
    "logistics", "real_estate", "cooperative", "other",
    "hotel", "petrol_pump", "gym", "cinema", 
    "financial_firm", "ride_sharing"
  ]),
  
  basePath: z.string()
    .min(1, "Base path is required")
    .max(50, "Base path must be less than 50 characters")
    .regex(/^[a-z0-9-]+$/, "Base path can only contain lowercase letters, numbers, and hyphens")
    .trim()
})

// Product validation
export const productSchema = z.object({
  name: z.string()
    .min(1, "Product name is required")
    .max(100, "Product name must be less than 100 characters")
    .trim(),
  
  description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .transform(val => val?.trim() || undefined),
  
  price: z.number()
    .positive("Price must be positive")
    .max(1000000, "Price is too high"),
  
  imageUrl: z.string()
    .url("Invalid image URL")
    .optional()
})

// Sanitize HTML content
export function sanitizeHtml(content: string): string {
  // Remove potentially dangerous HTML tags and attributes
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/onclick|onload|onerror/gi, "")
}
```

### Form Validation with Zod

```tsx
// components/business-creation-form.tsx
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { businessCreationSchema } from "@/lib/validation"

type BusinessCreationFormValues = z.infer<typeof businessCreationSchema>

export function BusinessCreationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessCreationFormValues>({
    resolver: zodResolver(businessCreationSchema),
  })

  const onSubmit = async (data: BusinessCreationFormValues) => {
    try {
      // Submit validated data
      await createBusiness(data)
    } catch (error) {
      // Handle submission errors
      console.error("Submission failed:", error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">Business Name</label>
        <input
          id="name"
          {...register("name")}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p role="alert">{errors.name.message}</p>
        )}
      </div>
      
      {/* Other form fields */}
      
      <button type="submit">Create Business</button>
    </form>
  )
}
```

## Secure Data Transmission

### HTTPS Enforcement

```tsx
// lib/https-enforcer.ts
import { useEffect } from "react"
import { useRouter } from "@tanstack/react-router"

export function useHttpsEnforcer() {
  const router = useRouter()
  
  useEffect(() => {
    if (import.meta.env.PROD && window.location.protocol !== "https:") {
      window.location.href = window.location.href.replace("http://", "https://")
    }
  }, [])
}
```

### Secure API Communication

```tsx
// lib/api-client.ts
class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setToken(token: string) {
    this.token = token
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers = {
      "Content-Type": "application/json",
      ...(this.token && { "Authorization": `Bearer ${this.token}` }),
      ...options.headers,
    }

    // Add CSRF protection for state-changing requests
    if (["POST", "PUT", "PATCH", "DELETE"].includes(options.method || "")) {
      const csrfToken = this.getCsrfToken()
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Include cookies for CSRF protection
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  private getCsrfToken(): string | null {
    // Get CSRF token from meta tag or cookie
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || 
           this.getCookie("csrf-token")
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() || null
    }
    return null
  }
}

export const apiClient = new ApiClient(import.meta.env.VITE_API_URL || "/api")
```

## Error Handling

### Secure Error Handling

```tsx
// lib/error-handler.ts
import { toast } from "sonner"

export class ErrorHandler {
  static handle(error: unknown, context: string) {
    console.error(`Error in ${context}:`, error)

    // Don't expose internal errors to users
    let userMessage = "An unexpected error occurred. Please try again."

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes("validation")) {
        userMessage = "Please check your input and try again."
      } else if (error.message.includes("unauthorized")) {
        userMessage = "You are not authorized to perform this action."
        // Trigger logout if needed
      } else if (error.message.includes("forbidden")) {
        userMessage = "Access denied."
      }
    }

    // Show user-friendly message
    toast.error(userMessage)

    // Log error for monitoring (don't include sensitive data)
    if (import.meta.env.PROD) {
      // Send to error monitoring service
      // Sentry.captureException(error, { contexts: { context } })
    }
  }

  static async handleApiError(response: Response) {
    const errorData = await response.json().catch(() => ({}))
    
    // Handle specific HTTP status codes
    switch (response.status) {
      case 400:
        throw new Error("validation error")
      case 401:
        throw new Error("unauthorized")
      case 403:
        throw new Error("forbidden")
      case 404:
        throw new Error("not found")
      case 500:
        throw new Error("server error")
      default:
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }
}
```

## Security Monitoring and Logging

### Security Event Logging

```tsx
// lib/security-logger.ts
export class SecurityLogger {
  static logEvent(event: string, details: Record<string, unknown> = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      userId: this.getCurrentUserId(),
      ipAddress: this.getClientIp(),
      userAgent: navigator.userAgent,
      details,
    }

    // Send to security monitoring service
    if (import.meta.env.PROD) {
      fetch("/api/security/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logEntry),
      }).catch(console.error)
    } else {
      console.log("Security event:", logEntry)
    }
  }

  private static getCurrentUserId(): string | null {
    // Get current user ID from auth state
    const user = localStorage.getItem("user")
    return user ? JSON.parse(user).id : null
  }

  private static getClientIp(): string {
    // In a real implementation, this would come from server-side headers
    return "client-ip-unavailable"
  }
}
```

### Suspicious Activity Detection

```tsx
// lib/suspicious-activity-detector.ts
export class SuspiciousActivityDetector {
  private static readonly THRESHOLDS = {
    failedLogins: 5,
    rapidRequests: 100,
    timeWindow: 5 * 60 * 1000, // 5 minutes
  }

  private static activityLog: Array<{ timestamp: number; type: string }> = []

  static logActivity(type: string) {
    const now = Date.now()
    this.activityLog.push({ timestamp: now, type })

    // Clean up old entries
    this.activityLog = this.activityLog.filter(
      entry => now - entry.timestamp < this.THRESHOLDS.timeWindow
    )

    // Check for suspicious patterns
    this.checkForSuspiciousActivity()
  }

  private static checkForSuspiciousActivity() {
    const now = Date.now()
    const recentActivities = this.activityLog.filter(
      entry => now - entry.timestamp < this.THRESHOLDS.timeWindow
    )

    // Check for too many failed logins
    const failedLogins = recentActivities.filter(
      entry => entry.type === "failed-login"
    ).length

    if (failedLogins >= this.THRESHOLDS.failedLogins) {
      this.handleSuspiciousActivity("too_many_failed_logins")
    }

    // Check for rapid requests
    if (recentActivities.length >= this.THRESHOLDS.rapidRequests) {
      this.handleSuspiciousActivity("rapid_requests")
    }
  }

  private static handleSuspiciousActivity(reason: string) {
    console.warn("Suspicious activity detected:", reason)
    
    // Log security event
    SecurityLogger.logEvent("suspicious_activity", { reason })
    
    // Could trigger additional security measures like:
    // - Temporary account lockout
    // - Additional authentication requirements
    // - Security alert notifications
  }
}
```

## GunDB Security Implementation

### Secure GunDB Configuration

```tsx
// lib/gun/secure-gun.ts
import GUN from "gun/gun"
import "gun/sea"
import "gun/lib/radix"
import "gun/lib/radisk"
import "gun/lib/store"
import "gun/lib/rindexed"

export class SecureGunDB {
  private gun: ReturnType<typeof GUN>
  private user: any

  constructor() {
    this.gun = GUN({
      localStorage: false, // Disable localStorage for security
      peers: [
        "wss://gun-relay.abhi-shake-np.workers.dev/gun",
        "wss://gun-manhattan.herokuapp.com/gun",
      ],
    })
  }

  async createUser(username: string, password: string) {
    try {
      // Create user with SEA (Security, Encryption, Authorization)
      const user = this.gun.user()
      await user.create(username, password)
      this.user = user
      return user
    } catch (error) {
      console.error("Failed to create user:", error)
      throw error
    }
  }

  async authenticateUser(username: string, password: string) {
    try {
      // Authenticate user with SEA
      const user = this.gun.user()
      await user.auth(username, password)
      this.user = user
      return user
    } catch (error) {
      console.error("Failed to authenticate user:", error)
      throw error
    }
  }

  // Secure data writing with encryption
  async securePut(path: string, data: any, recipientPublicKey?: string) {
    if (!this.user) {
      throw new Error("User not authenticated")
    }

    try {
      // Encrypt data if recipient public key is provided
      const encryptedData = recipientPublicKey
        ? await this.user.SEA.encrypt(data, recipientPublicKey)
        : data

      // Put data securely
      return await this.gun.get(path).put(encryptedData)
    } catch (error) {
      console.error("Failed to put secure data:", error)
      throw error
    }
  }

  // Secure data reading with decryption
  async secureGet(path: string) {
    if (!this.user) {
      throw new Error("User not authenticated")
    }

    try {
      // Get data
      const data = await this.gun.get(path).once()
      
      // Decrypt if it's encrypted
      if (typeof data === "string" && data.startsWith("SEA{")) {
        return await this.user.SEA.decrypt(data, this.user.pair())
      }
      
      return data
    } catch (error) {
      console.error("Failed to get secure data:", error)
      throw error
    }
  }
  
  // Future: AI-optimized data storage for decentralized processing
  async storeProcessedData(path: string, processedData: any, aiModelHash: string) {
    // Store AI-processed data in graph network to eliminate recomputation
    // This will be implemented with our proprietary compression algorithms
    // and decentralized AI system that runs on user devices
  }
}
```

### Future Decentralized AI Integration

The GunDB implementation will be enhanced to support our future decentralized AI system:

1. **Device-Local Processing**: AI models will run directly on user devices
2. **Graph Network Storage**: Processed data and learned insights will be stored in the graph network
3. **Elimination of Redundant Computation**: Previously computed results will be reused from the network
4. **Ultra-Fast Data Transfer**: Proprietary compression will enable instant data sharing
5. **Scalable to Billions**: Architecture designed to handle massive scale efficiently

## Security Testing

### Security Audit Checklist

Regular security audits should include:

1. **Authentication Testing**
   - Test login with valid credentials
   - Test login with invalid credentials
   - Test brute force protection
   - Test session management

2. **Authorization Testing**
   - Test access to protected resources
   - Test role-based access controls
   - Test privilege escalation attempts

3. **Input Validation Testing**
   - Test SQL injection attempts
   - Test XSS attacks
   - Test command injection
   - Test file upload restrictions

4. **Data Protection Testing**
   - Test data encryption
   - Test secure data transmission
   - Test data exposure prevention

5. **Error Handling Testing**
   - Test information disclosure in errors
   - Test error logging
   - Test graceful error recovery

### Automated Security Scanning

```bash
# Run security audit
npm audit

# Run security scan with additional tools
npx nsecure audit

# Check for vulnerable dependencies
npx yarn-audit-html
```

## Security Best Practices

1. **Keep Dependencies Updated**
   - Regularly update all dependencies
   - Monitor for security vulnerabilities
   - Use lock files to ensure consistent versions

2. **Environment Variables**
   - Never commit secrets to version control
   - Use environment-specific configuration
   - Rotate secrets regularly

3. **Content Security Policy**
   - Implement strict CSP headers
   - Restrict sources for scripts, styles, and images
   - Use nonce-based CSP for dynamic content

4. **Security Headers**
   - Set appropriate security headers
   - Implement HSTS for HTTPS enforcement
   - Use X-Content-Type-Options and X-Frame-Options

5. **Regular Security Training**
   - Keep team updated on security best practices
   - Conduct regular security reviews
   - Stay informed about new vulnerabilities
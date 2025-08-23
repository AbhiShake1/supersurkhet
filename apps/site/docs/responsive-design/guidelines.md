# Responsive Design Guidelines

This document outlines the responsive design principles and implementation guidelines for all UI components in the SuperSurkhet ecosystem.

## Breakpoints

We use the following breakpoints based on Tailwind CSS defaults:

```css
/* Small devices (landscape phones, 576px and up) */
@media (min-width: 576px) { }

/* Medium devices (tablets, 768px and up) */
@media (min-width: 768px) { }

/* Large devices (desktops, 1024px and up) */
@media (min-width: 1024px) { }

/* Extra large devices (large desktops, 1280px and up) */
@media (min-width: 1280px) { }

/* 2X large devices (larger desktops, 1536px and up) */
@media (min-width: 1536px) { }
```

## Mobile-First Approach

All components should be designed mobile-first, with enhancements for larger screens:

```tsx
// Bad - Desktop-first
<div className="w-64 md:w-48 sm:w-32" />

// Good - Mobile-first
<div className="w-32 sm:w-48 md:w-64" />
```

## Flexible Layouts

Use CSS Grid and Flexbox for flexible layouts:

```tsx
// Good - Flexible grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

// Good - Flexible flexbox
<div className="flex flex-col sm:flex-row gap-4">
  <div className="flex-1">Content</div>
  <div className="flex-1">Content</div>
</div>
```

## Touch Targets

Ensure all interactive elements have adequate touch targets:

```tsx
// Good - Minimum 44px touch target
<button className="h-11 w-11 flex items-center justify-center rounded-full">
  <Icon className="h-6 w-6" />
</button>
```

## Responsive Typography

Use responsive font sizes:

```tsx
// Good - Responsive text
<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
  Heading
</h1>
```

## Image Optimization

Use responsive images:

```tsx
// Good - Responsive image
<img 
  src="/image.jpg" 
  srcSet="/image-small.jpg 576w, /image-medium.jpg 768w, /image-large.jpg 1024w"
  sizes="(max-width: 576px) 100vw, (max-width: 768px) 50vw, 33vw"
  alt="Description"
  className="w-full h-auto"
/>
```

## Component-Specific Guidelines

### Cards

```tsx
// Good - Responsive card
<Card className="w-full max-w-md mx-auto">
  <CardHeader>
    <CardTitle className="text-xl sm:text-2xl">
      Card Title
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm sm:text-base">
      Card content
    </p>
  </CardContent>
</Card>
```

### Forms

```tsx
// Good - Responsive form
<form className="space-y-4 sm:space-y-6">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <Label htmlFor="firstName">First Name</Label>
      <Input id="firstName" className="h-10 sm:h-12" />
    </div>
    <div>
      <Label htmlFor="lastName">Last Name</Label>
      <Input id="lastName" className="h-10 sm:h-12" />
    </div>
  </div>
</form>
```

### Navigation

```tsx
// Good - Responsive navigation
<nav className="flex flex-col sm:flex-row gap-2 sm:gap-4">
  <a href="#" className="px-4 py-2 text-center">Home</a>
  <a href="#" className="px-4 py-2 text-center">About</a>
  <a href="#" className="px-4 py-2 text-center">Contact</a>
</nav>
```

## Testing

Test components on various screen sizes:

1. Mobile (320px - 480px)
2. Tablet (768px - 1024px)
3. Desktop (1024px+)
4. Large Desktop (1440px+)

Use browser developer tools to test different screen sizes.
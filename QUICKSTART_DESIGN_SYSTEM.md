# Yarda Design System - Quick Start Guide

## TL;DR

```bash
# The design system is ready to use!
# Just use these Tailwind classes in your components:

# Buttons
className="btn-primary"           # Sage green button
className="btn-secondary"         # Light sage button
className="btn-outline"           # Outlined button

# Cards
className="card"                  # Standard white card
className="feature-card"          # Feature card with hover effect

# Badges
className="badge-green"           # Sage green badge
className="badge-success"         # Green success badge
className="badge-warning"         # Orange warning badge

# Sections
className="section-cream"         # Cream background section
className="hero-gradient"         # Green gradient background
```

---

## 5-Minute Setup

Already done! The design system is configured and ready to use.

### What's Included:
- ✅ Tailwind configured with brand colors
- ✅ Global styles with utility classes
- ✅ Navigation and Footer components
- ✅ Theme constants in TypeScript
- ✅ Example pages (homepage, pricing)

---

## Using the Design System

### 1. Import Navigation & Footer

```tsx
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function MyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Your page content */}

      <Footer />
    </div>
  );
}
```

### 2. Use Brand Colors

```tsx
// Sage green (primary brand color)
<button className="bg-brand-green hover:bg-brand-dark-green text-white">
  Click Me
</button>

// Cream background
<section className="bg-brand-cream py-16">
  {/* Content */}
</section>

// Sage badge
<span className="bg-brand-sage text-brand-dark-green px-3 py-1 rounded-full">
  New
</span>
```

### 3. Use Utility Classes

```tsx
// Button
<button className="btn-primary">Primary Action</button>

// Card
<div className="card p-6">
  <h3>Card Title</h3>
  <p>Card content here</p>
</div>

// Input
<input className="input" placeholder="Enter text..." />
```

---

## Common Patterns

### Hero Section

```tsx
<section className="bg-brand-cream pt-24 pb-16">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h1 className="text-5xl font-extrabold text-neutral-900 mb-6">
      Your <span className="text-brand-green">Headline</span>
    </h1>
    <p className="text-xl text-neutral-600 mb-8">
      Your description text here
    </p>
    <button className="btn-primary text-lg px-8 py-4">
      Get Started
    </button>
  </div>
</section>
```

### Feature Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  <div className="feature-card text-center">
    <div className="w-16 h-16 bg-brand-sage rounded-full flex items-center justify-center mx-auto mb-6">
      {/* Icon */}
    </div>
    <h3 className="text-2xl font-bold text-neutral-900 mb-3">
      Feature Title
    </h3>
    <p className="text-neutral-600">
      Feature description
    </p>
  </div>
</div>
```

### CTA Section

```tsx
<section className="py-16 hero-gradient text-white">
  <div className="max-w-4xl mx-auto px-4 text-center">
    <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
    <p className="text-xl text-brand-cream mb-8">
      Join thousands of users today
    </p>
    <button className="bg-white text-brand-green hover:bg-brand-cream px-8 py-4 rounded-lg font-bold">
      Sign Up Now
    </button>
  </div>
</section>
```

---

## Brand Color Reference

### Colors You'll Use Most

```tsx
bg-brand-green          // #5A6C4D - Primary sage green
bg-brand-dark-green     // #3D4A36 - Hover states
bg-brand-cream          // #F5F3F0 - Light backgrounds
bg-brand-sage           // #E8EDE5 - Badges, hover states

text-brand-green        // #5A6C4D - Brand color text
text-brand-dark-green   // #3D4A36 - Dark text
text-neutral-900        // Headings
text-neutral-600        // Body text
```

### When to Use Each

- **brand-green**: Primary buttons, links, icons, emphasis
- **brand-dark-green**: Hover states, dark text on light backgrounds
- **brand-cream**: Section backgrounds (alternate with white)
- **brand-sage**: Badges, icon backgrounds, hover states, borders

---

## Component Examples

### Button Variants

```tsx
// Primary (most common)
<button className="btn-primary">Save Changes</button>

// Secondary
<button className="btn-secondary">Cancel</button>

// Outline
<button className="btn-outline">Learn More</button>

// Ghost (text only)
<button className="btn-ghost">Skip</button>

// Custom sizing
<button className="btn-primary text-lg px-8 py-4">Large Button</button>
```

### Card Variants

```tsx
// Standard card
<div className="card p-6">
  <h3 className="text-lg font-semibold mb-2">Card Title</h3>
  <p className="text-neutral-600">Card content</p>
</div>

// Feature card (with hover lift)
<div className="feature-card text-center">
  <div className="w-12 h-12 bg-brand-sage rounded-full mx-auto mb-4" />
  <h4 className="font-bold mb-2">Feature</h4>
  <p>Description</p>
</div>

// Elevated card
<div className="card-elevated p-8">
  <h3>Important Content</h3>
</div>
```

### Badge Variants

```tsx
// Sage green
<span className="badge-green">Active</span>

// Success (kept for semantic meaning)
<span className="badge-success">Completed</span>

// Warning
<span className="badge-warning">Low Balance</span>

// Error
<span className="badge-error">Error</span>
```

### Form Elements

```tsx
// Input
<input
  type="text"
  className="input"
  placeholder="Enter text..."
/>

// Input with error
<input
  type="email"
  className="input input-error"
  placeholder="Email"
/>

// Textarea
<textarea
  className="input"
  rows={4}
  placeholder="Your message..."
/>
```

---

## Layout Helpers

### Container

```tsx
<div className="container-custom">
  {/* Max width, centered, responsive padding */}
</div>

// Or manually:
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

### Responsive Grid

```tsx
// Stack on mobile, 2 cols on tablet, 3 on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  {/* Items */}
</div>

// Two column layout
<div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
  <div>{/* Left column */}</div>
  <div>{/* Right column */}</div>
</div>
```

### Spacing

```tsx
py-20    // Vertical section padding (80px)
py-16    // Medium section padding (64px)
py-12    // Small section padding (48px)

gap-8    // Grid gap (32px)
gap-6    // Smaller gap (24px)
gap-4    // Compact gap (16px)
```

---

## Animations

```tsx
// Fade in
<div className="animate-fade-in">
  {/* Content */}
</div>

// Slide up
<div className="animate-slide-up">
  {/* Content */}
</div>

// Scale in
<div className="animate-scale-in">
  {/* Content */}
</div>

// Loading spinner
<div className="spinner w-8 h-8" />
```

---

## Icons

Use heroicons or similar. Wrap in sage green circles:

```tsx
<div className="w-12 h-12 bg-brand-sage rounded-full flex items-center justify-center">
  <svg className="w-6 h-6 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
</div>
```

---

## Responsive Utilities

```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="md:hidden">Mobile only</div>

// Responsive text size
<h1 className="text-3xl md:text-4xl lg:text-5xl">
  Responsive Heading
</h1>

// Responsive padding
<section className="py-12 md:py-16 lg:py-20">
  {/* Content */}
</section>
```

---

## Typography Scale

```tsx
text-5xl md:text-6xl     // Hero headlines (48px/60px)
text-4xl md:text-5xl     // Page titles (36px/48px)
text-3xl md:text-4xl     // Section headers (30px/36px)
text-2xl                 // Card titles (24px)
text-xl                  // Large body (20px)
text-base                // Default body (16px)
text-sm                  // Small text (14px)
text-xs                  // Tiny text (12px)
```

---

## Don't Use These Colors

Avoid old blue colors:
- ❌ `bg-blue-600`
- ❌ `text-blue-700`
- ❌ `border-blue-200`

Use brand greens instead:
- ✅ `bg-brand-green`
- ✅ `text-brand-green`
- ✅ `border-brand-sage`

Exception: Keep semantic colors for clarity:
- ✅ `text-success-500` (green checkmarks)
- ✅ `text-warning-500` (warnings)
- ✅ `text-error-500` (errors)

---

## Common Mistakes

### ❌ Don't Do This

```tsx
// Using old blue colors
<button className="bg-blue-600">Click</button>

// Not using utility classes
<button style={{ backgroundColor: '#5A6C4D' }}>Click</button>

// Inconsistent rounded corners
<div className="rounded">...</div>  // Too small
```

### ✅ Do This Instead

```tsx
// Use brand colors
<button className="bg-brand-green">Click</button>

// Use utility classes
<button className="btn-primary">Click</button>

// Consistent rounded corners
<div className="rounded-xl">...</div>  // Proper size
```

---

## Getting Help

### Where to Look

1. **Theme Constants**: `/frontend/src/styles/theme.ts`
   - All colors, spacing, typography defined here

2. **Global Styles**: `/frontend/src/styles/globals.css`
   - Utility classes like `btn-primary`, `card`, etc.

3. **Example Pages**:
   - Homepage: `/frontend/src/pages/index.tsx`
   - Pricing: `/frontend/src/pages/pricing.tsx`

4. **Components**:
   - Navigation: `/frontend/src/components/Navigation.tsx`
   - Footer: `/frontend/src/components/Footer.tsx`
   - TrialCounter: `/frontend/src/components/TrialCounter/index.tsx`

### Documentation

- Full Design System: `/DESIGN_SYSTEM_UPDATE.md`
- Color Migration: `/COLOR_MIGRATION_GUIDE.md`
- This Quick Start: `/QUICKSTART_DESIGN_SYSTEM.md`

---

## Copy-Paste Starter Template

```tsx
import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function MyNewPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-brand-cream pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold text-neutral-900 mb-6">
            Your Page <span className="text-brand-green">Title</span>
          </h1>
          <p className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto">
            Your page description goes here
          </p>
          <button className="btn-primary text-lg px-8 py-4">
            Call to Action
          </button>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-neutral-900 mb-12">
            Section Heading
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="feature-card text-center">
              <div className="w-16 h-16 bg-brand-sage rounded-full flex items-center justify-center mx-auto mb-6">
                {/* Icon */}
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">
                Feature 1
              </h3>
              <p className="text-neutral-600">
                Feature description
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card text-center">
              <div className="w-16 h-16 bg-brand-sage rounded-full flex items-center justify-center mx-auto mb-6">
                {/* Icon */}
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">
                Feature 2
              </h3>
              <p className="text-neutral-600">
                Feature description
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card text-center">
              <div className="w-16 h-16 bg-brand-sage rounded-full flex items-center justify-center mx-auto mb-6">
                {/* Icon */}
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">
                Feature 3
              </h3>
              <p className="text-neutral-600">
                Feature description
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 hero-gradient text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-brand-cream mb-8">
            Start today with 3 free trial designs
          </p>
          <button className="bg-white text-brand-green hover:bg-brand-cream font-bold text-lg px-8 py-4 rounded-lg">
            Get Started Free
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
```

---

## Cheat Sheet

```tsx
// BUTTONS
btn-primary              // Sage green button
btn-secondary            // Light sage button
btn-outline              // Outlined button
btn-ghost                // Text-only button

// CARDS
card                     // White card with border
feature-card             // Card with hover effect
card-elevated            // Card with larger shadow

// BADGES
badge-green              // Sage green badge
badge-success            // Success badge (green)
badge-warning            // Warning badge (orange)
badge-error              // Error badge (red)

// BACKGROUNDS
bg-brand-green           // Sage green
bg-brand-dark-green      // Dark sage
bg-brand-cream           // Cream
bg-brand-sage            // Light sage
section-cream            // Cream section background
hero-gradient            // Green gradient

// TEXT
text-brand-green         // Brand green text
text-brand-dark-green    // Dark green text
text-neutral-900         // Headings
text-neutral-600         // Body text

// INPUTS
input                    // Styled input field
input-error              // Input with error state

// ANIMATIONS
animate-fade-in          // Fade in animation
animate-slide-up         // Slide up animation
animate-scale-in         // Scale in animation
spinner                  // Loading spinner

// LAYOUT
container-custom         // Max-width container
```

---

## One-Liners

```tsx
// Primary action button
<button className="btn-primary">Click Me</button>

// Card
<div className="card p-6">Content</div>

// Hero section
<section className="bg-brand-cream py-20">Content</section>

// Icon circle
<div className="w-12 h-12 bg-brand-sage rounded-full flex items-center justify-center">
  <svg className="w-6 h-6 text-brand-green">...</svg>
</div>

// Badge
<span className="badge-green">New</span>

// Gradient section
<section className="hero-gradient text-white py-20">Content</section>
```

---

**Quick Start Version**: 1.0.0
**Last Updated**: 2025-11-03
**Questions?** Check `/DESIGN_SYSTEM_UPDATE.md` for full documentation

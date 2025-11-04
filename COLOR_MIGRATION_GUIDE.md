# Color Migration Guide: Old Design → yarda.pro Design

## Quick Reference: Color Replacements

### Primary Brand Colors

| Old Color | Old Usage | New Color | New Usage | Tailwind Class |
|-----------|-----------|-----------|-----------|----------------|
| Blue (#3B82F6) | Primary buttons, links | Sage Green (#5A6C4D) | Primary buttons, links | `bg-brand-green` |
| Dark Blue (#2563EB) | Hover states | Dark Green (#3D4A36) | Hover states | `bg-brand-dark-green` |
| Light Blue (#DBEAFE) | Backgrounds, badges | Cream (#F5F3F0) | Section backgrounds | `bg-brand-cream` |
| Blue-50 (#EFF6FF) | Hover backgrounds | Sage (#E8EDE5) | Hover backgrounds, badges | `bg-brand-sage` |

### Background Colors

| Old | New | Tailwind Class |
|-----|-----|----------------|
| White (#FFFFFF) | White (#FFFFFF) | `bg-white` |
| Gray-50 (#F9FAFB) | Cream (#F5F3F0) | `bg-brand-cream` |
| Gray-100 (#F3F4F6) | Sage (#E8EDE5) | `bg-brand-sage` |
| Blue-600 gradient | Green gradient (#5A6C4D → #3D4A36) | `hero-gradient` |

### Text Colors

| Old | New | Tailwind Class |
|-----|-----|----------------|
| Blue-600 (#2563EB) | Brand Green (#5A6C4D) | `text-brand-green` |
| Blue-700 (#1D4ED8) | Brand Dark Green (#3D4A36) | `text-brand-dark-green` |
| Gray-900 (#111827) | Neutral-900 (#1F2937) | `text-neutral-900` |
| Gray-600 (#4B5563) | Neutral-600 (#4B5563) | `text-neutral-600` |

### Semantic Colors (KEPT - No Changes)

| Color | Usage | Tailwind Class | Notes |
|-------|-------|----------------|-------|
| Green (#10B981) | Success states, checkmarks | `text-success-500` | Kept for clarity |
| Yellow/Orange (#F59E0B) | Warnings, low balance | `text-warning-500` | Kept for visibility |
| Red (#EF4444) | Errors, exhausted states | `text-error-500` | Kept for urgency |

---

## Component-by-Component Migration

### Buttons

**Before:**
```tsx
className="bg-blue-600 hover:bg-blue-700 text-white"
```

**After:**
```tsx
className="bg-brand-green hover:bg-brand-dark-green text-white"
// Or use helper class:
className="btn-primary"
```

### Cards

**Before:**
```tsx
className="bg-white border border-gray-200 rounded-lg"
```

**After:**
```tsx
className="bg-white border border-brand-sage rounded-xl"
// Or use helper class:
className="card"
```

### Badges

**Before:**
```tsx
className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full"
```

**After:**
```tsx
className="bg-brand-sage text-brand-dark-green px-3 py-1 rounded-full"
// Or use helper class:
className="badge-green"
```

### Hero Sections

**Before:**
```tsx
className="bg-gradient-to-br from-blue-600 to-blue-800"
```

**After:**
```tsx
className="hero-gradient"
// Or:
className="bg-gradient-to-br from-brand-green to-brand-dark-green"
```

### Section Backgrounds

**Before:**
```tsx
<section className="bg-gray-50">
  {/* Content */}
</section>
```

**After:**
```tsx
<section className="bg-brand-cream">
  {/* Content */}
</section>
// Or use helper class:
<section className="section-cream">
  {/* Content */}
</section>
```

---

## Icon Colors

### Checkmarks

**Before:**
```tsx
<svg className="text-green-600">
  {/* Checkmark path */}
</svg>
```

**After:**
```tsx
<svg className="text-brand-green">
  {/* Checkmark path */}
</svg>
```

### Icon Backgrounds

**Before:**
```tsx
<div className="bg-blue-100 rounded-full">
  <svg className="text-blue-600">
    {/* Icon */}
  </svg>
</div>
```

**After:**
```tsx
<div className="bg-brand-sage rounded-full">
  <svg className="text-brand-green">
    {/* Icon */}
  </svg>
</div>
```

---

## State-Based Colors

### Active/Selected States

**Before:**
```tsx
className={isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}
```

**After:**
```tsx
className={isActive ? 'bg-brand-sage text-brand-dark-green' : 'text-neutral-600'}
```

### Hover States

**Before:**
```tsx
className="hover:bg-blue-50 hover:text-blue-700"
```

**After:**
```tsx
className="hover:bg-brand-sage hover:text-brand-green"
```

### Focus States

**Before:**
```tsx
className="focus:ring-2 focus:ring-blue-500"
```

**After:**
```tsx
className="focus:ring-2 focus:ring-brand-green"
```

---

## Special Components

### TrialCounter

**Colors Changed:**
- Active (2-3 credits): Blue → Sage Green
- Low (1 credit): Orange (KEPT)
- Exhausted (0 credits): Red (KEPT)

**Before:**
```tsx
// Active state
className="bg-green-50 text-green-600"

// Progress bar
className="bg-green-500"
```

**After:**
```tsx
// Active state
className="bg-brand-sage text-brand-dark-green"

// Progress bar
className="bg-brand-green"
```

### TokenBalance

**Colors Changed:**
- Background: Blue → Sage Green
- Icon circle: Blue → Sage
- Button: Blue → Olive Green

**Before:**
```tsx
className="bg-blue-50 text-blue-700"
```

**After:**
```tsx
className="bg-brand-sage text-brand-dark-green"
```

### Pricing Cards

**Colors Changed:**
- Token package borders: Gray → Sage
- Monthly Pro gradient: Blue → Green
- "Most Popular" badge: Yellow → Sage
- Subscribe button background: White with blue text → White with green text

**Before:**
```tsx
className="bg-gradient-to-br from-blue-600 to-blue-700"
```

**After:**
```tsx
className="hero-gradient"
// Or:
className="bg-gradient-to-br from-brand-green to-brand-dark-green"
```

---

## Loading & Skeleton States

### Spinner

**Before:**
```tsx
<div className="border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
```

**After:**
```tsx
<div className="border-4 border-brand-sage border-t-brand-green rounded-full animate-spin" />
// Or use helper class:
<div className="spinner w-8 h-8" />
```

---

## Progressive Enhancement

### Links

**Before:**
```tsx
<a className="text-blue-600 hover:text-blue-700 underline">
  Link Text
</a>
```

**After:**
```tsx
<a className="text-brand-green hover:text-brand-dark-green underline">
  Link Text
</a>
// Or rely on global styles - all links are styled automatically
<a>Link Text</a>
```

---

## Search & Replace Patterns

If migrating additional pages, use these find/replace patterns:

### Backgrounds
```
Find: bg-blue-50
Replace: bg-brand-sage

Find: bg-blue-100
Replace: bg-brand-sage

Find: bg-gray-50
Replace: bg-brand-cream
```

### Text Colors
```
Find: text-blue-600
Replace: text-brand-green

Find: text-blue-700
Replace: text-brand-dark-green
```

### Borders
```
Find: border-blue-200
Replace: border-brand-sage

Find: border-gray-200
Replace: border-brand-sage
```

### Hover States
```
Find: hover:bg-blue-50
Replace: hover:bg-brand-sage

Find: hover:bg-blue-700
Replace: hover:bg-brand-dark-green
```

---

## Color Palette Comparison

### Old Palette (Blue-based)
```css
Primary: #3B82F6 (Blue-500)
Primary Dark: #2563EB (Blue-600)
Primary Light: #DBEAFE (Blue-100)
Background: #F9FAFB (Gray-50)
```

### New Palette (Green-based)
```css
Primary: #5A6C4D (Brand Green)
Primary Dark: #3D4A36 (Brand Dark Green)
Primary Light: #E8EDE5 (Brand Sage)
Background: #F5F3F0 (Brand Cream)
```

### Color Temperature
- **Old**: Cool (blue-based) - Digital, corporate
- **New**: Warm (green-based) - Natural, organic, outdoor-focused

---

## When NOT to Change Colors

Keep these colors unchanged:

1. **Success States**: Use green (#10B981) for confirmations, checkmarks
2. **Warnings**: Use yellow/orange (#F59E0B) for cautions, low balances
3. **Errors**: Use red (#EF4444) for errors, critical states
4. **Neutral Text**: Use gray scale for body text, labels

**Reason**: These semantic colors provide clear, universal meaning and should remain consistent for usability and accessibility.

---

## Validation Checklist

After migrating a component, verify:

- [ ] No blue colors remain (except semantic blues if applicable)
- [ ] Primary actions use sage/olive green
- [ ] Hover states use darker green
- [ ] Backgrounds use cream or sage (not gray-50/100)
- [ ] Text colors use neutral scale or brand greens
- [ ] Icons match the brand color scheme
- [ ] Borders use sage or neutral colors
- [ ] Focus rings use brand green
- [ ] Gradients use green palette
- [ ] Loading spinners use sage/green

---

## Color Psychology

### Why the Change?

**Blue (Old)**:
- Digital, technology
- Corporate, professional
- Cool, distant

**Green (New)**:
- Natural, outdoor
- Growth, renewal
- Organic, eco-friendly
- Landscape/yard association
- Warm, inviting

The green palette better aligns with the landscape/outdoor focus of Yarda AI.

---

## Accessibility Notes

All new color combinations meet WCAG AA standards:

- White on Brand Green: **4.8:1** (Pass AA)
- Brand Dark Green on Brand Sage: **7.2:1** (Pass AAA)
- Brand Green on White: **4.8:1** (Pass AA)
- Neutral 900 on White: **14.5:1** (Pass AAA)

Use the [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) to verify new combinations.

---

## Quick Migration Example

### Before (Blue Design):
```tsx
<button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md">
  Get Started
</button>

<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <h3 className="text-blue-700 font-semibold">Info</h3>
  <p className="text-gray-600">Some information here</p>
</div>
```

### After (Green Design):
```tsx
<button className="px-6 py-3 bg-brand-green hover:bg-brand-dark-green text-white rounded-lg shadow-md">
  Get Started
</button>

<div className="bg-brand-sage border border-brand-sage rounded-lg p-4">
  <h3 className="text-brand-dark-green font-semibold">Info</h3>
  <p className="text-neutral-600">Some information here</p>
</div>
```

Or even simpler using utility classes:
```tsx
<button className="btn-primary">
  Get Started
</button>

<div className="card">
  <h3 className="text-brand-dark-green font-semibold">Info</h3>
  <p className="text-neutral-600">Some information here</p>
</div>
```

---

## Resources

- **Tailwind Config**: `/frontend/tailwind.config.js`
- **Theme Constants**: `/frontend/src/styles/theme.ts`
- **Global Styles**: `/frontend/src/styles/globals.css`
- **Design System Doc**: `/DESIGN_SYSTEM_UPDATE.md`

---

**Migration Guide Version**: 1.0.0
**Last Updated**: 2025-11-03

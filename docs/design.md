# Design

## Visual Identity

Affiliate Hub uses a modern, clean aesthetic optimized for product discovery and conversion.

### Color Palette
- Primary action colors from Tailwind defaults
- Product cards with subtle shadows and hover effects
- High contrast for accessibility (WCAG AA minimum)

### Typography
- System font stack for performance
- Clear hierarchy: headings, body, labels
- Readable sizes for mobile and desktop

### Layout Patterns
- **Masonry grid:** Products arranged in dynamic columns that adapt to content height
- **Modal overlay:** Platform selection without page navigation
- **Admin panels:** Form-heavy layouts with clear sections

## Component Design

### ProductCard
Visual hierarchy:
1. Product image (prominent, optimized)
2. Product name (truncated if long)
3. Price (bold, eye-catching)
4. Platform badges
5. Coupon indicator (if available)

Interaction:
- Click opens PlatformModal
- Hover effect for discoverability
- Touch-friendly tap targets (min 44x44px)

### PlatformModal
Purpose: Let user choose which platform to buy from.

Layout:
- Product summary at top
- Platform buttons in grid
- Each button shows platform logo + link indicator
- Close button (X) top-right

Accessibility:
- Focus trap when open
- Escape key closes
- Click outside closes
- Announced to screen readers

### HeroSection
- Prominent headline
- Subtitle/value proposition
- CTA if applicable
- Animated entrance (Framer Motion)

### Admin Tables
- Sortable columns
- Row actions (edit, delete)
- Inline editing where appropriate
- Pagination for large datasets

## Responsive Behavior

### Breakpoints
Tailwind's default breakpoints:
- `sm:` 640px
- `md:` 768px
- `lg:` 1024px
- `xl:` 1280px
- `2xl:` 1536px

### Mobile-First
- Base styles assume mobile
- Progressive enhancement for larger screens
- Touch targets 44x44px minimum
- No hover-only interactions

### Grid Adaptations
- 1 column on mobile
- 2 columns on tablet
- 3-4 columns on desktop
- Masonry maintains visual balance

## Animation & Motion

Framer Motion powers:
- Page transitions
- Card entrance animations
- Modal open/close
- Button feedback
- Loading states

Principles:
- Subtle, not distracting
- Respect `prefers-reduced-motion`
- Fast timing (200-300ms)
- Purposeful (guide attention, provide feedback)

## Accessibility

### Keyboard Navigation
- Tab order follows visual order
- Focus visible on all interactive elements
- Modal focus trap
- Skip links where useful

### Screen Reader Support
- Semantic HTML (`<nav>`, `<main>`, `<article>`)
- ARIA labels for icon-only buttons
- Live regions for dynamic updates
- Alt text for product images

### Color & Contrast
- Text contrast meets WCAG AA (4.5:1 for body, 3:1 for large text)
- Links distinguishable from text (not color-only)
- Form errors clearly marked

### Forms
- Labels for all inputs
- Error messages associated with fields
- Required fields indicated
- Clear validation feedback

## PWA Design

Progressive Web App features:
- Installable on mobile/desktop
- Works offline (service worker caches pages)
- App manifest with icons
- Splash screens

Offline behavior:
- Cached pages load normally
- Forms show "offline" message
- Background sync queues actions

## Performance Considerations

### Images
- Next.js Image component for optimization
- AVIF/WebP formats with fallbacks
- Lazy loading below fold
- Proper sizing (srcset)

### Code Splitting
- App Router automatic code splitting per route
- Dynamic imports for heavy components
- Suspense boundaries for loading states

### Fonts
- System fonts (no download)
- Font display strategy if custom fonts added

### Critical CSS
- Tailwind JIT generates only used classes
- Inline critical styles via Next.js

## Admin UX

### Product Management
- Quick add via URL paste
- Auto-fetch product data (with visual feedback)
- Bulk actions for common tasks
- Filters for finding products

### Coupon Management
- Link to specific products
- Expiration date picker
- Active/inactive toggle
- Copy code to clipboard button

### AI Context Management
- Per-category rules
- Test caption generation inline
- Token usage visibility
- Word substitution editor

## Error States

### User-Facing Errors
- Friendly messages (no technical jargon for public)
- Actionable advice ("Try again", "Contact support")
- Preserve form data when possible

### Admin Errors
- Technical details shown (for debugging)
- Error codes/IDs for support
- Stack traces in dev mode only

## Loading States

### Skeleton Screens
- Product grid shows placeholder cards
- Match real content layout
- Animate subtly

### Spinners
- Used sparingly (only when necessary)
- Positioned near action trigger
- Clear indication of what's loading

### Progress Indicators
- Multi-step forms show progress
- Bulk operations show count/percentage
- Long operations cancelable

## Design Tokens (Tailwind v4)

Note: Tailwind v4 config API is completely different from v3.

Configuration lives in `tailwind.config.ts`. Key customizations:
- Extended color palette if needed
- Custom spacing values
- Animation timing functions
- Breakpoint adjustments

## Icon System

Phosphor Icons (`@phosphor-icons/react`):
- Consistent style across UI
- Size variants (16, 20, 24px)
- Weight variants (regular, bold)
- Import only used icons (tree-shaking)

Common icons:
- ShoppingCart, Heart, Share, X, MagnifyingGlass, List, Plus, Trash, PencilSimple

## Future Design Considerations

- Dark mode support (currently light-only)
- Customizable themes per affiliate
- Advanced filtering/search UI
- Comparison feature (side-by-side products)
- Wishlist/favorites UI

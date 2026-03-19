# Hivemind - hivemind.davincisolutions.de

This folder contains all components and pages for the **Hivemind** domain (`hivemind.davincisolutions.de`).

## 📁 Structure

```
hivemind/
├── HivemindButton.jsx      # Button component to navigate to hivemind domain
├── HivemindRedirect.jsx    # Route component that redirects to hivemind.davincisolutions.de
├── index.js                # Exports all hivemind components
├── ui/                     # UI primitives (GlassCard, AnimatedMetric, etc.)
└── [Mobile Components]     # Copied from /mobile folder
```

## 🚀 Usage

### 1. Add Hivemind Button Anywhere

```jsx
import { HivemindButton } from './components/hivemind';

// In your component
<HivemindButton />
<HivemindButton variant="outline">Open Hivemind</HivemindButton>
```

### 2. Route Navigation

The route `/hivemind` is configured in `App.js` to redirect to `https://hivemind.davincisolutions.de`.

```jsx
// Navigate programmatically
navigate('/hivemind');

// Or use link
<Link to="/hivemind">Go to Hivemind</Link>
```

## 🌐 Vercel Configuration

To serve this content on `hivemind.davincisolutions.de`:

### Option A: Direct Navigation (Current Setup)
- User clicks button → redirects to `https://hivemind.davincisolutions.de`
- The subdomain should be configured in Vercel as a separate project or deployment

### Option B: Same Project (Middleware Required)
If you want both domains served from the same codebase:

1. Add `hivemind.davincisolutions.de` in Vercel Project Settings > Domains
2. Create `middleware.js` to detect hostname and show hivemind content:

```js
// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const hostname = request.headers.get('host');
  
  if (hostname === 'hivemind.davincisolutions.de') {
    // Rewrite to hivemind route
    return NextResponse.rewrite(new URL('/hivemind', request.url));
  }
}
```

**Note:** Your current setup is React (not Next.js), so Option A is the recommended approach.

## 📦 Components Available

All components from the `/mobile` folder are available:

- `MobileHomepage`
- `MobileHero`
- `FeatureLatency`, `FeatureContext`, `FeatureMMAR`
- `CapabilitiesSection`, `ComparisonSection`
- `GlassCard`, `AnimatedMetric`, `FeatureIcon`
- And more...

## 🔗 Related Files

- `src/App.js` - Route configuration for `/hivemind`
- `src/components/hivemind/index.js` - Component exports

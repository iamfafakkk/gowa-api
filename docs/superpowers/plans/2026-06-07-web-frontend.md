# Web Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone `/web` frontend using Vite, React, TypeScript, React Router, and MUI without disturbing the existing `src/views` UI.

**Architecture:** The frontend will live in its own `/web` directory with an isolated Vite toolchain. The initial app will provide a reusable layout, a small route tree, an MUI theme, and a Vite proxy for future backend calls.

**Tech Stack:** Vite, React, TypeScript, React Router, Material UI, Emotion

---

### Task 1: Scaffold the frontend workspace

**Files:**
- Create: `web/*`

- [ ] **Step 1: Generate the Vite React TypeScript app in `web`**

Run: `cd /Users/iamfafakkk/Desktop/GOLANG/gowa-api && npm create vite@latest web -- --template react-ts`
Expected: Vite scaffolds a new React TypeScript app under `web/`

- [ ] **Step 2: Inspect the generated files**

Run: `cd /Users/iamfafakkk/Desktop/GOLANG/gowa-api/web && ls`
Expected: includes `package.json`, `src`, `vite.config.ts`, and TypeScript config files

### Task 2: Install routing and UI dependencies

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Add runtime dependencies**

Run: `cd /Users/iamfafakkk/Desktop/GOLANG/gowa-api/web && npm install react-router-dom @mui/material @emotion/react @emotion/styled @mui/icons-material`
Expected: packages install successfully and update `package.json`

- [ ] **Step 2: Confirm dependency registration**

Run: `cd /Users/iamfafakkk/Desktop/GOLANG/gowa-api/web && cat package.json`
Expected: dependency list includes React Router, MUI, Emotion, and MUI icons

### Task 3: Replace the starter app with a routed MUI shell

**Files:**
- Create: `web/src/router/index.tsx`
- Create: `web/src/theme/index.ts`
- Create: `web/src/layouts/AppLayout.tsx`
- Create: `web/src/pages/HomePage.tsx`
- Create: `web/src/pages/AboutPage.tsx`
- Modify: `web/src/main.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/styles.css`

- [ ] **Step 1: Add the MUI theme module**

Create `web/src/theme/index.ts` with:

```ts
import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    primary: {
      main: "#1565c0",
    },
    background: {
      default: "#f4f7fb",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 16,
  },
});
```

- [ ] **Step 2: Add the shared app layout**

Create `web/src/layouts/AppLayout.tsx` with:

```tsx
import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
];

export function AppLayout() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Gowa Web
          </Typography>
          <Stack direction="row" spacing={1}>
            {navItems.map((item) => (
              <Button
                key={item.to}
                color="inherit"
                component={NavLink}
                to={item.to}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
```

- [ ] **Step 3: Add the first two route pages**

Create `web/src/pages/HomePage.tsx` with:

```tsx
import { Paper, Stack, Typography } from "@mui/material";

export function HomePage() {
  return (
    <Paper sx={{ p: 4 }}>
      <Stack spacing={1.5}>
        <Typography variant="overline" color="primary.main">
          Standalone Frontend
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          React + MUI starter for Gowa
        </Typography>
        <Typography color="text.secondary">
          This app lives in /web and is isolated from the existing embedded UI.
        </Typography>
      </Stack>
    </Paper>
  );
}
```

Create `web/src/pages/AboutPage.tsx` with:

```tsx
import { Paper, Stack, Typography } from "@mui/material";

export function AboutPage() {
  return (
    <Paper sx={{ p: 4 }}>
      <Stack spacing={1.5}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          About this frontend
        </Typography>
        <Typography color="text.secondary">
          The first setup includes Vite, React Router, and MUI so new pages can be added without restructuring.
        </Typography>
      </Stack>
    </Paper>
  );
}
```

- [ ] **Step 4: Add the route tree**

Create `web/src/router/index.tsx` with:

```tsx
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { AboutPage } from "../pages/AboutPage";
import { HomePage } from "../pages/HomePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "about",
        element: <AboutPage />,
      },
    ],
  },
]);
```

- [ ] **Step 5: Wire the theme and router into the app entry**

Update `web/src/main.tsx` to:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { appTheme } from "./theme";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 6: Keep `App.tsx` minimal**

Update `web/src/App.tsx` to:

```tsx
export default function App() {
  return null;
}
```

- [ ] **Step 7: Replace starter CSS with minimal global styles**

Update `web/src/styles.css` to:

```css
:root {
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: #0f172a;
  background-color: #f4f7fb;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
}

a {
  color: inherit;
  text-decoration: none;
}
```

### Task 4: Add Vite proxy support and verify the build

**Files:**
- Modify: `web/vite.config.ts`

- [ ] **Step 1: Add a local API proxy**

Update `web/vite.config.ts` to:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 2: Run a production build**

Run: `cd /Users/iamfafakkk/Desktop/GOLANG/gowa-api/web && npm run build`
Expected: Vite completes successfully and writes the production bundle into `web/dist`

# Web Frontend Design

## Summary

Add a new standalone frontend in `/web` using Vite, React, TypeScript, React Router, and MUI.
This frontend is separate from the existing embedded UI in `src/views` and does not replace it.

## Goals

- Create a clean React application root in `/web`
- Use `react-router-dom` for client-side routing
- Use `@mui/material` as the UI foundation
- Keep the initial structure simple and easy to extend
- Prepare local development for future backend integration through a Vite `/api` proxy

## Non-Goals

- Replacing `src/views`
- Embedding the React build into the Go binary
- Building production feature pages beyond starter routes
- Adding state management libraries or data fetching layers

## Architecture

The new frontend lives in `/web` as an isolated SPA. It owns its own package manifest, TypeScript config, Vite config, and source tree.

The app bootstraps through `src/main.tsx`, wraps the router with MUI `ThemeProvider` and `CssBaseline`, and renders a small app shell with top navigation and routed page content.

## Initial File Structure

- `web/package.json`
- `web/tsconfig.json`
- `web/tsconfig.app.json`
- `web/tsconfig.node.json`
- `web/vite.config.ts`
- `web/index.html`
- `web/src/main.tsx`
- `web/src/App.tsx`
- `web/src/router/index.tsx`
- `web/src/theme/index.ts`
- `web/src/layouts/AppLayout.tsx`
- `web/src/pages/HomePage.tsx`
- `web/src/pages/AboutPage.tsx`
- `web/src/styles.css`

## Routing

The initial router uses browser history with two routes:

- `/` renders a home page placeholder
- `/about` renders a secondary page placeholder

The layout persists across routes and exposes navigation links so the app is immediately testable.

## UI Direction

Use a light MUI theme with:

- `CssBaseline` enabled
- a straightforward blue primary palette
- a neutral background for the app shell
- standard MUI layout primitives (`AppBar`, `Toolbar`, `Container`, `Paper`, `Stack`, `Typography`)

The initial UI should feel production-ready enough to extend, but avoid speculative complexity.

## Development Experience

The Vite dev server stays independent from the Go server. `vite.config.ts` should include a proxy entry for `/api` to `http://localhost:3000` so future API integration can happen without changing frontend call sites. If the backend later runs on another port, this proxy can be adjusted in one place.

## Verification

Minimum verification for this task:

- dependency install completes in `/web`
- `npm run build` succeeds in `/web`

## Risks And Constraints

- Network access is required for npm package installation
- This repo currently has no existing frontend workspace at `/web`, so all files will be new
- The proxy target is an assumption for future convenience and may need to be aligned with the actual backend port later

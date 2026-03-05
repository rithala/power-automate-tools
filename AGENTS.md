# AGENTS.md

## Project Overview

Power Automate Tools is a Chrome/Edge browser extension (Manifest V3) that lets users edit Microsoft Power Automate flow definitions as raw JSON using an embedded Monaco Editor. It piggybacks on the user's existing Power Automate session by intercepting API requests to extract auth tokens, then uses those tokens for its own API calls to fetch, save, and validate flows.

## Tech Stack

- **Language:** TypeScript (strict mode)
- **UI:** React 18, Fluent UI React (`@fluentui/react`)
- **Editor:** Monaco Editor (`@monaco-editor/react`)
- **Bundler:** Webpack 5 (two entry points: `background.ts` and `app.tsx`)
- **Platform:** Chrome Extension Manifest V3
- **Package Manager:** npm
- **License:** GPL v3

## Project Structure

```
src/
  app.tsx                          # React SPA entry point (editor tab)
  background.ts                    # Chrome extension background service worker
  styles/theme.ts                  # Fluent UI theme definition
  schemas/                         # JSON schemas for Monaco validation
    flow-editor.json               # Custom wrapper schema
    workflowdefinition.json        # Official Microsoft Logic Apps schema
  features/flow-editor/            # Feature module for the editor
    FlowEditorPage.tsx             # Main editor page component
    FlowValidationResult.tsx       # Validation results panel
    useFlowEditor.ts               # Core business logic hook (fetch/save/validate)
    types.ts                       # FlowError type
  common/
    components/                    # Shared UI components (Messages, LoaderModal, NavBar)
    providers/ApiProvider.ts       # React Context providing authenticated HTTP methods
    types/backgroundActions.ts     # Discriminated union types for Chrome messaging
public/                            # Static assets copied to dist/ (manifest.json, icons, app.html)
scripts/pack-extension.ps1         # PowerShell script to pack .crx
```

## Architecture

1. **Background service worker** (`background.ts`) intercepts web requests to `*.api.flow.microsoft.com/*`, extracts Bearer tokens from the Authorization header, and manages extension state (auth token, API URL, tab IDs). It opens the editor in a new tab when the extension icon is clicked.

2. **React SPA** (`app.tsx`) runs in a separate tab with Monaco Editor. It receives auth tokens from the background worker via `chrome.runtime.onMessage` and stores them in `ApiProviderContext`. Flow/environment IDs are passed via URL query parameters.

3. **API calls** go through `ApiProvider.ts`, which appends `?api-version=2016-11-01` and the auth header to all requests.

4. **JSON Schema validation** is handled by Monaco Editor using the bundled Microsoft Logic Apps workflow definition schema.

## Code Conventions

- **No default exports** -- all components and hooks use named exports.
- **Functional components only** -- no class components.
- **Custom hooks pattern** -- business logic lives in hooks (`useFlowEditor`, `useMessageBar`), components are thin rendering layers.
- **Fluent UI deep imports** -- import from specific sub-paths (e.g., `@fluentui/react/lib/CommandBar`) for tree-shaking.
- **CSS-in-JS** -- use `mergeStyles()` from Fluent UI. No CSS files or CSS modules.
- **TypeScript strict mode** -- `"strict": true` in tsconfig.json.
- **Feature-based folder structure** -- feature code under `src/features/`, shared code under `src/common/`.
- **Discriminated unions for messaging** -- Chrome message types use a TypeScript discriminated union (`Actions` type in `backgroundActions.ts`).

## Build & Development

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm start` | Development mode with Webpack watch + progress |
| `npm run build` | Production build (cleans `dist/`, builds with `NODE_ENV=production`) |
| `npm run clean` | Remove `dist/` directory |

To develop locally: run `npm start`, then load the `dist/` directory as an unpacked extension in Chrome/Edge.

## CI

GitHub Actions (`.github/workflows/build.yml`) runs on push/PR to `master`:
- Node.js 16.x on `ubuntu-latest`
- `npm ci` then `npm run build`
- Uploads `dist/` as a build artifact

## Testing

There are no tests or test framework in this project. There is no test script in `package.json`.

## Key Details for AI Agents

- The extension does **not** implement its own OAuth flow. It intercepts tokens from the user's existing Power Automate session via the `chrome.webRequest` API.
- The Power Automate API version `2016-11-01` is hardcoded in `ApiProvider.ts`.
- The background worker handles multiple Power Automate URL formats (flow.microsoft.com, make.powerautomate.com, make.powerapps.com).
- The `workflowdefinition.json` schema is ~2460 lines and is the official Microsoft schema -- do not modify it unless updating from the upstream source.
- The `public/manifest.json` defines extension permissions, content security policy, and host permissions for `*.flow.microsoft.com`.

# Copilot Instructions for Astromission

## Project Overview
This is an Astro 5.16+ application using Tailwind CSS v4 (Vite plugin) and TailwindPlus Elements for interactive components. The app implements a responsive sidebar navigation layout targeting a torrent/download management interface. The goal of this project is to create a webclient UI for Transmission bittorrent daemon, similar to Transmission Web UI but with a modern design and improved UX.

## Architecture & Structure

### Component Organization
- **Layout System**: Single `Layout.astro` wraps all pages with sidebar + header navigation
  - Desktop sidebar (`SidebarDesktop.astro`): Fixed at `lg:w-72`, visible `lg:` breakpoint and above
  - Mobile sidebar (`SidebarMobile.astro`): Dialog-based using `<el-dialog>` with backdrop
  - Mobile header (`HeaderMobile.astro`): Sticky header with hamburger menu trigger
  
### Key Files
- `src/layouts/Layout.astro`: Master layout with responsive sidebar structure
- `src/data/menu.ts`: Centralized menu configuration (currently: Downloading, Seeding, Paused, Completed)
- `src/styles/global.css`: Single-line Tailwind import (`@import "tailwindcss"`)
- `astro.config.mjs`: Vite configuration with `@tailwindcss/vite` plugin

## Development Workflow

### Commands (from project root)
```bash
npm run dev      # Dev server at localhost:4321
npm run build    # Production build to ./dist/
npm run preview  # Preview production build
```

### Component Patterns

#### TailwindPlus Elements Integration
- Import via `<script>` tag in layout: `import "@tailwindplus/elements"`
- Dialog component: `<el-dialog>` with `<el-dialog-backdrop>` and `<el-dialog-panel>`
- Dropdown: `<el-dropdown>` with nested `<el-menu>` (anchor="bottom end", popover attribute)
- Command attributes: `command="show-modal"`, `commandfor="sidebar"` for dialog triggers
- State classes: `data-closed:*` utilities for transition states

#### Responsive Design Strategy
- Desktop sidebar: Hidden on mobile (`hidden`), fixed positioning on desktop (`lg:fixed lg:inset-y-0`)
- Content area: Left padding on desktop only (`lg:pl-72`) to account for fixed sidebar
- Mobile-only elements: `lg:hidden` class (header, hamburger button)
- Breakpoint: Primary responsive breakpoint is `lg:` (1024px)

#### Menu Item Structure
Currently hardcoded in components, but `src/data/menu.ts` exists as the intended source. Menu items follow this pattern:
```astro
<a href="#" class="group flex gap-x-3 rounded-md bg-white/5 py-2 pl-2 pr-4 text-sm/6 font-semibold text-white">
  <svg><!-- icon --></svg>
  <div class="flex items-center justify-between w-full">
    <span>Label</span>
    <span class="rounded-full bg-gray-600 size-5 px-5 flex items-center justify-center">Count</span>
  </div>
</a>
```

### Styling Conventions
- Dark theme: `bg-gray-900` base, `bg-black/10` overlays, `border-white/10` dividers
- Active state: `bg-white/5 text-white`
- Hover state: `hover:bg-white/5 hover:text-white` on `text-gray-400` base
- Typography: `text-sm/6` (14px text, 1.5rem line-height) for most UI text
- Icons: `size-6` (24x24px) from Heroicons, inline SVG with `stroke-width="1.5"`

## TypeScript Configuration
- Strict mode enabled (`extends "astro/tsconfigs/strict"`)
- Includes `.astro/types.d.ts` for Astro component typing

## Transmission API Integration

### Architecture
This project uses a **static build** deployment model, designed to be extracted and placed in Transmission's web directory (`TRANSMISSION_WEB_HOME`). All API communication happens client-side from the browser to the Transmission daemon's RPC endpoint.

### RPC Specification
The complete Transmission RPC specification is documented in `src/docs/rpc-specs.md`. Consult this file for:
- Official JSON-RPC 2.0 protocol details (Transmission 4.1.0+)
- All available RPC methods (`torrent_get`, `torrent_set`, `torrent_add`, `session_get`, etc.)
- Request/response parameter schemas and data types
- Torrent status codes, tracker stats, peer information, and file structures
- Session configuration options and statistics
- Queue management, bandwidth groups, and port testing

**Important**: Transmission 4.1.0+ uses `snake_case` for all RPC strings and JSON-RPC 2.0 protocol. The old bespoke API and mixed case strings are deprecated.

### @ctrl/transmission Package
This project uses `@ctrl/transmission` (v7.4.0), a TypeScript-native wrapper providing normalized methods for the Transmission API.

#### Centralized Client: `src/utils/transmissionClient.ts`
All Transmission API calls use the centralized client instance exported from this file:
```typescript
import { transmissionClient } from '../utils/transmissionClient';
```

**Client Configuration:**
- **Development**: Uses environment variables from `.env` (see `.env.example`)
- **Production**: Automatically connects to `window.location.origin` (same origin as served files)
- This allows the static build to work when deployed to Transmission's web directory without configuration

**Environment Variables** (`.env` for local development):
- `TRANSMISSION_HOST` - Default: `localhost`
- `TRANSMISSION_SSL` - Default: `false`
- `TRANSMISSION_PORT` - Default: `9091`
- `TRANSMISSION_PATH` - Default: `/transmission/rpc`
- `TRANSMISSION_USERNAME` - Default: empty
- `TRANSMISSION_PASSWORD` - Default: empty

#### Type Imports
All Transmission types are re-exported through `transmissionClient.ts`:
```typescript
import type { Torrent, NormalizedTorrent, SessionArguments } from '../utils/transmissionClient';
```

**CRITICAL**: Type sources differ by package:
- `@ctrl/transmission`: Exports `Torrent`, `SessionArguments`, `SessionResponse`, `TorrentClient`
- `@ctrl/shared-torrent`: Exports `NormalizedTorrent`, `AllClientData`, `TorrentState`
- Both packages are re-exported through `transmissionClient.ts` for convenience

#### NormalizedTorrent Data Structure
**IMPORTANT**: The `NormalizedTorrent` type has critical quirks:
- **`progress`**: Despite type docs saying "progress percent out of 100", this is actually a **0-1 decimal range**, not 0-100!
  - Example values: `0.5` = 50%, `1.0` = 100%, `0.0206` = 2.06%
  - To check for completed torrents: `torrent.progress >= 1` (NOT `>= 100`)
- **`state`**: String enum with values: `'downloading'`, `'seeding'`, `'paused'`, `'queued'`, `'checking'`, `'warning'`, `'error'`, `'unknown'`
- **`isCompleted`**: Boolean flag (may not match `progress >= 1` for partially-selected file torrents)
- **`raw`**: Contains full raw `Torrent` object from Transmission RPC with detailed fields
- Speeds are in bytes per second: `downloadSpeed`, `uploadSpeed`
- Sizes are in bytes: `totalDownloaded`, `totalUploaded`, `totalSize`

#### Status Mapping
The UI maps normalized `state` strings to Transmission RPC status numbers:
- `0` = Stopped/Paused (`state: 'paused'`) → UI color: `bg-amber-500`
- `2` = Verifying (`state: 'checking'`)
- `3` = Queued to download (`state: 'queued'` + downloading context)
- `4` = Downloading (`state: 'downloading'`) → UI color: `bg-blue-500`
- `6` = Seeding (`state: 'seeding'`) → UI color: `bg-green-500`

Special filters:
- `'finished'`: Custom filter for torrents with `progress >= 1` (100% complete), regardless of status

#### Utility Functions: `src/utils/transmission.ts`
Convenience wrappers around the client for common operations:
- `getTorrents()` - Returns `AllClientData` with `torrents` array (NormalizedTorrent[])
- `getSessionSettings()` - Returns `SessionResponse` 
- `getTorrentDetails(id)` - Returns `NormalizedTorrent` for specific torrent

#### Key Normalized Methods
The wrapper provides a standardized interface:

- **`getAllData()`**: Returns all torrent data and labels
  ```typescript
  const data = await transmissionClient.getAllData();
  // data.torrents: Torrent[]
  // data.labels: string[]
  ```

- **`getTorrent(id)`**: Returns single torrent data
  ```typescript
  const torrent = await transmissionClient.getTorrent(torrentId);
  ```

- **`getSession()` / `setSession(args)`**: Get/set session configuration
  ```typescript
  const session = await transmissionClient.getSession();
  await transmissionClient.setSession({ 'speed-limit-down': 1000 });
  ```

- **`pauseTorrent(id)` / `resumeTorrent(id)`**: Control torrent state
- **`removeTorrent(id, removeData)`**: Remove torrent, optionally deleting files
- **`addTorrent(options)`**: Add new torrent from URL/magnet/file

#### Documentation Requests
When implementing features that require @ctrl/transmission methods not documented above, **ask the user for additional API documentation** rather than guessing method signatures or behavior.

### Type System
- `src/types.ts` re-exports all types from both `@ctrl/transmission` and `@ctrl/shared-torrent` via the client wrapper
- **Type Source Reference**:
  - From `@ctrl/transmission`: `Torrent`, `SessionArguments`, `SessionResponse`, `TorrentClient`
  - From `@ctrl/shared-torrent`: `NormalizedTorrent`, `AllClientData`, `TorrentState`
- Legacy type aliases (`TorrentDetails`, `TransmissionSession`) maintained for backwards compatibility
- Use types from `../utils/transmissionClient` in components, which provides a unified export point

### Data Format Gotchas
**CRITICAL**: When working with torrent data:
1. **Progress is 0-1, not 0-100**: `progress: 0.5` means 50%, `progress: 1` means 100%
2. **Check completion with `>= 1`**: Never use `>= 100` for progress checks
3. **State vs Status**: Use string `state` from NormalizedTorrent, map to numeric status only for filtering
4. **Raw data access**: Use `torrent.raw as Torrent` to access full Transmission RPC fields

## Build & Deployment

### Build Process
```bash
npm run build  # Outputs to ./dist/
```

### Deployment Model
1. Build creates a static site in `dist/`
2. Users extract `dist/` contents to Transmission's web directory
3. Access via Transmission daemon's built-in web server (typically `http://localhost:9091`)
4. Client-side JavaScript connects to same-origin RPC endpoint automatically

**Key Configuration:**
- `astro.config.mjs`: Set to `output: "static"` for static site generation
- No server-side rendering in production builds
- All Transmission API calls happen from browser using `@ctrl/transmission`

## Known Gaps & TODO
- Tracker statistics not yet displayed in torrent details (basic Tracker type lacks stats)

# Astromission

A modern, responsive web UI for Transmission BitTorrent daemon. Built with Astro 5.16+ and Tailwind CSS v4, Astromission provides a sleek alternative to the default Transmission Web UI with improved UX and modern design.

## Features

- **Modern Interface**: Clean, dark-themed design with responsive layout
- **Real-time Updates**: Live torrent status monitoring and progress tracking
- **Mobile-Friendly**: Fully responsive sidebar navigation with mobile drawer
- **Comprehensive Controls**: Add, pause, resume, and remove torrents with detailed configuration options
- **Session Management**: Configure download/upload speeds, port settings, and global preferences
- **Filter Views**: Quick access to downloading, seeding, paused, and completed torrents

## Technology Stack

- **Framework**: Astro 5.16+ (static site generation)
- **Styling**: Tailwind CSS v4 (Vite plugin)
- **UI Components**: TailwindPlus Elements
- **API Client**: @ctrl/transmission (TypeScript wrapper for Transmission RPC)
- **Build Tool**: Vite

## Requirements

- Node.js 18+ and npm
- Transmission daemon (4.1.0+ recommended) running with RPC enabled

## Development

### Setup

1. Clone the repository:
```bash
git clone https://github.com/f3bruary/Astromission.git
cd Astromission
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and configure your local Transmission daemon:
```bash
cp .env.example .env
```

Edit `.env` with your Transmission settings:
```env
TRANSMISSION_HOST=localhost
TRANSMISSION_SSL=false
TRANSMISSION_PORT=9091
TRANSMISSION_PATH=/transmission/rpc
TRANSMISSION_USERNAME=
TRANSMISSION_PASSWORD=
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:4321`

### Build Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start development server at localhost:4321 |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview production build locally |

## Deployment

Astromission is designed to be deployed as a static web interface that connects directly to your Transmission daemon's RPC endpoint.

### Download a Release

1. Go to the [Releases page](https://github.com/f3bruary/Astromission/releases)
2. Download the latest `astromission-vX.X.X.zip` file
3. Extract the archive

### Installation

You have two deployment options:

#### Option 1: Replace Transmission's Default Web UI

1. Locate your Transmission web directory (varies by platform):
   - **Linux**: `/usr/share/transmission/web/` or `/usr/share/transmission/public_html/`
   - **macOS**: `/Applications/Transmission.app/Contents/Resources/web/`
   - **Windows**: `C:\Program Files\Transmission\web\`
   
2. **Backup the original web UI**:
   ```bash
   sudo mv /usr/share/transmission/web /usr/share/transmission/web.backup
   ```

3. Extract the Astromission files to the web directory:
   ```bash
   sudo unzip astromission-vX.X.X.zip -d /usr/share/transmission/web
   ```

4. Restart Transmission daemon (if needed)

5. Access the UI at `http://localhost:9091` (or your configured Transmission web port)

#### Option 2: Serve via Custom Web Server

1. Extract the files to any directory
2. Serve the `dist/` folder with your preferred web server (nginx, Apache, etc.)
3. Configure CORS on your Transmission daemon to allow requests from your domain
4. The UI will automatically connect to the same origin, or you can configure it to point to a different Transmission instance

### Updating Environment Variables

The production build connects to the same origin as the served files by default. For custom deployments:

1. Set environment variables before building:
   ```bash
   export TRANSMISSION_HOST=your-host
   export TRANSMISSION_PORT=9091
   npm run build
   ```

2. Or configure your reverse proxy to forward `/transmission/rpc` requests to your Transmission daemon

## Architecture

Astromission uses a **static build deployment model**:

- All files are static HTML, CSS, and JavaScript
- API communication happens client-side from the browser to Transmission's RPC endpoint
- No server-side components or Node.js runtime required in production
- Works seamlessly when deployed to Transmission's built-in web server

## API Documentation

This project uses the Transmission RPC API (JSON-RPC 2.0 protocol). Full API documentation is available in `src/docs/rpc-specs.md`.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see LICENSE file for details

## Credits

- Built with [Astro](https://astro.build)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- API wrapper by [@ctrl/transmission](https://github.com/scttcper/transmission)
- Icons from [Heroicons](https://heroicons.com)

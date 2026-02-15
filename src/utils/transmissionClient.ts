import { Transmission } from '@ctrl/transmission';

// Re-export all types from @ctrl/transmission for consistent imports throughout the app
// Note: NormalizedTorrent and AllClientData are from @ctrl/shared-torrent (dependency of @ctrl/transmission)
// They're returned by Transmission methods but we access them through @ctrl/transmission's type system
export type { 
  Torrent,
  GetTorrentRepsonse,
  SessionResponse,
  SessionArguments,
  AddTorrentOptions,
  AddTorrentResponse,
  SetTorrentOptions,
  RenamePathOptions,
  FreeSpaceResponse,
  DefaultResponse,
  Files,
  FileStats,
  Tracker,
  Peers,
  PeersFrom,
  Units,
  TorrentIds,
  NormalizedTorrentIds
} from '@ctrl/transmission';

// Import types that come from @ctrl/shared-torrent (used by Transmission class methods)
import type { AllClientData, NormalizedTorrent } from '@ctrl/shared-torrent';

// Re-export for convenience
export type { AllClientData, NormalizedTorrent };

// Environment variable defaults matching Flood's pattern
// Note: PUBLIC_ prefix is required for client-side access in Astro
const TRANSMISSION_HOST = import.meta.env.PUBLIC_TRANSMISSION_HOST || 'localhost';
const TRANSMISSION_SSL = import.meta.env.PUBLIC_TRANSMISSION_SSL === 'true' || false;
const TRANSMISSION_PORT = import.meta.env.PUBLIC_TRANSMISSION_PORT || '9091';
const TRANSMISSION_PATH = import.meta.env.PUBLIC_TRANSMISSION_PATH || '/transmission/rpc';
const TRANSMISSION_USERNAME = import.meta.env.PUBLIC_TRANSMISSION_USERNAME || '';
const TRANSMISSION_PASSWORD = import.meta.env.PUBLIC_TRANSMISSION_PASSWORD || '';

// Construct the base URL
// IMPORTANT: @ctrl/transmission appends '/transmission/rpc' to baseUrl automatically
// So baseUrl should be just protocol://host:port
let baseUrl: string;
const protocol = TRANSMISSION_SSL ? 'https' : 'http';

if (typeof window !== 'undefined') {
  // Client-side: Check if we're in Astro dev mode or production
  const isDev = window.location.port === '4321' || window.location.port === '4322' || import.meta.env.DEV;
  
  if (isDev) {
    // Development mode - always use env vars to connect to Transmission server
    // (which might be on another machine)
    baseUrl = `${protocol}://${TRANSMISSION_HOST}:${TRANSMISSION_PORT}`;
  } else {
    // Production mode - deployed to Transmission web dir, use same origin
    baseUrl = window.location.origin;
  }
} else {
  // Server-side (build time): use env vars for initial render
  baseUrl = `${protocol}://${TRANSMISSION_HOST}:${TRANSMISSION_PORT}`;
}

// Create and export the configured Transmission client instance
export const transmissionClient = new Transmission({
  baseUrl,
  username: TRANSMISSION_USERNAME || undefined,
  password: TRANSMISSION_PASSWORD || undefined,
});

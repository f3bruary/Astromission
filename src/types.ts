// Re-export types from @ctrl/transmission for consistent use throughout the app
export type {
	Torrent,
	NormalizedTorrent,
	AllClientData,
	SessionArguments,
	SessionResponse,
	Files,
	FileStats,
	Tracker,
	Peers,
	PeersFrom,
	AddTorrentOptions,
	AddTorrentResponse,
	SetTorrentOptions,
	TorrentIds,
	NormalizedTorrentIds,
	GetTorrentRepsonse,
	DefaultResponse,
	Units
} from './utils/transmissionClient';

// Custom response wrapper (if still needed for specific use cases)
export interface TransmissionResponse {
  arguments: {
    torrents: import('./utils/transmissionClient').Torrent[];
  };
  result: string;
}
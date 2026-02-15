import { transmissionClient } from './transmissionClient';
import type { AllClientData, NormalizedTorrent, SessionResponse } from './transmissionClient';

/**
 * Get all torrents with normalized data structure
 * @returns AllClientData containing torrents array and labels
 */
export async function getTorrents(): Promise<AllClientData | null> {
	try {
		return await transmissionClient.getAllData();
	} catch (error) {
		console.error("Error fetching torrents:", error);
		return null;
	}
}

/**
 * Get session settings from Transmission
 * @returns SessionResponse with session configuration
 */
export async function getSessionSettings(): Promise<SessionResponse | null> {
	try {
		return await transmissionClient.getSession();
	} catch (error) {
		console.error("Error fetching session settings:", error);
		return null;
	}
}

/**
 * Get detailed information for a specific torrent
 * @param torrentId - The ID of the torrent to fetch
 * @returns NormalizedTorrent with full torrent details
 */
export async function getTorrentDetails(torrentId: number): Promise<NormalizedTorrent | null> {
	try {
		return await transmissionClient.getTorrent(torrentId);
	} catch (error) {
		console.error("Error fetching torrent details:", error);
		return null;
	}
}

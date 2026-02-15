import type { NormalizedTorrent } from '../types';
import { formatBytes, formatSpeed, formatETA, getStatusText, getStatusColor, renderErrorBanner } from './formatters';

// Import Torrent type for raw data access
import type { Torrent } from '@ctrl/transmission';

/**
 * Generates the HTML for a torrent list item
 * Uses NormalizedTorrent from @ctrl/shared-torrent (returned by @ctrl/transmission methods)
 */
export function renderTorrentHTML(torrent: NormalizedTorrent): string {
	// NormalizedTorrent properties from @ctrl/shared-torrent:
	// - progress (0-1 decimal) for completion percentage
	// - state (TorrentState enum: 'downloading', 'seeding', 'paused', 'queued', 'checking', etc.)
	// - downloadSpeed/uploadSpeed (bytes per second)
	// - totalDownloaded/totalUploaded (total bytes)
	// - isCompleted (boolean)
	
	const progress = torrent.progress ?? 0;
	const percentComplete = Math.round(progress * 100);
	const downloaded = torrent.totalDownloaded ?? 0;
	
	// Map state string to status number for formatters
	// Note: Don't check isCompleted first - a completed torrent can be stopped (status 0)
	const state = torrent.state ?? 'unknown';
	let statusNum = 0;
	if (state === 'downloading') statusNum = 4;
	else if (state === 'seeding') statusNum = 6;
	else if (state === 'paused') statusNum = 0; // paused/stopped
	else if (state === 'checking') statusNum = 2;
	else if (state === 'queued') statusNum = 3; // generic queued
	
	const statusText = getStatusText(statusNum);
	const statusColor = getStatusColor(statusNum);
	const dlSpeed = formatSpeed(torrent.downloadSpeed ?? 0);
	const ulSpeed = formatSpeed(torrent.uploadSpeed ?? 0);
	const downloadedFormatted = formatBytes(downloaded);
	const totalFormatted = formatBytes(torrent.totalSize ?? 0);
	const eta = formatETA(torrent.totalSize ?? 0, progress, torrent.downloadSpeed ?? 0);
	
	// Check for errors from raw torrent data
	const rawTorrent = torrent.raw as Torrent;
	const hasError = rawTorrent?.error && rawTorrent.error !== 0;
	const errorString = rawTorrent?.errorString || '';
	
	// Get the numeric torrent ID from raw data (NormalizedTorrent.id is a hash string)
	const torrentId = rawTorrent?.id ?? 0;
	
	// Escape JSON for HTML attribute
	const torrentDataJson = JSON.stringify(torrent).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

	// Determine which button to show: if paused (status 0), show resume; otherwise show pause
	const isPaused = statusNum === 0;
	const pauseButtonHtml = !isPaused ? `
		<button type="button" class="cursor-pointer button-pause">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-6 opacity-80 hover:opacity-100 transition-opacity text-gray-700 dark:text-gray-200">
				<path fill-rule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM5.5 5.5A.5.5 0 0 1 6 5h.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-5Zm4-.5a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5h.5a.5.5 0 0 0 .5-.5v-5A.5.5 0 0 0 10 5h-.5Z" clip-rule="evenodd"></path>
			</svg>
		</button>
	` : '';
	const resumeButtonHtml = isPaused ? `
		<button type="button" class="cursor-pointer button-resume">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-6 opacity-80 hover:opacity-100 transition-opacity text-gray-700 dark:text-gray-200">
				<path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.847-9.766A.75.75 0 0 0 6 5.866v4.268a.75.75 0 0 0 1.153.633l3.353-2.134a.75.75 0 0 0 0-1.266L7.153 5.234Z" clip-rule="evenodd"></path>
			</svg>
		</button>
	` : '';

		return `
<li class="py-4 group select-none" data-torrent-id="${torrentId}" data-torrent="${torrentDataJson}">
	<div class="p-px relative">
		<div class="${statusColor} h-px absolute block inset-x-px bottom-px z-10" style="width: ${percentComplete}%;"></div>
		<div class="relative dark:text-gray-200 bg-white transition hover:bg-gray-100 duration-400 dark:bg-gray-800 dark:hover:bg-gray-700 p-4 border border-gray-400 dark:border-white/20 dark:opacity-100">
			<div class="flex gap-x-4 justify-between items-center">
				<span class="md:text-xl block font-medium tracking-wide">${torrent.name}</span>
				<div class="flex items-center gap-x-2 opacity-0 group-hover:opacity-100 transition delay-200 duration-400">
					${pauseButtonHtml}
					${resumeButtonHtml}
					<button type="button" class="cursor-pointer button-delete">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-6 opacity-80 hover:opacity-100 transition-opacity text-gray-700 dark:text-gray-200">
							<path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd"></path>
						</svg>
					</button>
					<button type="button" command="show-modal" commandfor="drawer" class="cursor-pointer button-info">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-6 opacity-80 hover:opacity-100 transition-opacity text-gray-700 dark:text-gray-200">
							<path fill-rule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clip-rule="evenodd"></path>
						</svg>
					</button>
				</div>
			</div>
		<div class="mt-2 text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-x-4 italic">
			<span>Status: ${statusText}</span>
			<span class="middot max-md:hidden">&middot;</span>
			<span>DL: ${dlSpeed}</span>
			<span class="middot max-md:hidden">&middot;</span>
			<span>UL: ${ulSpeed}</span>
			<span class="md:ml-auto">${downloadedFormatted}/${totalFormatted}</span>
			<span class="middot max-md:hidden">&middot;</span>
			<span class="inline-block text-right" style="width: 4ch">${percentComplete}%</span>
			<span class="middot max-md:hidden">&middot;</span>
			<span>ETA: ${eta}</span>
		</div>
		${hasError ? renderErrorBanner(errorString, 'sm') : ''}
		</div>
	</div>
</li>`;
}

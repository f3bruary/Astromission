// Modal and drawer functionality
import { transmissionClient } from '../utils/transmissionClient';
import type { 
	NormalizedTorrent,
	Torrent,
	SessionArguments,
	Files,
	FileStats,
	Tracker
} from '../utils/transmissionClient';
import { renderErrorBanner } from '../utils/formatters';
import { notify } from '../utils/notifications';

// Type alias for torrent data used in the UI
type TorrentData = NormalizedTorrent;

// Type alias for session settings used in the UI  
type SessionSettings = SessionArguments;

document.addEventListener('DOMContentLoaded', () => {
	// Query el-dialog elements (not the inner dialog elements)
	const settingsDialog = document.querySelector('el-dialog:has(#settings-modal)') as HTMLElement | null;
	const torrentDrawer = document.querySelector('el-dialog:has(#drawer)') as HTMLElement | null;
	const deleteDialog = document.querySelector('el-dialog:has(#delete-torrent-modal)') as HTMLElement | null;
	const deleteAllDialog = document.querySelector('el-dialog:has(#delete-all-torrents-modal)') as HTMLElement | null;
	const addTorrentDialog = document.querySelector('el-dialog:has(#add-torrent-modal)') as HTMLElement | null;
	
	let currentTorrentId: number | null = null;
	let pendingDeleteTorrentId: number | null = null;
	let defaultDownloadDir = '/downloads'; // Default fallback

	// Fetch default download directory on page load
	async function fetchDefaultDownloadDir() {
		try {
			const data = await transmissionClient.getSession();
			if (data.result === 'success' && data.arguments?.['download-dir']) {
				defaultDownloadDir = data.arguments['download-dir'] as string;
				// Update the input if it exists
				const destinationInput = document.getElementById('destination-folder') as HTMLInputElement;
				if (destinationInput) {
					destinationInput.value = defaultDownloadDir;
				}
			}
		} catch (error) {
			console.error('Error fetching default download directory:', error);
		}
	}

	// Fetch on load
	fetchDefaultDownloadDir();

	// Handle delete confirmation button
	const confirmDeleteButton = document.getElementById('confirm-delete-button');
	if (confirmDeleteButton) {
		confirmDeleteButton.addEventListener('click', async () => {
			if (pendingDeleteTorrentId === null) return;
			
			const checkbox = document.getElementById('delete-data-checkbox') as HTMLInputElement;
			const deleteData = checkbox ? checkbox.checked : false;
			
			// Get torrent name for notification
			const nameElement = document.getElementById('delete-torrent-name');
			const torrentName = nameElement?.textContent?.replace('Are you sure you want to remove "', '').replace('"?', '') || undefined;
			
			try {
				await transmissionClient.removeTorrent([pendingDeleteTorrentId], deleteData);
				
				// Close the modal
				if (deleteDialog) {
					deleteDialog.removeAttribute('open');
				}
				
				// Reset
				pendingDeleteTorrentId = null;
				
				// Show success notification
				notify.torrentDeleted(torrentName, deleteData);
				
				// Trigger a refresh
				window.dispatchEvent(new CustomEvent('torrent-updated'));
			} catch (error) {
				console.error('Error removing torrent:', error);
				notify.actionFailed('delete torrent', error);
			}
		});
	}

	// Handle delete all confirmation button
	const confirmDeleteAllButton = document.getElementById('confirm-delete-all-button');
	if (confirmDeleteAllButton) {
		confirmDeleteAllButton.addEventListener('click', async () => {
			const checkbox = document.getElementById('delete-all-data-checkbox') as HTMLInputElement;
			const deleteData = checkbox ? checkbox.checked : false;
			
			try {
				// Remove all torrents by omitting IDs parameter
				await transmissionClient.removeTorrent(undefined as unknown as number, deleteData);
				
				// Close the modal
				if (deleteAllDialog) {
					deleteAllDialog.removeAttribute('open');
				}
				
				// Show success notification
				notify.torrentDeleted(undefined, deleteData);
				
				// Trigger a refresh
				window.dispatchEvent(new CustomEvent('torrent-updated'));
			} catch (error) {
				console.error('Error removing all torrents:', error);
				notify.actionFailed('delete all torrents', error);
			}
		});
	}

	// Handle global resume button
	const globalResumeButton = document.getElementById('global-resume-button');
	if (globalResumeButton) {
		globalResumeButton.addEventListener('click', async () => {
			try {
				// Resume all torrents by omitting IDs parameter
				await transmissionClient.resumeTorrent(undefined as unknown as number);
				notify.torrentResumed();
				window.dispatchEvent(new CustomEvent('torrent-updated'));
			} catch (error) {
				console.error('Error resuming all torrents:', error);
				notify.actionFailed('resume all torrents', error);
			}
		});
	}

	// Handle global pause button
	const globalPauseButton = document.getElementById('global-pause-button');
	if (globalPauseButton) {
		globalPauseButton.addEventListener('click', async () => {
			try {
				// Pause all torrents by omitting IDs parameter
				await transmissionClient.pauseTorrent(undefined as unknown as number);
				notify.torrentPaused();
				window.dispatchEvent(new CustomEvent('torrent-updated'));
			} catch (error) {
				console.error('Error pausing all torrents:', error);
				notify.actionFailed('pause all torrents', error);
			}
		});
	}

	// Handle Add Torrent functionality
	const addTorrentBtn = document.getElementById('add-torrent-btn');
	const pasteMagnetBtn = document.getElementById('paste-magnet-btn');
	const torrentFileInput = document.getElementById('torrent-file') as HTMLInputElement | null;
	const magnetLinkInput = document.getElementById('magnet-link') as HTMLInputElement | null;

	// Paste button for magnet link
	if (pasteMagnetBtn && magnetLinkInput) {
		pasteMagnetBtn.addEventListener('click', async () => {
			try {
				const text = await navigator.clipboard.readText();
				if (text.startsWith('magnet:')) {
					magnetLinkInput.value = text;
				}
			} catch (error) {
				console.error('Failed to read clipboard:', error);
			}
		});
	}

	// Handle Add button click
	if (addTorrentBtn) {
		addTorrentBtn.addEventListener('click', async () => {
			const destinationInput = document.getElementById('destination-folder') as HTMLInputElement | null;
			const startWhenAddedCheckbox = document.getElementById('start-when-added') as HTMLInputElement | null;

			const destination = destinationInput?.value || defaultDownloadDir;
			const startWhenAdded = startWhenAddedCheckbox?.checked ?? true;

			try {
				// Check if file is selected
				const file = torrentFileInput?.files?.[0];
				const magnetLink = magnetLinkInput?.value.trim();

				if (!file && !magnetLink) {
					notify.error('Please select a torrent file or enter a magnet link');
					return;
				}

				if (file && magnetLink) {
					notify.error('Please use either a file or magnet link, not both');
					return;
				}

				let torrentData: string | undefined;

				// Handle file upload
				if (file) {
					// Read file as base64
					const reader = new FileReader();
					const fileContent = await new Promise<string>((resolve, reject) => {
						reader.onload = () => {
							const result = reader.result as string;
							// Remove the data:application/x-bittorrent;base64, prefix
							const base64 = result.split(',')[1];
							resolve(base64);
						};
						reader.onerror = reject;
						reader.readAsDataURL(file);
					});
				torrentData = fileContent;
			}

			// Prepare options
			const options = {
				'download-dir': destination,
				paused: !startWhenAdded,
			};

			// Add torrent - use appropriate method for magnet links vs files
			if (magnetLink) {
				await transmissionClient.addMagnet(magnetLink, options);
			} else if (torrentData) {
				await transmissionClient.addTorrent(torrentData, options);
			} else {
				notify.error('Invalid torrent data');
				return;
			}
				// Close modal on success
				if (addTorrentDialog) {
					addTorrentDialog.removeAttribute('open');
				}

				// Reset form
				if (torrentFileInput) torrentFileInput.value = '';
				if (magnetLinkInput) magnetLinkInput.value = '';
				if (startWhenAddedCheckbox) startWhenAddedCheckbox.checked = true;

				// Show success notification
				notify.success('Torrent added successfully');

				// Trigger a refresh
				window.dispatchEvent(new CustomEvent('torrent-updated'));
			} catch (error) {
				console.error('Error adding torrent:', error);
				notify.actionFailed('add torrent', error);
			}
		});
	}

	// Handle global delete button
	const globalDeleteButton = document.getElementById('global-delete-button');
	if (globalDeleteButton) {
		globalDeleteButton.addEventListener('click', async () => {
			if (deleteAllDialog) {
				// Reset the checkbox
				const checkbox = document.getElementById('delete-all-data-checkbox') as HTMLInputElement;
				if (checkbox) {
					checkbox.checked = false;
				}
				
				// Open the modal
				deleteAllDialog.setAttribute('open', '');
			}
		});
	}

	// Handle throttle button
	const throttleButton = document.getElementById('throttle-button');
	let isThrottleEnabled = false;

	async function updateThrottleButton() {
		if (!throttleButton) return;
		
		const svg = throttleButton.querySelector('svg');
		if (!svg) return;

		if (isThrottleEnabled) {
			// Throttle is ON - show orange/amber color
			svg.classList.remove('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-700', 'dark:hover:text-white');
			svg.classList.add('text-orange-500', 'dark:text-orange-400', 'hover:text-orange-600', 'dark:hover:text-orange-300');
		} else {
			// Throttle is OFF - show gray color
			svg.classList.remove('text-orange-500', 'dark:text-orange-400', 'hover:text-orange-600', 'dark:hover:text-orange-300');
			svg.classList.add('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-700', 'dark:hover:text-white');
		}
	}

	async function fetchThrottleState() {
		try {
			const session = await transmissionClient.getSession();
			if (session.result === 'success' && session.arguments) {
				isThrottleEnabled = session.arguments['alt-speed-enabled'] as boolean ?? false;
				updateThrottleButton();
			}
		} catch (error) {
			console.error('Error fetching throttle state:', error);
		}
	}

	if (throttleButton) {
		// Fetch initial state
		fetchThrottleState();

		// Toggle throttle on click
		throttleButton.addEventListener('click', async () => {
			try {
				// Toggle the state
				const newState = !isThrottleEnabled;
				await transmissionClient.setSession({ 'alt-speed-enabled': newState });
				isThrottleEnabled = newState;
				updateThrottleButton();
			} catch (error) {
				console.error('Error toggling throttle:', error);
			}
		});
	}

	// Add button click handlers using event delegation
	document.addEventListener('click', async (e) => {
		const target = e.target as HTMLElement;
		const button = target.closest('button');
		if (!button) return;

		const torrentItem = button.closest('[data-torrent-id]');
		if (!torrentItem) return;

		const torrentId = torrentItem.getAttribute('data-torrent-id');
		if (!torrentId) return;

		const id = Number.parseInt(torrentId, 10);

		// Handle pause button
		if (button.classList.contains('button-pause')) {
			try {
				const torrentDataStr = torrentItem.getAttribute('data-torrent');
				const torrentName = torrentDataStr ? JSON.parse(torrentDataStr).name : undefined;
				await transmissionClient.pauseTorrent([id]);
				notify.torrentPaused(torrentName);
				// Trigger a refresh by dispatching a custom event
				window.dispatchEvent(new CustomEvent('torrent-updated'));
			} catch (error) {
				console.error('Error pausing torrent:', error);
				notify.actionFailed('pause torrent', error);
			}
		}

		// Handle resume button
		else if (button.classList.contains('button-resume')) {
			try {
				const torrentDataStr = torrentItem.getAttribute('data-torrent');
				const torrentName = torrentDataStr ? JSON.parse(torrentDataStr).name : undefined;
				await transmissionClient.resumeTorrent([id]);
				notify.torrentResumed(torrentName);
				// Trigger a refresh
				window.dispatchEvent(new CustomEvent('torrent-updated'));
			} catch (error) {
				console.error('Error resuming torrent:', error);
				notify.actionFailed('resume torrent', error);
			}
		}

		// Handle delete button
		else if (button.classList.contains('button-delete')) {
			pendingDeleteTorrentId = id;
			const torrentDataStr = torrentItem.getAttribute('data-torrent');
			
			if (torrentDataStr && deleteDialog) {
				try {
					const torrent = JSON.parse(torrentDataStr);
					const nameElement = document.getElementById('delete-torrent-name');
					if (nameElement) {
						nameElement.textContent = `Are you sure you want to remove "${torrent.name}"?`;
					}
					
					// Reset the checkbox
					const checkbox = document.getElementById('delete-data-checkbox') as HTMLInputElement;
					if (checkbox) {
						checkbox.checked = false;
					}
					
					// Open the modal
					deleteDialog.setAttribute('open', '');
				} catch (error) {
					console.error('Error parsing torrent data:', error);
				}
			}
		}

		// Handle info button - opens drawer
		else if (button.classList.contains('button-info')) {
			currentTorrentId = id;
			
			// Get basic torrent data from data attribute
			const torrentDataStr = torrentItem.getAttribute('data-torrent');
			if (torrentDataStr && torrentDrawer) {
				try {
					const torrent = JSON.parse(torrentDataStr);
					const content = document.getElementById('drawer-content');
					if (content) {
						// Display the torrent details from the row data (includes error info)
						displayTorrentDetails(torrent, content);
					}
				} catch (error) {
					console.error('Error parsing torrent data:', error);
				}
			}
		}
	});

	// Settings modal
	if (settingsDialog) {
		settingsDialog.addEventListener('open', async () => {
			const content = document.getElementById('settings-content');
			if (!content) return;

			content.innerHTML = '<p class="text-gray-400">Loading settings...</p>';

			try {
				const data = await transmissionClient.getSession();

				if (data.result === 'success' && data.arguments) {
					displaySettings(data.arguments, content);
				} else {
					content.innerHTML = '<p class="text-red-400">Failed to load settings</p>';
				}
			} catch (error) {
				content.innerHTML = '<p class="text-red-400">Error loading settings</p>';
			}
		});
	}

	// Function to fetch detailed torrent info
	async function fetchDetailedTorrentInfo(torrentId: number, container: Element) {
		try {
			const torrent = await transmissionClient.getTorrent(torrentId);
			
			if (torrent) {
				displayTorrentDetails(torrent, container);
			}
		} catch (error) {
			console.error('Error fetching detailed torrent info:', error);
		}
	}

	function displaySettings(settings: SessionSettings, container: Element) {
		// Helper to format bytes
		const formatBytes = (bytes: number) => {
			if (bytes === 0) return '0 B';
			const k = 1024;
			const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
		};

	const renderToggle = (name: string, label: string, checked: boolean, index: number) => `
		<div class="px-4 py-3 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/30' : 'bg-white dark:bg-transparent'}">
			<label class="flex items-center justify-between cursor-pointer">
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">${label}</span>
				<div class="group relative inline-flex w-11 shrink-0 rounded-full bg-gray-200 p-0.5 inset-ring inset-ring-gray-900/5 outline-offset-2 outline-indigo-600 transition-colors duration-200 ease-in-out has-checked:bg-indigo-600 has-focus-visible:outline-2 dark:bg-white/5 dark:inset-ring-white/10 dark:outline-indigo-500 dark:has-checked:bg-indigo-500">
					<span class="size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-5"></span>
					<input type="checkbox" name="${name}" ${checked ? 'checked' : ''} aria-label="${label}" class="absolute inset-0 size-full appearance-none focus:outline-hidden" />
				</div>
			</label>
		</div>
	`;		const renderNumberInput = (label: string, name: string, value: number, index: number, step = '1') => `
			<div class="px-4 py-3 ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/30' : 'bg-white dark:bg-transparent'}">
				<div class="flex items-center justify-between gap-4">
					<label class="text-sm font-medium text-gray-700 dark:text-gray-300">${label}</label>
					<input type="number" step="${step}" name="${name}" value="${value || 0}" 
						class="w-32 px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500" />
				</div>
			</div>
		`;

		const html = `
			<form id="settings-form">
				<div class="max-h-[60vh] overflow-y-auto overflow-x-hidden pr-2 space-y-6">
				<!-- Speed Settings -->
				<div>
					<h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Speed Settings</h3>
					<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						${renderToggle('speed-limit-down-enabled', 'Download Limit Enabled', settings['speed-limit-down-enabled'], 0)}
						${renderNumberInput('Download Limit (KB/s)', 'speed-limit-down', settings['speed-limit-down'], 1)}
						${renderToggle('speed-limit-up-enabled', 'Upload Limit Enabled', settings['speed-limit-up-enabled'], 2)}
						${renderNumberInput('Upload Limit (KB/s)', 'speed-limit-up', settings['speed-limit-up'], 3)}
						${renderNumberInput('Alt Download Speed (KB/s)', 'alt-speed-down', settings['alt-speed-down'], 4)}
						${renderNumberInput('Alt Upload Speed (KB/s)', 'alt-speed-up', settings['alt-speed-up'], 5)}
					</div>
				</div>

				<!-- Peer Settings -->
				<div>
					<h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Peer Settings</h3>
					<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						${renderNumberInput('Global Peer Limit', 'peer-limit-global', settings['peer-limit-global'], 0)}
						${renderNumberInput('Per-Torrent Peer Limit', 'peer-limit-per-torrent', settings['peer-limit-per-torrent'], 1)}
					</div>
				</div>

				<!-- Network Settings -->
				<div>
					<h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Network Settings</h3>
					<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						${renderNumberInput('Peer Port', 'peer-port', settings['peer-port'], 0)}
						${renderToggle('port-forwarding-enabled', 'Port Forwarding', settings['port-forwarding-enabled'], 1)}
						${renderToggle('dht-enabled', 'DHT', settings['dht-enabled'], 2)}
						${renderToggle('pex-enabled', 'PEX', settings['pex-enabled'], 3)}
						${renderToggle('lpd-enabled', 'LPD', settings['lpd-enabled'], 4)}
						${renderToggle('utp-enabled', 'µTP', settings['utp-enabled'], 5)}
					</div>
				</div>

				<!-- Queue Settings -->
				<div>
					<h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Queue Settings</h3>
					<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						${renderToggle('download-queue-enabled', 'Download Queue Enabled', settings['download-queue-enabled'], 0)}
						${renderNumberInput('Download Queue Size', 'download-queue-size', settings['download-queue-size'], 1)}
						${renderToggle('seed-queue-enabled', 'Seed Queue Enabled', settings['seed-queue-enabled'], 2)}
						${renderNumberInput('Seed Queue Size', 'seed-queue-size', settings['seed-queue-size'], 3)}
					</div>
				</div>

				<!-- Seeding Settings -->
				<div>
					<h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Seeding Settings</h3>
					<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						${renderToggle('seedRatioLimited', 'Seed Ratio Limited', settings.seedRatioLimited, 0)}
						${renderNumberInput('Seed Ratio Limit', 'seedRatioLimit', settings.seedRatioLimit, 1, '0.1')}
						${renderToggle('idle-seeding-limit-enabled', 'Idle Seeding Limit Enabled', settings['idle-seeding-limit-enabled'], 2)}
						${renderNumberInput('Idle Seeding Limit (minutes)', 'idle-seeding-limit', settings['idle-seeding-limit'], 3)}
					</div>
				</div>

				<!-- Miscellaneous Settings -->
				<div>
					<h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Miscellaneous</h3>
					<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						${renderToggle('start-added-torrents', 'Start Added Torrents', settings['start-added-torrents'], 0)}
						${renderToggle('trash-original-torrent-files', 'Trash Original Files', settings['trash-original-torrent-files'], 1)}
						${renderToggle('rename-partial-files', 'Rename Partial Files', settings['rename-partial-files'], 2)}
					</div>
				</div>

				<!-- Info Section (Read-only) -->
				<div>
					<h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Information</h3>
					<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						<div class="px-4 py-3 bg-gray-50 dark:bg-gray-800/30">
							<div class="flex justify-between text-sm">
								<span class="font-medium text-gray-700 dark:text-gray-300">Download Directory</span>
								<span class="text-gray-900 dark:text-white font-mono text-xs break-all text-right ml-4">${settings['download-dir']}</span>
							</div>
						</div>
						<div class="px-4 py-3 bg-white dark:bg-transparent">
							<div class="flex justify-between text-sm">
								<span class="font-medium text-gray-700 dark:text-gray-300">Free Space</span>
								<span class="text-gray-900 dark:text-white">${formatBytes(Number(settings['download-dir-free-space']) || 0)}</span>
							</div>
						</div>
						<div class="px-4 py-3 bg-gray-50 dark:bg-gray-800/30">
							<div class="flex justify-between text-sm">
								<span class="font-medium text-gray-700 dark:text-gray-300">Version</span>
								<span class="text-gray-900 dark:text-white">${settings.version}</span>
							</div>
						</div>
					</div>
				</div>
				</div>

				<!-- Save Button -->
				<div class="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
					<button type="button" command="close" commandfor="settings-modal"
						class="px-4 py-2 text-sm font-semibold text-gray-900 bg-white rounded-md shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:ring-0 dark:hover:bg-white/20">
						Cancel
					</button>
					<button type="submit"
						class="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-400">
						Save Settings
					</button>
				</div>
			</form>
		`;

		container.innerHTML = html;

		// Add form submit handler
		const form = container.querySelector('#settings-form');
		if (form) {
			form.addEventListener('submit', async (e) => {
				e.preventDefault();
				const updates: Partial<SessionArguments> = {};

				// Collect all input values (including unchecked checkboxes)
				const inputs = form.querySelectorAll('input[name]') as NodeListOf<HTMLInputElement>;
				for (const input of inputs) {
					const key = input.name;
					if (input.type === 'checkbox') {
						updates[key as keyof SessionArguments] = input.checked as never;
					} else if (input.type === 'number') {
						updates[key as keyof SessionArguments] = Number(input.value) as never;
					} else {
						updates[key as keyof SessionArguments] = input.value as never;
					}
				}

				try {
					await transmissionClient.setSession(updates);
					// Close modal on success
					if (settingsDialog) {
						settingsDialog.removeAttribute('open');
					}
					// Update throttle button if alt-speed was changed
					if ('alt-speed-enabled' in updates) {
						isThrottleEnabled = updates['alt-speed-enabled'] as boolean;
						updateThrottleButton();
					}
					// Show success notification
					notify.settingsSaved();
				} catch (error) {
					console.error('Error saving settings:', error);
					notify.actionFailed('save settings', error);
				}
			});
		}
	}

	function displayTorrentDetails(torrent: TorrentData, container: Element) {
		// NormalizedTorrent has a 'raw' property with the full Torrent data
		const rawTorrent = torrent.raw as Torrent;
		
		// Format bytes
		const formatBytes = (bytes: number) => {
			if (bytes === 0) return '0 B';
			const k = 1024;
			const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
		};

		// Format rate (bytes per second)
		const formatRate = (bytesPerSec: number) => {
			return `${formatBytes(bytesPerSec)}/s`;
		};

		// Format ETA
		const formatEta = (seconds: number) => {
			if (seconds < 0) return 'Unknown';
			if (seconds === 0) return 'Done';
			const hours = Math.floor(seconds / 3600);
			const minutes = Math.floor((seconds % 3600) / 60);
			if (hours > 0) return `${hours}h ${minutes}m`;
			return `${minutes}m`;
		};

		// Status labels
		const statusLabels: Record<number, string> = {
			0: 'Stopped',
			1: 'Queued to verify',
			2: 'Verifying',
			3: 'Queued to download',
			4: 'Downloading',
			5: 'Queued to seed',
			6: 'Seeding',
		};

		// Check for errors
		const hasError = rawTorrent.error && rawTorrent.error !== 0;
		const errorString = rawTorrent.errorString || '';

		// Torrent name at the top in larger font
		const nameHtml = `
			<div class="mb-6">
				<h3 class="text-base font-semibold text-gray-900 dark:text-white break-all">${torrent.name || 'Unknown Torrent'}</h3>
			</div>
		`;

		// Error banner if there's an error (will be placed at bottom)
		const errorHtml = hasError ? renderErrorBanner(errorString, 'lg') : '';

		// Basic info in 2-column grid format - use normalized torrent for main properties, raw for details
		const basicInfo = `
			<div class="mb-6">
				<dl class="grid grid-cols-2 gap-x-6 gap-y-4">
					<div>
						<dt class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Status</dt>
						<dd class="mt-1.5 text-sm text-gray-900 dark:text-white">${statusLabels[rawTorrent.status] || 'Unknown'}</dd>
					</div>
					<div>
						<dt class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Size</dt>
						<dd class="mt-1.5 text-sm text-gray-900 dark:text-white">${formatBytes(torrent.totalSize || 0)}</dd>
					</div>
					<div>
						<dt class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Progress</dt>
						<dd class="mt-1.5 text-sm text-gray-900 dark:text-white">${(torrent.progress * 100).toFixed(1)}%</dd>
					</div>
					<div>
						<dt class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">ETA</dt>
						<dd class="mt-1.5 text-sm text-gray-900 dark:text-white">${formatEta(torrent.eta || -1)}</dd>
					</div>
					<div>
						<dt class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Downloaded</dt>
						<dd class="mt-1.5 text-sm text-gray-900 dark:text-white">${formatBytes(torrent.totalDownloaded || 0)}</dd>
					</div>
					<div>
						<dt class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Uploaded</dt>
						<dd class="mt-1.5 text-sm text-gray-900 dark:text-white">${formatBytes(torrent.totalUploaded || 0)}</dd>
					</div>
					<div>
						<dt class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Download Speed</dt>
						<dd class="mt-1.5 text-sm text-gray-900 dark:text-white">${formatRate(torrent.downloadSpeed || 0)}</dd>
					</div>
					<div>
						<dt class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Upload Speed</dt>
						<dd class="mt-1.5 text-sm text-gray-900 dark:text-white">${formatRate(torrent.uploadSpeed || 0)}</dd>
					</div>
					<div class="col-span-2">
						<dt class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Location</dt>
						<dd class="mt-1.5 text-sm text-gray-900 dark:text-white break-all">${torrent.savePath || 'N/A'}</dd>
					</div>
				</dl>
			</div>
		`;

		// Files section with fancy progress bars - use raw torrent for detailed file info
		let filesHtml = '';
		if (rawTorrent.files && rawTorrent.fileStats && Array.isArray(rawTorrent.files) && Array.isArray(rawTorrent.fileStats)) {
			filesHtml = `
				<div class="mb-6">
					<h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Files</h4>
					<div class="space-y-3">
						${rawTorrent.files.map((file: Files, index: number) => {
							const stats = rawTorrent.fileStats?.[index];
							const progress = stats?.bytesCompleted && file.length 
								? (stats.bytesCompleted / file.length) * 100 
								: 0;
							return `
								<div class="rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 p-3">
									<div class="flex items-start justify-between gap-3 mb-2">
										<span class="text-sm text-gray-700 dark:text-gray-200 break-all flex-1">${file.name || 'Unknown'}</span>
										<span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">${formatBytes(file.length || 0)}</span>
									</div>
									<div class="flex items-center gap-2">
										<div class="flex-1 bg-gray-300 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
											<div class="bg-linear-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-300" style="width: ${progress.toFixed(1)}%"></div>
										</div>
										<span class="text-xs font-medium text-gray-600 dark:text-gray-300 w-12 text-right">${progress.toFixed(0)}%</span>
									</div>
								</div>
							`;
						}).join('')}
					</div>
				</div>
			`;
		}

		// Trackers section with status dots and limited display - use raw torrent
		let trackersHtml = '';
		if (rawTorrent.trackers && Array.isArray(rawTorrent.trackers)) {
			const maxDisplay = 3;
			const visibleTrackers = rawTorrent.trackers.slice(0, maxDisplay);
			const remainingCount = rawTorrent.trackers.length - maxDisplay;
			
			trackersHtml = `
				<div class="mb-6">
					<h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Trackers</h4>
				<div class="space-y-2">
					${visibleTrackers.map((tracker: Tracker) => {
							// For now, we'll show tracker info without status since basic Tracker type doesn't include stats
							// TODO: Fetch tracker stats separately if needed
							
							return `
								<div class="rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-3">
									<div class="flex items-start gap-3">
										<div class="flex-1 min-w-0">
											<div class="text-sm text-gray-700 dark:text-gray-200 break-all mb-1">${tracker.announce || 'Unknown'}</div>
											<div class="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
												<span>Tier ${tracker.tier ?? 'N/A'}</span>
											</div>
										</div>
									</div>
								</div>
							`;
						}).join('')}
						${remainingCount > 0 ? `
							<div class="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
								And ${remainingCount} more tracker${remainingCount !== 1 ? 's' : ''}
							</div>
						` : ''}
					</div>
				</div>
			`;
		}

		const finalHtml = nameHtml + basicInfo + filesHtml + trackersHtml + errorHtml;
		container.innerHTML = finalHtml;
	}
});

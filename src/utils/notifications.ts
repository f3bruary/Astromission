// Toast notification utility using Notyf
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

// Initialize Notyf with custom configuration
export const notyf = new Notyf({
	duration: 4000,
	position: {
		x: 'right',
		y: 'bottom',
	},
	dismissible: true,
	ripple: true,
	types: [
		{
			type: 'success',
			background: '#10b981', // green-500
			icon: {
				className: 'notyf__icon--success',
				tagName: 'i',
			},
		},
		{
			type: 'error',
			background: '#ef4444', // red-500
			icon: {
				className: 'notyf__icon--error',
				tagName: 'i',
			},
		},
	],
});

// Convenience functions for common notification patterns
export const notify = {
	success: (message: string) => notyf.success(message),
	error: (message: string) => notyf.error(message),
	
	// Torrent-specific notifications
	torrentPaused: (name?: string) => 
		notyf.success(name ? `Paused: ${name}` : 'Torrents paused'),
	
	torrentResumed: (name?: string) => 
		notyf.success(name ? `Resumed: ${name}` : 'Torrents resumed'),
	
	torrentDeleted: (name?: string, withData = false) => 
		notyf.success(name 
			? `Deleted: ${name}${withData ? ' (including data)' : ''}` 
			: `All torrents deleted${withData ? ' (including data)' : ''}`
		),
	
	settingsSaved: () => 
		notyf.success('Settings saved successfully'),
	
	// Error notifications
	actionFailed: (action: string, error?: unknown) => {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		notyf.error(`Failed to ${action}: ${errorMsg}`);
	},
};

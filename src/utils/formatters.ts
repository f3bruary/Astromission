// Utility functions for formatting torrent data
export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0 || Number.isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / (k ** i) * 100) / 100} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec === 0 || Number.isNaN(bytesPerSec)) return '0 B/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatETA(totalSize: number, percentDone: number, rateDownload: number): string {
  if (!rateDownload || rateDownload === 0 || Number.isNaN(rateDownload) || percentDone >= 1) return 'N/A';
  const remaining = totalSize * (1 - percentDone);
  const seconds = Math.floor(remaining / rateDownload);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function getStatusText(status: number): string {
  const statusMap: Record<number, string> = {
    0: 'Stopped',
    1: 'Queued to verify',
    2: 'Verifying',
    3: 'Queued to download',
    4: 'Downloading',
    5: 'Queued to seed',
    6: 'Seeding',
  };
  return statusMap[status] || 'Unknown';
}

export function getStatusColor(status: number): string {
  // Hardcoded Tailwind classes for compiler detection
  const colorClasses = [
    'bg-amber-500',   // 0: Stopped/Paused - changed from gray for visibility
    'bg-yellow-500',  // 1: Queued to verify
    'bg-orange-500',  // 2: Verifying
    'bg-cyan-500',    // 3: Queued to download
    'bg-blue-500',    // 4: Downloading
    'bg-purple-500',  // 5: Queued to seed
    'bg-green-500',   // 6: Seeding
  ];
  
  const statusColorMap: Record<number, string> = {
    0: 'bg-amber-500',
    1: 'bg-yellow-500',
    2: 'bg-orange-500',
    3: 'bg-cyan-500',
    4: 'bg-blue-500',
    5: 'bg-purple-500',
    6: 'bg-green-500',
  };
  
  return statusColorMap[status] || 'bg-gray-500';
}

/**
 * Renders an error banner with light/dark theme support
 * @param errorString - The error message to display
 * @param size - 'sm' for compact display (rows), 'lg' for detailed display (modals)
 */
export function renderErrorBanner(errorString: string, size: 'sm' | 'lg' = 'sm'): string {
  if (!errorString) return '';
  
  if (size === 'sm') {
    return `
    <div class="mt-3 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
      <div class="flex items-start gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5">
          <path fill-rule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 1 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
        </svg>
        <p class="text-sm font-medium text-red-800 dark:text-red-200">${errorString}</p>
      </div>
    </div>
    `;
  }
  
  return `
  <div class="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
    <div class="flex items-start gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-6 text-red-600 dark:text-red-400 shrink-0">
        <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
      </svg>
      <div>
        <h4 class="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">Error</h4>
        <p class="text-sm text-red-800 dark:text-red-300">${errorString}</p>
      </div>
    </div>
  </div>
  `;
}

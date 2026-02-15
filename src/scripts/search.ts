// Search functionality
document.addEventListener('DOMContentLoaded', () => {
	const searchInput = document.getElementById('search-input') as HTMLInputElement;
	const searchButton = document.getElementById('search-button');
	
	if (!searchInput || !searchButton) {
		console.error('Search elements not found');
		return;
	}

	let currentSearchTerm = '';

	// SVG icons
	const magnifyingGlassIcon = `
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
			<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
		</svg>
	`;

	const xCircleIcon = `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
			<path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd" />
		</svg>
	`;

	function filterTorrents(searchTerm: string) {
		// Use the global function from index.astro to update search term and re-render
		const win = window as Window & { updateSearchTerm?: (term: string) => void };
		if (typeof win.updateSearchTerm === 'function') {
			win.updateSearchTerm(searchTerm);
		}
	}

	function updateSearchIcon() {
		if (!searchButton) return;
		
		if (currentSearchTerm.length >= 3) {
			searchButton.innerHTML = xCircleIcon;
			searchButton.classList.add('cursor-pointer');
		} else {
			searchButton.innerHTML = magnifyingGlassIcon;
			searchButton.classList.remove('cursor-pointer');
		}
	}

	function clearSearch() {
		searchInput.value = '';
		currentSearchTerm = '';
		filterTorrents('');
		updateSearchIcon();
		searchInput.focus();
	}

	// Handle input changes
	searchInput.addEventListener('input', () => {
		currentSearchTerm = searchInput.value;
		filterTorrents(currentSearchTerm);
		updateSearchIcon();
	});

	// Handle button click (clear search when X is showing)
	searchButton.addEventListener('click', () => {
		if (currentSearchTerm.length >= 3) {
			clearSearch();
		}
	});

	// Restore search term from input on page load (in case it persists after refresh)
	if (searchInput.value) {
		currentSearchTerm = searchInput.value;
		filterTorrents(currentSearchTerm);
		updateSearchIcon();
	}

	// Initialize icon
	updateSearchIcon();
});

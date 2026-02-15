export interface MenuItem {
	label: string;
	status: number | null | 'finished'; // null means "All", 'finished' is special filter
	href: string;
}

export const menu: MenuItem[] = [
	{ label: "All", status: null, href: "#all" },
	{ label: "Downloading", status: 4, href: "#downloading" },
	{ label: "Seeding", status: 6, href: "#seeding" },
	{ label: "Stopped", status: 0, href: "#stopped" },
	{ label: "Finished", status: 'finished', href: "#finished" },
	{ label: "Queued to verify", status: 1, href: "#queued-verify" },
	{ label: "Verifying", status: 2, href: "#verifying" },
	{ label: "Queued to download", status: 3, href: "#queued-download" },
	{ label: "Queued to seed", status: 5, href: "#queued-seed" },
];

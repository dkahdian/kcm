<script lang="ts">
	import GenericChip from './GenericChip.svelte';
	import type { ReferenceToAdd } from '../../../routes/contribute/types.js';

	let {
		reference,
		index,
		expanded = $bindable(false),
		onDelete,
		onEdit
	}: {
		reference: ReferenceToAdd;
		index: number;
		expanded?: boolean;
		onDelete: () => void;
		onEdit?: () => void;
	} = $props();

	// Generate a short display name from the title
	const shortTitle = $derived(() => {
		const title = reference.title;
		// Extract first author's last name and year from IEEE-formatted title
		const match = title.match(/^([A-Z]\.?\s*)+([A-Za-z]+)/);
		const yearMatch = title.match(/(\d{4})\.?\s*$/);
		if (match && yearMatch) {
			return `${match[2]} (${yearMatch[1]})`;
		}
		// Fallback to first 30 chars
		return title.slice(0, 30) + (title.length > 30 ? '...' : '');
	});
</script>

<GenericChip
	type="REF"
	title={shortTitle()}
	colorScheme="purple"
	renderMathTitle={false}
	renderMathSubtitle={false}
	{index}
	bind:expanded
	{onDelete}
	{onEdit}
>
	{#snippet children()}
		<div class="space-y-2">
			<div class="text-sm text-gray-700 bg-purple-50 p-2 rounded border border-purple-200">
				{reference.title}
			</div>
			{#if reference.href && reference.href !== '#'}
				<a href={reference.href} target="_blank" rel="noreferrer noopener" class="text-xs text-blue-600 hover:underline block truncate">
					{reference.href}
				</a>
			{/if}
			<details class="text-xs">
				<summary class="cursor-pointer text-gray-500 hover:text-gray-700">Show BibTeX</summary>
				<pre class="mt-1 bg-white p-2 rounded border border-purple-200 overflow-x-auto text-xs">{reference.bibtex}</pre>
			</details>
		</div>
	{/snippet}
</GenericChip>

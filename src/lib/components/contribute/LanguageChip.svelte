<script lang="ts">
	import type { PolytimeFlagCode } from '$lib/types';
	import GenericChip from './GenericChip.svelte';

	type LanguageData = {
		id: string;
		name: string;
		fullName: string;
		description: string;
		descriptionRefs: string[];
		queries: Record<string, { polytime: PolytimeFlagCode; note?: string; refs: string[] }>;
		transformations: Record<string, { polytime: PolytimeFlagCode; note?: string; refs: string[] }>;
		tags: Array<{ id: string; label: string; color: string; description?: string; refs: string[] }>;
		existingReferences: string[];
	};

	let {
		language,
		index,
		isEdit = false,
		expanded = $bindable(false),
		onDelete
	}: {
		language: LanguageData;
		index: number;
		isEdit?: boolean;
		expanded?: boolean;
		onDelete: () => void;
	} = $props();

	const chipType = isEdit ? 'EDIT LANG' : 'NEW LANG';
	const colorScheme = isEdit ? 'yellow' : 'green';
</script>

<GenericChip
	type={chipType}
	title="{language.name} ({language.id})"
	{colorScheme}
	{index}
	bind:expanded
	{onDelete}
>
	{#snippet children()}
		<div class="space-y-4">
			<p class="text-xs text-gray-600 italic">
				Full language form would go here (all queries, transformations, tags, etc.)
			</p>
			<!-- TODO: Import and use LanguageForm component -->
		</div>
	{/snippet}
</GenericChip>

<script lang="ts">
	import MathText from '$lib/components/MathText.svelte';
	import type { LanguageToAdd } from '../types.js';
	import GenericQueueItem from './GenericQueueItem.svelte';

	/**
	 * Display a single queued language (for add or edit)
	 */
	let {
		language,
		index,
		isExpanded = false,
		isEdit = false,
		onToggleExpand,
		onEdit,
		onDelete
	}: {
		language: LanguageToAdd;
		index: number;
		isExpanded?: boolean;
		isEdit?: boolean;
		onToggleExpand: (index: number) => void;
		onEdit: (index: number) => void;
		onDelete: (index: number) => void;
	} = $props();

	const colorScheme = isEdit ? 'yellow' : 'green';
</script>

<GenericQueueItem
	type={isEdit ? 'Edit Language' : 'New Language'}
	title={language.name}
	subtitle={language.description}
	{colorScheme}
	{index}
	{isExpanded}
	{onToggleExpand}
	{onEdit}
	{onDelete}
>
	{#snippet children()}
		<div class="space-y-3 text-xs">
			<div>
				<div class="font-semibold text-gray-700 mb-1">Full Name:</div>
				<MathText text={language.fullName} className="text-gray-900 block" />
			</div>
			<div>
				<div class="font-semibold text-gray-700 mb-1">Description:</div>
				<MathText text={language.description} className="text-gray-900 block" />
			</div>
			{#if language.queries && Object.keys(language.queries).length > 0}
				<div>
					<div class="font-semibold text-gray-700 mb-1">
						Query Support ({Object.keys(language.queries).length}):
					</div>
					<div class="grid grid-cols-2 gap-2">
						{#each Object.entries(language.queries) as [code, support]}
								<div class="bg-white p-2 rounded border">
									<div class="font-medium">{code}</div>
									<div class="text-gray-600">{support.polytime}</div>
									{#if support.note}
										<MathText text={support.note} className="text-gray-500 italic text-xs block" />
									{/if}
								{#if support.refs.length > 0}
									<div class="text-gray-500 text-xs">Refs: [{support.refs.join(', ')}]</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
			{#if language.transformations && Object.keys(language.transformations).length > 0}
				<div>
					<div class="font-semibold text-gray-700 mb-1">
						Transformation Support ({Object.keys(language.transformations).length}):
					</div>
					<div class="grid grid-cols-2 gap-2">
						{#each Object.entries(language.transformations) as [code, support]}
								<div class="bg-white p-2 rounded border">
									<div class="font-medium">{code}</div>
									<div class="text-gray-600">{support.polytime}</div>
									{#if support.note}
										<MathText text={support.note} className="text-gray-500 italic text-xs block" />
									{/if}
								{#if support.refs.length > 0}
									<div class="text-gray-500 text-xs">Refs: [{support.refs.join(', ')}]</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
			{#if language.tags.length > 0}
				<div>
					<div class="font-semibold text-gray-700 mb-1">Tags ({language.tags.length}):</div>
					<div class="space-y-2">
						{#each language.tags as tag}
							<div class="bg-white p-2 rounded border">
								<div class="font-medium">{tag.label}</div>
								<div class="text-gray-600">{tag.description || 'No description'}</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/snippet}
</GenericQueueItem>

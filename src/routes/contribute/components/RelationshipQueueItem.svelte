<script lang="ts">
	import type { RelationshipEntry } from '../types.js';
	import { relationKey } from '../logic.js';
	import GenericQueueItem from './GenericQueueItem.svelte';

	/**
	 * Display a single queued relationship
	 */
	let {
		languages,
		relationship,
		index,
		isExpanded = false,
		isModified = false,
		onToggleExpand,
		onEdit,
		onDelete
	}: {
		languages: Array<{ id: string; name: string }>;
		relationship: RelationshipEntry;
		index: number;
		isExpanded?: boolean;
		isModified?: boolean;
		onToggleExpand: (index: number) => void;
		onEdit: (index: number) => void;
		onDelete: (index: number, key: string) => void;
	} = $props();

	const idToName = new Map(languages.map(lang => [lang.id, lang.name]));
	const key = relationKey(relationship.sourceId, relationship.targetId);
	const sourceName = idToName.get(relationship.sourceId) ?? relationship.sourceId;
	const targetName = idToName.get(relationship.targetId) ?? relationship.targetId;
	const subtitle = `${sourceName} → ${targetName}`;
</script>

{#if isModified}
	<GenericQueueItem
		type="Relationship"
		title={subtitle}
		subtitle={relationship.status}
		colorScheme="blue"
		{index}
		{isExpanded}
		{onToggleExpand}
		onEdit={() => onEdit(index)}
		onDelete={() => onDelete(index, key)}
	>
		{#snippet children()}
			<div class="space-y-3 text-xs">
				<div>
					<div class="font-semibold text-gray-700 mb-1">Transformation Status:</div>
					<div class="bg-white p-2 rounded border">
						<span class="font-mono text-gray-900">{relationship.status}</span>
					</div>
				</div>
				{#if relationship.separatingFunctions && relationship.separatingFunctions.length > 0}
					<div>
						<div class="font-semibold text-gray-700 mb-1">
							Separating Functions ({relationship.separatingFunctions.length}):
						</div>
						<div class="space-y-2">
							{#each relationship.separatingFunctions as fn}
								<div class="bg-white p-2 rounded border">
									<div class="font-medium">{fn.name}</div>
									<div class="text-gray-600 text-xs">Short: {fn.shortName}</div>
									<div class="text-gray-500 italic text-xs">{fn.description}</div>
									{#if fn.refs && fn.refs.length > 0}
										<div class="text-gray-500 text-xs mt-1">Refs: [{fn.refs.join(', ')}]</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}
				{#if relationship.refs && relationship.refs.length > 0}
					<div>
						<div class="font-semibold text-gray-700 mb-1">References:</div>
						<div class="text-gray-600">{relationship.refs.join(', ')}</div>
					</div>
				{/if}
			</div>
		{/snippet}
	</GenericQueueItem>
{/if}

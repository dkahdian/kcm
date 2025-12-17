<script lang="ts">
	import GenericChip from './GenericChip.svelte';

	type RelationshipData = {
		sourceId: string;
		targetId: string;
		status: string;
		refs: string[];
		separatingFunctionIds?: string[];
	};

	let {
		relationship,
		index,
		expanded = $bindable(false),
		onDelete
	}: {
		relationship: RelationshipData;
		index: number;
		expanded?: boolean;
		onDelete: () => void;
	} = $props();
</script>

<GenericChip
	type="REL"
	title="{relationship.sourceId} → {relationship.targetId}"
	subtitle={relationship.status}
	colorScheme="blue"
	{index}
	bind:expanded
	{onDelete}
>
	{#snippet children()}
		<p class="text-xs text-gray-600 italic">
			Relationship editing form would go here (status, refs, separating functions)
		</p>
		<!-- TODO: Import and use RelationshipForm component -->
	{/snippet}
</GenericChip>

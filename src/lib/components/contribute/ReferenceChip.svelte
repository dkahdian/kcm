<script lang="ts">
	import GenericChip from './GenericChip.svelte';

	let {
		bibtexContent,
		index,
		expanded = $bindable(false),
		onDelete
	}: {
		bibtexContent: string;
		index: number;
		expanded?: boolean;
		onDelete: () => void;
	} = $props();
</script>

<GenericChip
	type="REF"
	title="new-{index}"
	colorScheme="purple"
	renderMathTitle={false}
	renderMathSubtitle={false}
	{index}
	bind:expanded
	{onDelete}
>
	{#snippet children()}
		<pre class="text-xs bg-white p-2 rounded border border-purple-200 overflow-x-auto">{bibtexContent}</pre>
	{/snippet}
</GenericChip>

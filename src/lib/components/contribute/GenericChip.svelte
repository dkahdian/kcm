<script lang="ts">
	/**
	 * Generic expandable chip component for contribution items
	 */
	let {
		type,
		title,
		subtitle,
		colorScheme = 'purple',
		index,
		expanded = $bindable(false),
		onDelete,
		children
	}: {
		type: string;
		title: string;
		subtitle?: string;
		colorScheme?: 'purple' | 'green' | 'yellow' | 'blue';
		index: number;
		expanded?: boolean;
		onDelete: () => void;
		children?: import('svelte').Snippet;
	} = $props();

	const colorMap = {
		purple: {
			border: 'border-purple-300',
			bg: 'bg-purple-50',
			text: 'text-purple-800',
			button: 'text-purple-700 hover:text-purple-900',
			divider: 'border-purple-200'
		},
		green: {
			border: 'border-green-300',
			bg: 'bg-green-50',
			text: 'text-green-800',
			button: 'text-green-700 hover:text-green-900',
			divider: 'border-green-200'
		},
		yellow: {
			border: 'border-yellow-300',
			bg: 'bg-yellow-50',
			text: 'text-yellow-800',
			button: 'text-yellow-700 hover:text-yellow-900',
			divider: 'border-yellow-200'
		},
		blue: {
			border: 'border-blue-300',
			bg: 'bg-blue-50',
			text: 'text-blue-800',
			button: 'text-blue-700 hover:text-blue-900',
			divider: 'border-blue-200'
		}
	};

	const colors = colorMap[colorScheme];
</script>

<div class="border-2 {colors.border} {colors.bg} rounded-lg p-3">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<span class="text-sm font-semibold {colors.text}">
				{type}:
			</span>
			<span class="text-sm text-gray-900">{title}</span>
			{#if subtitle}
				<span class="text-xs text-gray-600">({subtitle})</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => (expanded = !expanded)}
				class="{colors.button} font-bold text-lg"
				aria-label={expanded ? 'Collapse' : 'Expand'}
			>
				{expanded ? '∨' : '^'}
			</button>
			<button
				type="button"
				onclick={onDelete}
				class="text-red-600 hover:text-red-800 font-bold"
				aria-label="Delete"
			>
				×
			</button>
		</div>
	</div>

	{#if expanded && children}
		<div class="mt-4 pt-4 border-t {colors.divider}">
			{@render children()}
		</div>
	{/if}
</div>

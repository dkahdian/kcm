<script lang="ts">
	import starai from '$lib/assets/starai.png';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={starai} />
</svelte:head>

{@render children?.()}

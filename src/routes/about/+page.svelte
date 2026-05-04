<script lang="ts">
	import { onMount } from 'svelte';
	import MathText from '$lib/components/MathText.svelte';
	import { initialGraphData } from '$lib/data/index.js';
	import { getReferences } from '$lib/data/references.js';

	const definitions = initialGraphData.definitions ?? [];

	let expandedDefinitionIds = new Set<string>();

	function expandDefinition(id: string, scroll = false) {
		expandedDefinitionIds = new Set(expandedDefinitionIds).add(id);

		if (scroll) {
			requestAnimationFrame(() => {
				document.getElementById(id)?.scrollIntoView({ block: 'start' });
			});
		}
	}

	function toggleDefinition(id: string) {
		const next = new Set(expandedDefinitionIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		expandedDefinitionIds = next;
	}

	function expandHashDefinition() {
		const id = decodeURIComponent(window.location.hash.slice(1));
		if (id && definitions.some((definition) => definition.id === id)) {
			expandDefinition(id, true);
		}
	}

	onMount(() => {
		expandHashDefinition();
		window.addEventListener('hashchange', expandHashDefinition);

		return () => {
			window.removeEventListener('hashchange', expandHashDefinition);
		};
	});
</script>

<svelte:head>
	<title>About — Tractable Circuit Zoo</title>
</svelte:head>

<div class="about-page">
	<header class="about-header">
		<a href="/" class="back-link">← Back to Zoo</a>
		<h1>About the Tractable Circuit Zoo</h1>
	</header>

	<main class="about-content">
		<section>
			<h2>What is this?</h2>
			<p>
				The Tractable Circuit Zoo is a visual guide to tractable circuit languages.
				We display succinctness relations between languages and operations they support.
				We build on the foundational work of
				<a href="https://arxiv.org/abs/1106.1819" target="_blank" rel="noopener">
					Darwiche &amp; Marquis (2002)
				</a>
				and incorporate results from subsequent research.
			</p>
		</section>

		<section>
			<h2>Definitions</h2>
			<p>
				These informal definitions intend to provide a minimalistic, intuitive overview of the project. Each is linked to more formal statements in the literature.
			</p>
			<div class="definition-list">
				{#each definitions as definition}
					{@const expanded = expandedDefinitionIds.has(definition.id)}
					<article class="definition-card" class:expanded id={definition.id}>
						<button
							type="button"
							class="definition-card-header"
							aria-expanded={expanded}
							aria-controls={`${definition.id}-body`}
							onclick={() => toggleDefinition(definition.id)}
						>
							<h3><MathText text={definition.title} as="span" /></h3>
							<span class="definition-toggle" aria-hidden="true">{expanded ? '-' : '+'}</span>
						</button>
						{#if expanded}
							<div class="definition-body" id={`${definition.id}-body`}>
								<div class="definition-statement">
									<MathText text={definition.statement} as="p" />
								</div>
								{#if definition.explanation}
									<div class="definition-explanation">
										<MathText text={definition.explanation} as="p" />
									</div>
								{/if}
								{#if definition.refs.length > 0}
									<div class="definition-refs">
										<span>References:</span>
										{#each getReferences(...definition.refs) as ref, index}
											<a href={ref.href} target="_blank" rel="noopener noreferrer">{ref.title}</a>{index < definition.refs.length - 1 ? ', ' : ''}
										{/each}
									</div>
								{/if}
							</div>
						{/if}
					</article>
				{/each}
			</div>
		</section>
		<section>
			<h2>Automated reasoning</h2>
			<p>
				Not all of folklore is explicitly documented. We use automated reasoning to derive portions of the zoo, and provide sketch proofs.
			</p>
		</section>
	</main>
</div>

<style>
	:global(body) {
		overflow: auto;
	}

	.about-page {
		max-width: 48rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		color: #334155;
	}

	.about-header {
		margin-bottom: 2rem;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 1rem;
		color: #2563eb;
		text-decoration: none;
		font-size: 0.875rem;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}

	h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0 0 0.5rem;
	}

	.about-content section {
		margin-bottom: 1.5rem;
	}

	.definition-list {
		display: grid;
		gap: 0.9rem;
	}

	.definition-card {
		scroll-margin-top: 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
	}

	.definition-card.expanded {
		border-color: #cbd5e1;
	}

	.definition-card-header {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.875rem 1rem;
		border: 0;
		background: transparent;
		cursor: pointer;
		text-align: left;
	}

	.definition-card h3 {
		font-size: 1rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}

	.definition-toggle {
		display: inline-grid;
		flex: 0 0 auto;
		width: 1.5rem;
		height: 1.5rem;
		place-items: center;
		border-radius: 999px;
		background: #e2e8f0;
		color: #334155;
		font-size: 1rem;
		font-weight: 700;
		line-height: 1;
	}

	.definition-body {
		padding: 0 1rem 0.875rem;
		border-top: 1px solid #e2e8f0;
	}

	.definition-statement,
	.definition-explanation {
		margin: 0.4rem 0;
		line-height: 1.65;
		color: #475569;
	}

	.definition-refs {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: #64748b;
	}

	.definition-refs span {
		font-weight: 600;
		color: #334155;
	}

	p {
		line-height: 1.65;
		margin: 0 0 0.75rem;
		color: #475569;
	}

	ul {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
		color: #475569;
	}

	li {
		line-height: 1.65;
		margin-bottom: 0.375rem;
	}

	a {
		color: #2563eb;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>

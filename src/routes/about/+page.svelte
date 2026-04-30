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
	<title>About — Knowledge Compilation Map</title>
</svelte:head>

<div class="about-page">
	<header class="about-header">
		<a href="/" class="back-link">← Back to Map</a>
		<h1>About the Knowledge Compilation Map</h1>
	</header>

	<main class="about-content">
		<section>
			<h2>What is this?</h2>
			<p>
				The Knowledge Compilation Map is an interactive summary of the core
				<MathText text="succinctness" /> and <MathText text="tractability" /> concepts
				that organize propositional knowledge compilation. It presents a curated graph of
				representation languages, the operations they support, and the known compilation
				relationships between them, building on the foundational work of
				<a href="https://doi.org/10.1613/jair.1391" target="_blank" rel="noopener">
					Darwiche &amp; Marquis (2002)
				</a>
				and incorporates results from subsequent research.
			</p>
		</section>

		<section>
			<h2>Definitions</h2>
			<p>
				These definitions intend to provide a concise overview of the key concepts in knowledge compilation. They are kept
				lightweight and informal for accessibility, but each is linked to more formal statements in the literature.
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
			<h2>Languages</h2>
			<p>
				The map covers roughly 28 propositional language classes — including NNF, DNNF,
				d-DNNF, FBDD, OBDD, SDD, CNF, DNF, and others — organized in a directed graph
				where edges represent whether one language can be polynomially or
				quasi-polynomially compiled into another.
			</p>
		</section>

		<section>
			<h2>Operations</h2>
			<p>
				For each language, the map tracks support for standard <strong>queries</strong>
				(CO, VA, CE, IM, EQ, SE, CT, ME) and <strong>transformations</strong>
				(CD, FO, SFO, ∧C, ∧BC, ∨C, ∨BC, ¬C), indicating whether each can be
				performed in polynomial time, quasi-polynomial time, or not at all.
			</p>
		</section>

		<section>
			<h2>Automated reasoning</h2>
			<p>
				Starting from a hand-curated knowledge base of published results, the tool
				validates consistency and propagates derived facts through fixed-point algorithms:
			</p>
			<ul>
				<li>
					<strong>Upgrade propagation</strong> — transitive closure over succinctness
					edges infers new polynomial/quasi-polynomial compilations.
				</li>
				<li>
					<strong>Downgrade propagation</strong> — contradiction-based reasoning rules out
					compilations that would violate known negative results.
				</li>
				<li>
					<strong>Operation propagation</strong> — query and transformation support is
					inferred via succinctness relations and operation implication lemmas.
				</li>
			</ul>
			<p>
				All derived entries are tagged with human-readable proof descriptions and
				literature references.
			</p>
		</section>

		<section>
			<h2>Separating functions</h2>
			<p>
				Exponential succinctness gaps between languages are witnessed by
				<strong>separating function families</strong> — Boolean functions like
				<MathText text="OR_n" />, Clique, Parity, and others — that have compact
				representations in one language but provably require exponential size in another.
			</p>
		</section>

		<section>
			<h2>Contributing</h2>
			<p>
				Know of a new result? Use the
				<a href="/contribute">contribution workflow</a> to propose new edges, operation
				results, or language additions. Submissions are reviewed before integration.
			</p>
		</section>

		<section>
			<h2>Links</h2>
			<ul>
				<li>
					<a href="https://github.com/dkahdian/kcm" target="_blank" rel="noopener">
						GitHub repository
					</a>
				</li>
				<li>
					<a href="https://doi.org/10.1613/jair.989" target="_blank" rel="noopener">
						Darwiche &amp; Marquis, "A Knowledge Compilation Map" (JAIR, 2002)
					</a>
				</li>
			</ul>
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

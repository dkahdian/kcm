<script lang="ts">
	import MathText from '$lib/components/MathText.svelte';
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
				The Knowledge Compilation Map is an interactive tool for exploring
				<strong>succinctness relations</strong> and <strong>tractability results</strong>
				across propositional language classes used in knowledge compilation. It is based on
				the foundational work of
				<a href="https://doi.org/10.1613/jair.1391" target="_blank" rel="noopener">
					Darwiche &amp; Marquis (2002)
				</a>
				and incorporates results from subsequent research.
			</p>
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

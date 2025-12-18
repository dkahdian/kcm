<script lang="ts">
  import { renderMathText } from '$lib/utils/math-text';

  let {
    text = '',
    className = '',
    as = 'span',
    href,
    target,
    rel,
    ...rest
  }: {
    text?: string | null;
    className?: string;
    as?: keyof HTMLElementTagNameMap | 'span';
    href?: string;
    target?: string;
    rel?: string;
    [key: string]: unknown;
  } = $props();

  const result = $derived(renderMathText(text));

  const resolvedElement = $derived((href ? 'a' : as) as keyof HTMLElementTagNameMap | 'span');
  const resolvedRel = $derived(rel ?? (target === '_blank' ? 'noreferrer noopener' : undefined));
</script>

{#if result.html}
  <svelte:element
    this={resolvedElement}
    class={`math-text ${className}`.trim()}
    aria-label={text ?? ''}
    href={href}
    target={target}
    rel={resolvedRel}
    {...rest}
  >
    {@html result.html}
  </svelte:element>
{:else}
  <svelte:element
    this={resolvedElement}
    class={`math-text ${className}`.trim()}
    href={href}
    target={target}
    rel={resolvedRel}
    {...rest}
  >
    {text}
  </svelte:element>
{/if}

<style>
  .math-text :global(.katex-display) {
    margin: 0;
  }

  .math-text :global(.katex) {
    font-size: 0.95em;
  }

  :global(.math-text.edge-link) {
    display: inline;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: rgba(37, 99, 235, 0.3);
    transition: text-decoration-color 0.15s ease;
  }

  :global(.math-text.edge-link:hover) {
    text-decoration-color: rgba(37, 99, 235, 0.8);
  }
</style>

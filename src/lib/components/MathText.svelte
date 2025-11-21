<script lang="ts">
  import { renderMathText } from '$lib/utils/math-text';

  let {
    text = '',
    className = '',
    as = 'span'
  }: {
    text?: string | null;
    className?: string;
    as?: keyof HTMLElementTagNameMap | 'span';
  } = $props();

  const result = $derived(renderMathText(text));
</script>

{#if result.html}
  <svelte:element this={as} class={`math-text ${className}`.trim()} aria-label={text ?? ''}>
    {@html result.html}
  </svelte:element>
{:else}
  <svelte:element this={as} class={`math-text ${className}`.trim()}>{text}</svelte:element>
{/if}

<style>
  .math-text :global(.katex-display) {
    margin: 0;
  }

  .math-text :global(.katex) {
    font-size: 0.95em;
  }
</style>

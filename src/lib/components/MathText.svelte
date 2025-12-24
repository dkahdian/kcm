<script lang="ts">
  import { renderMathText, renderTextWithCitations, containsCitations, extractCitationKeys } from '$lib/utils/math-text';
  import type { KCReference } from '$lib/types.js';

  let {
    text = '',
    className = '',
    as = 'span',
    href,
    target,
    rel,
    /** 
     * Optional references for resolving inline citations like \citet{darwiche2002}.
     * If provided, citations will be rendered as clickable [N] links.
     */
    references = undefined as KCReference[] | undefined,
    /**
     * Callback when a citation is clicked. Receives the citation key.
     */
    onCitationClick = undefined as ((key: string) => void) | undefined,
    ...rest
  }: {
    text?: string | null;
    className?: string;
    as?: keyof HTMLElementTagNameMap | 'span';
    href?: string;
    target?: string;
    rel?: string;
    references?: KCReference[];
    onCitationClick?: (key: string) => void;
    [key: string]: unknown;
  } = $props();

  const result = $derived(renderMathText(text));
  
  // Build a map from citation key to reference number
  const citationKeyToNumber = $derived.by(() => {
    if (!references?.length) return new Map<string, number>();
    
    const map = new Map<string, number>();
    references.forEach((ref, idx) => {
      // Map both the reference ID and any citation key extracted from bibtex
      map.set(ref.id, idx + 1);
      map.set(ref.id.toLowerCase(), idx + 1);
      
      // Also try to extract the bibtex citation key (e.g., "darwiche2002" from "@article{darwiche2002,...")
      if (ref.bibtex) {
        const keyMatch = ref.bibtex.match(/@\w+\{([^,\s]+)/);
        if (keyMatch) {
          map.set(keyMatch[1], idx + 1);
          map.set(keyMatch[1].toLowerCase(), idx + 1);
        }
      }
    });
    return map;
  });
  
  // Process HTML to replace citations with clickable links
  const processedHtml = $derived.by(() => {
    if (!result.html) return null;
    if (!references?.length || !containsCitations(text ?? '')) {
      return result.html;
    }
    
    return renderTextWithCitations(
      result.html,
      (key) => citationKeyToNumber.get(key) ?? citationKeyToNumber.get(key.toLowerCase()) ?? null
    );
  });

  const resolvedElement = $derived((href ? 'a' : as) as keyof HTMLElementTagNameMap | 'span');
  const resolvedRel = $derived(rel ?? (target === '_blank' ? 'noreferrer noopener' : undefined));
  
  // Handle citation clicks via event delegation
  function handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('citation-link')) {
      const key = target.dataset.citationKey;
      if (key && onCitationClick) {
        event.preventDefault();
        onCitationClick(key);
      }
    }
  }
</script>

{#if processedHtml}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svelte:element
    this={resolvedElement}
    class={`math-text ${className}`.trim()}
    aria-label={text ?? ''}
    href={href}
    target={target}
    rel={resolvedRel}
    onclick={references?.length ? handleClick : undefined}
    {...rest}
  >
    {@html processedHtml}
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

  .math-text :global(.citation-link) {
    display: inline;
    font-size: 0.7em;
    vertical-align: super;
    line-height: 0;
    color: #2563eb;
    background: none;
    border: none;
    padding: 0;
    margin: 0 0.1em;
    cursor: pointer;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.15s ease;
  }
  
  .math-text :global(.citation-link:hover) {
    color: #1d4ed8;
    text-decoration: underline;
  }
  
  .math-text :global(.citation-unknown) {
    display: inline;
    font-size: 0.7em;
    vertical-align: super;
    line-height: 0;
    color: #dc2626;
    font-weight: 600;
  }
</style>

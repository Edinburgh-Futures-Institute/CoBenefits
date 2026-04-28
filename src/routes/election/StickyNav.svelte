<script>
    import { onMount } from 'svelte';
    import { writable, derived } from 'svelte/store';
    export let sectionRefs;
  
    const visibleSections = writable(new Set());
  
    const sectionIds = ['head', 'overview', 'temporal', 'households'];

    const currentSection = writable(null);

    const visibleBars = derived(currentSection, $current => {
        if (!$current) return [];
        const idx = sectionIds.indexOf($current);
        return sectionIds.slice(0, idx + 1);
    });
  
    onMount(() => {
        const observer = new IntersectionObserver(
        (entries) => {
            let visible = entries
            .filter(e => e.isIntersecting)
            .map(e => e.target.id);

            if (visible.length > 0) {
            const highest = sectionIds.find(id => visible.includes(id));
            if (highest) currentSection.set(highest);
            }
        },
        {
            rootMargin: '-40px 0px 0px 0px',
            threshold: 0.5
        }
        );

        sectionIds.forEach(id => {
        const el = sectionRefs[id];
        if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    });
  </script>
  
  <style>
    /* .sticky-stack {
      position: sticky;
      top: 65;
      z-index: 999;
    }
  
    .sticky-bar {
      height: 40px;
      background-color: #f1f1f1;
      border-bottom: 1px solid #ccc;
      display: flex;
      align-items: center;
      padding: 0 1rem;
      font-weight: bold;
    } */

  </style>
  
  <!-- Render stacked sticky bars -->
  <div class="sticky-stack">
    {#each $visibleBars as id (id)}
      <div class="sticky-bar">{id.toUpperCase()}</div>
    {/each}
  </div>
  
  
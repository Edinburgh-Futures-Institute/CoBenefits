<script lang="ts">
  export type BadgeIconName = 'Confirmation' | 'Warning' | 'Info' | 'Interactive' | 'badge-check';
  export let name: BadgeIconName;
  export let size: number = 0;
  export let bg: string | null = null;
  export let fg: string | null = null;
  export let bgOpacity: number = 0.14;
</script>

{#if name === 'Confirmation'}
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" fill={bg ?? 'currentColor'} opacity={bgOpacity} />
    <path
      d="M9.2 12.5 7.5 10.8a1 1 0 0 0-1.4 1.4l2.4 2.4a1 1 0 0 0 1.4 0l7-7a1 1 0 1 0-1.4-1.4l-6.3 6.3Z"
      fill={fg ?? 'currentColor'}
    />
  </svg>
{:else if name === 'Warning'}
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3.5c.4 0 .8.2 1 .6l9 15.6c.4.7-.1 1.6-1 1.6H3c-.9 0-1.4-.9-1-1.6l9-15.6c.2-.4.6-.6 1-.6Z"
      fill={bg ?? 'currentColor'}
      opacity={bgOpacity}
    />
    <path
      d="M12 8a1 1 0 0 1 1 1l-.3 5.5a.7.7 0 0 1-1.4 0L11 9a1 1 0 0 1 1-1Z"
      fill={fg ?? 'currentColor'}
    />
    <path d="M12 18a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 12 18Z" fill={fg ?? 'currentColor'} />
  </svg>
{:else if name === 'Info'}
  <!-- square info icon (matches the reference's special-cased "Info") -->
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 3h18v18H3V3Z" fill={bg ?? 'currentColor'} opacity={bgOpacity} />
    <path d="M12 10.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill={fg ?? 'currentColor'} />
    <path d="M11 11.5h2V18h-2v-6.5Z" fill={fg ?? 'currentColor'} />
  </svg>
{:else if name === 'Interactive'}
  <!-- lucide mouse-pointer-click -->
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    stroke={fg ?? 'currentColor'}
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" fill={bg ?? 'currentColor'} opacity={bgOpacity} stroke="none" />
    <!-- scale down the glyph slightly so it reads better inside small badges -->
    <g transform="translate(12 12) scale(0.86) translate(-12 -12)">
      <path d="M14 4.1 12 6" />
      <path d="m5.1 8-2.9-.8" />
      <path d="m6 12-1.9 2" />
      <path d="M7.2 2.2 8 5.1" />
      <path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" />
    </g>
  </svg>
{:else if name === 'badge-check'}
  <!-- lucide badge-check -->
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    stroke={fg ?? 'currentColor'}
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- scale down the glyph slightly so it reads better inside small badges -->
    <g transform="translate(12 12) scale(0.86) translate(-12 -12)">
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill={bg ?? 'none'}
        opacity={bgOpacity}
      />
      <path d="m9 12 2 2 4-4" />
    </g>
  </svg>
{:else}
  <span style="display:inline-block;width:{size}px;height:{size}px" aria-hidden="true" />
{/if}


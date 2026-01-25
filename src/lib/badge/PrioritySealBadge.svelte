<script lang="ts">
  import Badge from './Badge.svelte';
  import type { BadgeData, BadgeOnClick } from './types';
  import type { SealVariant } from './Badge.svelte';

  /**
   * Backwards-compatible wrapper around the generic `Badge` component.
   * Prefer:
   *   <Badge type="big" bigStyle="seal" ... />
   */
  export let badge: BadgeData;
  export let variant: SealVariant = 'outlined';
  export let onClick: BadgeOnClick | null = null;

  export let ringText: string | null = null;
  export let repeat: number = 2;
  export let separator: string = ' • ';
  export let size: number = 76;
  export let rotationMs: number = 200000;
</script>

<Badge
  {badge}
  type="big"
  bigStyle="seal"
  sealVariant={variant}
  {onClick}
  {ringText}
  {repeat}
  {separator}
  sealSize={size}
  {rotationMs}
/>


<script lang="ts">
  import Badge from './Badge.svelte';
  import type { BadgeData, BadgeOnClick } from './types';
  import type { BigRoundVariant } from './Badge.svelte';

  /**
   * Backwards-compatible wrapper around the generic `Badge` component.
   * Prefer:
   *   <Badge type="big" bigStyle="round" ... />
   */
  export let badge: BadgeData;
  export let variant: BigRoundVariant = 'solid';
  export let size: number = 44;
  export let onClick: BadgeOnClick | null = null;
</script>

<Badge {badge} type="big" bigStyle="round" bigVariant={variant} bigSize={size} {onClick} />


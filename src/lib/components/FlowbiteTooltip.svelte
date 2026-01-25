<script lang="ts">
  export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

  export let placement: TooltipPlacement = 'top';
  export let openDelayMs = 80;

  let open = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function onEnter() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => (open = true), openDelayMs);
  }

  function onLeave() {
    if (timer) clearTimeout(timer);
    timer = null;
    open = false;
  }
</script>

<span class="fb-tooltip-wrap" on:mouseenter={onEnter} on:mouseleave={onLeave} on:focusin={onEnter} on:focusout={onLeave}>
  <span class="fb-trigger">
    <slot name="trigger" />
  </span>

  <span class="fb-tooltip {open ? 'open' : ''} {placement}" role="tooltip" aria-hidden={!open}>
    <span class="fb-content">
      <slot name="content" />
    </span>
    <span class="fb-arrow" aria-hidden="true" />
  </span>
</span>

<style>
  /* Flowbite-inspired tooltip styling (self-contained; no Tailwind dependency). */
  .fb-tooltip-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .fb-trigger {
    display: inline-flex;
    align-items: center;
  }

  .fb-tooltip {
    display: none;
    position: absolute;
    z-index: 2000;
    width: max-content;
    max-width: min(280px, 64vw);
    padding: 7px 9px;
    border-radius: 9px;
    border: 1px solid rgba(17, 24, 39, 0.14);
    background: rgba(17, 24, 39, 0.96);
    color: #ffffff;
    box-shadow: 0 10px 24px rgba(17, 24, 39, 0.2);
    font-size: 12px;
    line-height: 1.3;

    opacity: 0;
    transform: translateY(-6px);
    pointer-events: none;
    transition: opacity 130ms ease, transform 130ms ease;
  }

  .fb-tooltip.open {
    display: block;
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  /* Centered above/below by default */
  .fb-tooltip.top {
    left: 50%;
    bottom: calc(100% + 10px);
    transform: translateX(-50%) translateY(-6px);
  }
  .fb-tooltip.top.open {
    transform: translateX(-50%) translateY(0);
  }

  .fb-tooltip.bottom {
    left: 50%;
    top: calc(100% + 10px);
    transform: translateX(-50%) translateY(6px);
  }
  .fb-tooltip.bottom.open {
    transform: translateX(-50%) translateY(0);
  }

  .fb-tooltip.left {
    right: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%) translateX(-6px);
  }
  .fb-tooltip.left.open {
    transform: translateY(-50%) translateX(0);
  }

  .fb-tooltip.right {
    left: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%) translateX(6px);
  }
  .fb-tooltip.right.open {
    transform: translateY(-50%) translateX(0);
  }

  .fb-arrow {
    position: absolute;
    width: 8px;
    height: 8px;
    background: rgba(17, 24, 39, 0.96);
    border-left: 1px solid rgba(17, 24, 39, 0.14);
    border-top: 1px solid rgba(17, 24, 39, 0.14);
    transform: rotate(45deg);
  }

  .fb-tooltip.top .fb-arrow {
    left: 50%;
    bottom: -4px;
    margin-left: -4px;
  }

  .fb-tooltip.bottom .fb-arrow {
    left: 50%;
    top: -4px;
    margin-left: -4px;
    transform: rotate(225deg);
  }

  .fb-tooltip.left .fb-arrow {
    top: 50%;
    right: -4px;
    margin-top: -4px;
    transform: rotate(135deg);
  }

  .fb-tooltip.right .fb-arrow {
    top: 50%;
    left: -4px;
    margin-top: -4px;
    transform: rotate(-45deg);
  }
</style>


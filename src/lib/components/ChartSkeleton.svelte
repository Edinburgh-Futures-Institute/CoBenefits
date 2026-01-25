<script lang="ts">
  export let height = 240;
  export let width: string = '100%';
  export let radius = 12;
</script>

<div
  class="skeleton"
  aria-hidden="true"
  style="height: {height}px; width: {width}; border-radius: {radius}px;"
>
  <div class="lines">
    <div class="line" style="width: 68%;" />
    <div class="line" style="width: 52%;" />
    <div class="line" style="width: 40%;" />
  </div>
</div>

<style>
  .skeleton {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      #f6f7f9 0%,
      #f6f7f9 35%,
      #eef0f4 50%,
      #f6f7f9 65%,
      #f6f7f9 100%
    );
    background-size: 240% 100%;
    border: 1px solid #e7e9ee;
    overflow: hidden;
    box-shadow: 0 1px 0 rgba(17, 24, 39, 0.03);
    animation: shimmer 1.25s ease-in-out infinite;
  }

  .lines {
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 16px;
    display: grid;
    gap: 10px;
  }

  .line {
    height: 10px;
    border-radius: 999px;
    background: rgba(17, 24, 39, 0.06);
  }

  @keyframes shimmer {
    0% {
      background-position: 0% 0%;
    }
    100% {
      background-position: 100% 0%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton {
      animation: none;
      background: #f6f7f9;
    }
  }
</style>


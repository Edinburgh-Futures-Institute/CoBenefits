<script lang="ts">
  import NavigationBar from '$lib/components/NavigationBar.svelte';
  import Badge from '$lib/badge/Badge.svelte';
  import MiniBadges from '$lib/badge/MiniBadges.svelte';
  import type { BadgeData, BadgeOnClick } from '$lib/badge/types';

  const samples: BadgeData[] = [
    {
      id: '2',
      label: 'Major Finding',
      description:
        'Indicates that the visualization uses publicly accessible data, which can be downloaded, verified, or reused.',
      intent: 'CONFIRMATION'
    },
    {
      id: '3',
      label: 'Open Data',
      description:
              'Indicates that the visualization uses publicly accessible data, which can be downloaded, verified, or reused.',
      intent: 'CONFIRMATION'
    },
    {
      id: '92',
      label: 'Truncated Axis',
      description:
        'Indicates that the visualization uses a truncated axis, which can affect perception of differences.',
      intent: 'WARNING'
    },
    {
      id: '31',
      label: 'Open Data',
      description: 'Indicates that uncertainty is explicitly shown (e.g., intervals, error bars, bands, or ranges).',
      intent: 'INFORMATION'
    }
  ];

  const openDataClick: BadgeOnClick = { href: 'https://google.com', external: true };
  const internalClick: BadgeOnClick = { href: '/', external: false };

  function clickFor(badge: BadgeData): BadgeOnClick {
    const id = String(badge?.id ?? '');
    if (id === '3') return openDataClick;
    return internalClick;
  }

  const onClickById: Record<string | number, BadgeOnClick> = Object.fromEntries(
    samples.map((b) => [b.id ?? b.label, clickFor(b)])
  );
</script>

<NavigationBar />

<main class="playground">

  <section class="mini-section" aria-label="High priority badges with label">
    <div class="grid">
      <section class="col" aria-label="Filled high priority badges with label">
        <h3 class="section-title">Filled</h3>
        <div class="priority-row">
          {#each samples as badge (badge.id)}
            <Badge {badge} type="big" bigStyle="round" bigVariant="solid" onClick={clickFor(badge)} />
          {/each}
        </div>
      </section>

      <section class="col" aria-label="Outlined high priority badges with label">
        <h3 class="section-title">Outlined</h3>
        <div class="priority-row">
          {#each samples as badge (badge.id)}
            <Badge {badge} type="big" bigStyle="round" bigVariant="ring" onClick={clickFor(badge)} />
          {/each}
        </div>
      </section>
    </div>
  </section>

  <section class="mini-section" aria-label="High priority seal badges">
    <div class="grid">
      <section class="col" aria-label="Filled seal badges">
        <h3 class="section-title">Filled</h3>
        <div class="priority-row">
          {#each samples as badge (badge.id)}
            <Badge
              {badge}
              type="big"
              bigStyle="seal"
              sealVariant="filled"
              onClick={clickFor(badge)}
              ringText={badge.label}
              repeat={2}
              separator="•"
              sealSize={100}
              rotationMs={80000}
            />
          {/each}
        </div>
      </section>

      <section class="col" aria-label="Outlined seal badges">
        <h3 class="section-title">Outlined</h3>
        <div class="priority-row">
          {#each samples as badge (badge.id)}
            <Badge
              {badge}
              type="big"
              bigStyle="seal"
              sealVariant="outlined"
              onClick={clickFor(badge)}
              ringText={badge.label}
              repeat={2}
              separator="•"
              sealSize={100}
              rotationMs={80000}
            />
          {/each}
        </div>
      </section>
    </div>
  </section>

  <section class="mini-section" aria-label="Normal badges">
    <div class="grid">
      <section class="col" aria-label="Filled badges">
        <h3 class="section-title">Filled</h3>
        <div class="badge-row">
          {#each samples as badge (badge.id)}
            <div class="badge-block">
              <Badge {badge} variant="filled" onClick={clickFor(badge)} />
            </div>
          {/each}
        </div>
      </section>

      <section class="col" aria-label="Outlined badges">
        <h3 class="section-title">Outlined</h3>
        <div class="badge-row">
          {#each samples as badge (badge.id)}
            <div class="badge-block">
              <Badge {badge} variant="outlined" onClick={clickFor(badge)} />
            </div>
          {/each}
        </div>
      </section>
    </div>
  </section>

  <section class="col mini-section" aria-label="Mini badges">
    <h2 class="section-title">Mini</h2>
    <div class="mini-demo">
      <MiniBadges badges={samples} fixed={false} expandDirection="right" {onClickById} />
    </div>
  </section>
</main>

<style>
  .playground {
    max-width: 980px;
    margin: 24px auto;
    padding: 0 16px;
  }

  .title {
    margin: 0 0 8px 0;
    font-size: 28px;
  }

  .subtitle {
    margin: 0 0 16px 0;
    color: rgba(17, 24, 39, 0.75);
    line-height: 1.45;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    align-items: start;
  }

  @media (max-width: 860px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  .col {
    border: 1px solid rgba(17, 24, 39, 0.1);
    border-radius: 16px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .mini-section {
    margin-top: 18px;
  }

  .mini-demo {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    min-height: 44px;
  }

  .priority-grid {
    display: grid;
    gap: 12px;
  }

  .priority-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  /* Reuse the main grid+col styling for the seal showcase too. */

  .section-title {
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: 800;
    color: rgba(17, 24, 39, 0.7);
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .badge-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  .badge-block {
    display: grid;
    gap: 6px;
  }

  /* no controls (badges are always interactive) */
</style>

<script lang="ts">
  import FlowbiteTooltip from '$lib/components/FlowbiteTooltip.svelte';
  import BadgeIcon from './icons/BadgeIcon.svelte';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { onDestroy } from 'svelte';
  import posthog from 'posthog-js';
  import { recordBadgeInteraction } from './feedback';
  import type { BadgeData, BadgeHint, BadgeHintIcon, BadgeIntent, BadgeOnClick } from './types';
  import type { BadgeIconName } from './icons/BadgeIcon.svelte';

  export type BadgeType = 'mini' | 'normal' | 'big';
  export type BadgeTone = 'neutral' | 'success' | 'info' | 'warning';
  export type BadgeVariant = 'filled' | 'outlined';

  // Big badge renderers
  export type BigStyle = 'round' | 'seal';
  export type BigRoundVariant = 'solid' | 'ring' | 'double-ring' | 'stamp' | 'glow';
  export type SealVariant = 'outlined' | 'filled';

  export let badge: BadgeData;

  /**
   * Generic badge size.
   * - mini: collapsed icon-only pill (expands on hover/focus)
   * - normal: standard pill badge
   * - big: high-priority badge (round or sealed)
   */
  export let type: BadgeType = 'normal';

  /**
   * Deprecated alias (kept for backwards compatibility).
   * Prefer `type="mini"`.
   */
  export let variant: BadgeVariant = 'filled';
  export let mini: boolean = false;
  export let onClick: BadgeOnClick | null = null;
  export let analytics: boolean = true;

  function toIntent(value: unknown): BadgeIntent | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.normalize('NFKC').replace(/\s+/g, ' ').trim().toUpperCase();
    if (normalized === 'CONFIRMATION') return 'CONFIRMATION';
    if (normalized === 'INFORMATION') return 'INFORMATION';
    if (normalized === 'WARNING') return 'WARNING';
    return undefined;
  }

  function intentToTone(intent?: BadgeIntent): BadgeTone {
    if (!intent) return 'neutral';
    if (intent === 'CONFIRMATION') return 'success';
    if (intent === 'INFORMATION') return 'info';
    if (intent === 'WARNING') return 'warning';
    return 'neutral';
  }

  function intentToIcon(intent?: BadgeIntent): BadgeIconName | null {
    if (!intent) return null;
    if (intent === 'CONFIRMATION') return 'Confirmation';
    if (intent === 'INFORMATION') return 'Info';
    if (intent === 'WARNING') return 'Warning';
    return null;
  }

  $: intent = toIntent(badge?.intent);
  $: tone = intentToTone(intent);
  $: iconName = badge?.icon ?? intentToIcon(intent);

  $: effectiveType = mini ? 'mini' : type;
  $: badgeId = badge?.id != null ? String(badge.id) : String(badge?.label ?? '');
  $: isComparisonAverage = badgeId === 'comparison-average';

  // ----- Analytics (PostHog) -----
  let hoverStartMs: number | null = null;
  let hoverMode: 'mouse' | 'focus' | null = null;
  const MIN_INTERACTION_DWELL_MS = 1000;

  function nowMs() {
    // performance.now() is monotonic and ideal for durations; fallback is fine.
    return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
  }

  function safeCapture(event: string, properties: Record<string, unknown> = {}) {
    if (!analytics) return;
    if (!browser) return;
    try {
      posthog.capture(event, properties);
    } catch {
      // analytics should never break UI
    }
  }

  function baseProps(extra: Record<string, unknown> = {}) {
    return {
      badge_id: badgeId,
      badge_label: badge?.label ?? null,
      badge_type: badge?.type ?? null,
      badge_intent: intent ?? null,
      badge_render: effectiveType,
      badge_click_kind: clickKind,
      pathname: $page.url.pathname,
      ...extra
    };
  }

  function startHover(mode: 'mouse' | 'focus') {
    if (hoverStartMs != null) return;
    hoverStartMs = nowMs();
    hoverMode = mode;
    safeCapture('badge_hover', baseProps({ mode }));
  }

  function endHover(mode: 'mouse' | 'focus', endedBy: 'leave' | 'destroy' = 'leave') {
    if (hoverStartMs == null || hoverMode !== mode) return;
    const durationMs = Math.max(0, nowMs() - hoverStartMs);
    safeCapture('badge_hover_duration', baseProps({ mode, duration_ms: durationMs, ended_by: endedBy }));
    // Only count a badge as "interacted" if the user dwelled on it long enough.
    if (analytics && endedBy === 'leave' && durationMs >= MIN_INTERACTION_DWELL_MS) {
      recordBadgeInteraction(
        {
          id: badgeId,
          label: badge?.label ?? null,
          render: effectiveType,
          variant,
          intent: intent ?? null,
          icon: iconName ?? null,
          bigStyle: effectiveType === 'big' ? bigStyle : null,
          bigVariant: effectiveType === 'big' ? bigVariant : null,
          bigSize: effectiveType === 'big' ? bigSize : null,
          sealVariant: effectiveType === 'big' && bigStyle === 'seal' ? sealVariant : null,
          sealSize: effectiveType === 'big' && bigStyle === 'seal' ? sealSize : null,
          sealFontScale: effectiveType === 'big' && bigStyle === 'seal' ? sealFontScale : null,
          rotationMs: effectiveType === 'big' && bigStyle === 'seal' ? rotationMs : null
        },
        3
      );
    }
    hoverStartMs = null;
    hoverMode = null;
  }

  function handleMouseEnter() {
    startHover('mouse');
  }

  function handleMouseLeave() {
    endHover('mouse');
  }

  function handleFocusIn() {
    // optional: counts keyboard focus as "time spent" too (mode=focus)
    startHover('focus');
  }

  function handleFocusOut() {
    endHover('focus');
  }

  function handleClick(event: MouseEvent) {
    safeCapture(
      'badge_click',
      baseProps({
        button: typeof event.button === 'number' ? event.button : null
      })
    );
  }

  onDestroy(() => {
    if (hoverStartMs != null && hoverMode) {
      endHover(hoverMode, 'destroy');
    }
  });

  // ----- Normal/mini pill -----
  $: pillIconSize = effectiveType === 'mini' ? 22 : 20;
  $: showTooltip = effectiveType === 'big' ? true : Boolean(badge?.description) || Boolean(onClick);

  function isExternalHref(href: string, externalFlag?: boolean): boolean {
    if (externalFlag) return true;
    return /^https?:\/\//i.test(href);
  }

  function hasHref(click: BadgeOnClick | null): click is { href: string; external?: boolean; hint?: BadgeHint } {
    return Boolean(click) && typeof (click as any).href === 'string';
  }

  function hasAction(click: BadgeOnClick | null): click is {
    action: () => void;
    hint?: BadgeHint;
    ariaLabel?: string;
  } {
    return Boolean(click) && typeof (click as any).action === 'function';
  }

  function handleActionKeydown(e: KeyboardEvent, action: () => void) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  }

  $: clickKind = hasHref(onClick) ? 'link' : hasAction(onClick) ? 'action' : 'none';
  $: external = hasHref(onClick) ? isExternalHref(onClick.href, onClick.external) : false;
  $: href =
    hasHref(onClick)
      ? external
        ? onClick.href
        : (() => {
            const raw = onClick.href.startsWith('/') ? onClick.href : `/${onClick.href}`;
            return base && raw.startsWith(base + '/') ? raw : `${base}${raw}`;
          })()
      : null;

  function normalizeHint(hint: unknown): { text: string; icon: BadgeHintIcon | null } | null {
    if (typeof hint === 'string') {
      const text = hint.trim();
      return text ? { text, icon: null } : null;
    }
    if (hint && typeof hint === 'object') {
      const maybe = hint as any;
      const text = typeof maybe.text === 'string' ? maybe.text.trim() : '';
      const icon: BadgeHintIcon | null = maybe.icon === 'download' ? 'download' : maybe.icon === 'info' ? 'info' : null;
      return text ? { text, icon } : null;
    }
    return null;
  }

  $: normalizedHint = onClick && 'hint' in onClick ? normalizeHint((onClick as any).hint) : null;
  $: clickHintText = normalizedHint?.text ?? (clickKind !== 'none' ? 'Click for more' : '');
  $: clickHintIcon = normalizedHint?.icon ?? null;

  // ----- Big: round -----
  export let bigStyle: BigStyle = 'round';
  export let bigVariant: BigRoundVariant = 'solid';
  export let bigSize: number = 44;

  function fullLabel(label: unknown): string {
    const cleaned = String(label ?? '').trim();
    return cleaned || '—';
  }

  $: rawLabel = fullLabel(badge?.label);
  $: labelLen = rawLabel.length;
  // Big "round" badges always show the label; size is therefore label-aware.
  $: roundRenderSize = Math.min(104, Math.max(bigSize, 70 + Math.max(0, labelLen - 12) * 1.4));
  $: roundIconSize = Math.round(roundRenderSize * 0.34);
  $: roundTextSize = labelLen <= 12 ? 12 : labelLen <= 18 ? 11 : labelLen <= 26 ? 10 : 9;

  // ----- Big: seal -----
  export let sealVariant: SealVariant = 'outlined';
  export let ringText: string | null = null;
  export let repeat: number = 2;
  export let separator: string = ' • ';
  export let sealSize: number = 76;
  /**
   * Scales the ring text size relative to `sealSize`.
   * Increase slightly to make the ring text more readable.
   */
  export let sealFontScale: number = 0.12;
  export let rotationMs: number = 200000;

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  $: sealDisplayText = (ringText ?? badge?.label ?? '').trim() || '—';
  $: repeatSafe = clamp(Math.floor(repeat || 1), 1, 10);
  $: sealChars = [...Array(repeatSafe)]
    .map(() => [...sealDisplayText.toUpperCase()].concat([...separator.toUpperCase()]))
    .flat();
  $: ringFontPx = Math.round(sealSize * sealFontScale);
  $: centerIcon = Math.round(sealSize * 0.30);
</script>

{#if badge}
  {#if showTooltip}
    <FlowbiteTooltip
      placement="top"
      openDelayMs={effectiveType === 'big' ? 120 : effectiveType === 'mini' ? 420 : 80}
    >
      <span
        slot="trigger"
        on:mouseenter={handleMouseEnter}
        on:mouseleave={handleMouseLeave}
        on:focusin={handleFocusIn}
        on:focusout={handleFocusOut}
        on:click={handleClick}
      >
        {#if effectiveType === 'big'}
          {#if bigStyle === 'seal'}
            {#if clickKind === 'link' && href}
              <a
                class="seal {tone} {sealVariant}"
                style={`--seal-size:${sealSize}px; --seal-font:${ringFontPx}px; --rotation:${rotationMs}ms;`}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                aria-label={badge.label}
              >
                <span class="ring {rotationMs > 0 ? 'spin' : ''}" aria-hidden="true">
                  {#each sealChars as char, index (index)}
                    <span class="char" style={`--angle:${(1 / sealChars.length) * index}turn;`}>{char}</span>
                  {/each}
                </span>

                <span class="center" aria-hidden="true">
                  <span class="center-pill">
                    {#if iconName}
                      <BadgeIcon
                        name={iconName}
                        size={centerIcon}
                        bg="var(--seal-solid)"
                        fg="#ffffff"
                        bgOpacity={1}
                      />
                    {/if}
                  </span>
                </span>
              </a>
            {:else if clickKind === 'action' && onClick && 'action' in onClick}
              <span
                class="seal {tone} {sealVariant}"
                style={`--seal-size:${sealSize}px; --seal-font:${ringFontPx}px; --rotation:${rotationMs}ms;`}
                role="button"
                tabindex="0"
                on:click={onClick.action}
                on:keydown={(e) => handleActionKeydown(e, onClick.action)}
                aria-label={onClick.ariaLabel ?? badge.label}
              >
                <span class="ring {rotationMs > 0 ? 'spin' : ''}" aria-hidden="true">
                  {#each sealChars as char, index (index)}
                    <span class="char" style={`--angle:${(1 / sealChars.length) * index}turn;`}>{char}</span>
                  {/each}
                </span>

                <span class="center" aria-hidden="true">
                  <span class="center-pill">
                    {#if iconName}
                      <BadgeIcon
                        name={iconName}
                        size={centerIcon}
                        bg="var(--seal-solid)"
                        fg="#ffffff"
                        bgOpacity={1}
                      />
                    {/if}
                  </span>
                </span>
              </span>
            {:else}
              <span
                class="seal {tone} {sealVariant}"
                style={`--seal-size:${sealSize}px; --seal-font:${ringFontPx}px; --rotation:${rotationMs}ms;`}
                role="note"
                tabindex="0"
                aria-label={badge.label}
              >
                <span class="ring {rotationMs > 0 ? 'spin' : ''}" aria-hidden="true">
                  {#each sealChars as char, index (index)}
                    <span class="char" style={`--angle:${(1 / sealChars.length) * index}turn;`}>{char}</span>
                  {/each}
                </span>

                <span class="center" aria-hidden="true">
                  <span class="center-pill">
                    {#if iconName}
                      <BadgeIcon
                        name={iconName}
                        size={centerIcon}
                        bg="var(--seal-solid)"
                        fg="#ffffff"
                        bgOpacity={1}
                      />
                    {/if}
                  </span>
                </span>
              </span>
            {/if}
          {:else}
            {#if clickKind === 'link' && href}
              <a
                class="prio {tone} {bigVariant} with-label"
                style={`--prio-size:${roundRenderSize}px; --prio-text-size:${roundTextSize}px;`}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                aria-label={badge.label}
              >
                <span class="prio-inner" aria-hidden="true">
                  {#if iconName}
                    <BadgeIcon
                      name={iconName}
                      size={roundIconSize}
                      bg={bigVariant === 'solid' ? '#ffffff' : 'var(--prio-solid)'}
                      bgOpacity={1}
                      fg={bigVariant === 'solid' ? 'var(--prio-solid)' : '#ffffff'}
                    />
                  {/if}
                  <span class="prio-text">{rawLabel}</span>
                </span>
              </a>
            {:else if clickKind === 'action' && onClick && 'action' in onClick}
              <span
                class="prio {tone} {bigVariant} with-label"
                style={`--prio-size:${roundRenderSize}px; --prio-text-size:${roundTextSize}px;`}
                role="button"
                tabindex="0"
                on:click={onClick.action}
                on:keydown={(e) => handleActionKeydown(e, onClick.action)}
                aria-label={onClick.ariaLabel ?? badge.label}
              >
                <span class="prio-inner" aria-hidden="true">
                  {#if iconName}
                    <BadgeIcon
                      name={iconName}
                      size={roundIconSize}
                      bg={bigVariant === 'solid' ? '#ffffff' : 'var(--prio-solid)'}
                      bgOpacity={1}
                      fg={bigVariant === 'solid' ? 'var(--prio-solid)' : '#ffffff'}
                    />
                  {/if}
                  <span class="prio-text">{rawLabel}</span>
                </span>
              </span>
            {:else}
              <span
                class="prio {tone} {bigVariant} with-label"
                style={`--prio-size:${roundRenderSize}px; --prio-text-size:${roundTextSize}px;`}
                role="note"
                tabindex="0"
                aria-label={badge.label}
              >
                <span class="prio-inner" aria-hidden="true">
                  {#if iconName}
                    <BadgeIcon
                      name={iconName}
                      size={roundIconSize}
                      bg={bigVariant === 'solid' ? '#ffffff' : 'var(--prio-solid)'}
                      bgOpacity={1}
                      fg={bigVariant === 'solid' ? 'var(--prio-solid)' : '#ffffff'}
                    />
                  {/if}
                  <span class="prio-text">{rawLabel}</span>
                </span>
              </span>
            {/if}
          {/if}
        {:else}
          {#if clickKind === 'link' && href}
            <a
              class="badge {tone} {variant} {effectiveType === 'mini' ? 'mini' : ''} {isComparisonAverage ? 'avg-grey' : ''} interactive"
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              aria-label={badge.label}
            >
              {#if iconName}
                <span class="icon" aria-hidden="true">
                  <BadgeIcon
                    name={iconName}
                    size={pillIconSize}
                    bg={variant === 'outlined' ? 'var(--badge-solid)' : '#ffffff'}
                    fg={variant === 'outlined' ? '#ffffff' : 'var(--badge-solid)'}
                    bgOpacity={1}
                  />
                </span>
              {/if}
              <span class="label">{badge.label}</span>
            </a>
          {:else if clickKind === 'action' && onClick && 'action' in onClick}
            <span
              class="badge {tone} {variant} {effectiveType === 'mini' ? 'mini' : ''} {isComparisonAverage ? 'avg-grey' : ''} interactive"
              role="button"
              tabindex="0"
              on:click={onClick.action}
              on:keydown={(e) => handleActionKeydown(e, onClick.action)}
              aria-label={onClick.ariaLabel ?? badge.label}
            >
              {#if iconName}
                <span class="icon" aria-hidden="true">
                  <BadgeIcon
                    name={iconName}
                    size={pillIconSize}
                    bg={variant === 'outlined' ? 'var(--badge-solid)' : '#ffffff'}
                    fg={variant === 'outlined' ? '#ffffff' : 'var(--badge-solid)'}
                    bgOpacity={1}
                  />
                </span>
              {/if}
              <span class="label">{badge.label}</span>
            </span>
          {:else}
            <span
              class="badge {tone} {variant} {effectiveType === 'mini' ? 'mini' : ''} {isComparisonAverage ? 'avg-grey' : ''} interactive"
              role="note"
              aria-label={badge.label}
              tabindex="0"
            >
              {#if iconName}
                <span class="icon" aria-hidden="true">
                  <BadgeIcon
                    name={iconName}
                    size={pillIconSize}
                    bg={variant === 'outlined' ? 'var(--badge-solid)' : '#ffffff'}
                    fg={variant === 'outlined' ? '#ffffff' : 'var(--badge-solid)'}
                    bgOpacity={1}
                  />
                </span>
              {/if}
              <span class="label">{badge.label}</span>
            </span>
          {/if}
        {/if}
      </span>
      <span slot="content">
        {#if effectiveType === 'big'}
          <strong>{badge.label}</strong>
          {#if badge.description}
            <span style="display:block;margin-top:4px;opacity:0.9">{badge.description}</span>
          {/if}
        {:else}
          {#if badge.description}
            <span class="tip-desc">{badge.description}</span>
          {/if}
        {/if}

        {#if onClick}
          <span class="tip-hint" aria-label="Click for more">
            {#if clickHintIcon === 'download'}
              <svg class="tip-hint-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3 1.4 1.42L12 18.41l-4.7-4.7 1.4-1.42 2.3 2.3V4a1 1 0 0 1 1-1Zm-7 16h14v2H5v-2Z"
                  fill="currentColor"
                />
              </svg>
            {:else if clickHintIcon === 'info'}
              <svg class="tip-hint-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" fill="currentColor" opacity="0.28" />
                <path d="M12 7.6a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z" fill="currentColor" />
                <path d="M11 10h2v8h-2v-8Z" fill="currentColor" />
              </svg>
            {/if}
            <span>{clickHintText}</span>
            {#if clickKind === 'link' && external}
              <svg class="tip-hint-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M14 5h5v5h-2V8.4l-6.3 6.3-1.4-1.4L15.6 7H14V5ZM5 7h6v2H7v10h10v-4h2v6H5V7Z"
                  fill="currentColor"
                />
              </svg>
            {/if}
          </span>
        {/if}
      </span>
    </FlowbiteTooltip>
  {:else}
    <span
      on:mouseenter={handleMouseEnter}
      on:mouseleave={handleMouseLeave}
      on:focusin={handleFocusIn}
      on:focusout={handleFocusOut}
      on:click={handleClick}
    >
      {#if effectiveType === 'big'}
        {#if bigStyle === 'seal'}
        {#if clickKind === 'link' && href}
            <a
              class="seal {tone} {sealVariant}"
              style={`--seal-size:${sealSize}px; --seal-font:${ringFontPx}px; --rotation:${rotationMs}ms;`}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              aria-label={badge.label}
            >
              <span class="ring {rotationMs > 0 ? 'spin' : ''}" aria-hidden="true">
                {#each sealChars as char, index (index)}
                  <span class="char" style={`--angle:${(1 / sealChars.length) * index}turn;`}>{char}</span>
                {/each}
              </span>

              <span class="center" aria-hidden="true">
                <span class="center-pill">
                  {#if iconName}
                    <BadgeIcon name={iconName} size={centerIcon} bg="var(--seal-solid)" fg="#ffffff" bgOpacity={1} />
                  {/if}
                </span>
              </span>
            </a>
        {:else if clickKind === 'action' && onClick && 'action' in onClick}
          <span
            class="seal {tone} {sealVariant}"
            style={`--seal-size:${sealSize}px; --seal-font:${ringFontPx}px; --rotation:${rotationMs}ms;`}
            role="button"
            tabindex="0"
            on:click={onClick.action}
            on:keydown={(e) => handleActionKeydown(e, onClick.action)}
            aria-label={onClick.ariaLabel ?? badge.label}
          >
            <span class="ring {rotationMs > 0 ? 'spin' : ''}" aria-hidden="true">
              {#each sealChars as char, index (index)}
                <span class="char" style={`--angle:${(1 / sealChars.length) * index}turn;`}>{char}</span>
              {/each}
            </span>

            <span class="center" aria-hidden="true">
              <span class="center-pill">
                {#if iconName}
                  <BadgeIcon name={iconName} size={centerIcon} bg="var(--seal-solid)" fg="#ffffff" bgOpacity={1} />
                {/if}
              </span>
            </span>
          </span>
          {:else}
            <span
              class="seal {tone} {sealVariant}"
              style={`--seal-size:${sealSize}px; --seal-font:${ringFontPx}px; --rotation:${rotationMs}ms;`}
              role="note"
              tabindex="0"
              aria-label={badge.label}
            >
              <span class="ring {rotationMs > 0 ? 'spin' : ''}" aria-hidden="true">
                {#each sealChars as char, index (index)}
                  <span class="char" style={`--angle:${(1 / sealChars.length) * index}turn;`}>{char}</span>
                {/each}
              </span>

              <span class="center" aria-hidden="true">
                <span class="center-pill">
                  {#if iconName}
                    <BadgeIcon name={iconName} size={centerIcon} bg="var(--seal-solid)" fg="#ffffff" bgOpacity={1} />
                  {/if}
                </span>
              </span>
            </span>
          {/if}
        {:else}
        {#if clickKind === 'link' && href}
            <a
              class="prio {tone} {bigVariant} with-label"
              style={`--prio-size:${roundRenderSize}px; --prio-text-size:${roundTextSize}px;`}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              aria-label={badge.label}
            >
              <span class="prio-inner" aria-hidden="true">
                {#if iconName}
                  <BadgeIcon
                    name={iconName}
                    size={roundIconSize}
                    bg={bigVariant === 'solid' ? '#ffffff' : 'var(--prio-solid)'}
                    bgOpacity={1}
                    fg={bigVariant === 'solid' ? 'var(--prio-solid)' : '#ffffff'}
                  />
                {/if}
                <span class="prio-text">{rawLabel}</span>
              </span>
            </a>
        {:else if clickKind === 'action' && onClick && 'action' in onClick}
          <span
            class="prio {tone} {bigVariant} with-label"
            style={`--prio-size:${roundRenderSize}px; --prio-text-size:${roundTextSize}px;`}
            role="button"
            tabindex="0"
            on:click={onClick.action}
            on:keydown={(e) => handleActionKeydown(e, onClick.action)}
            aria-label={onClick.ariaLabel ?? badge.label}
          >
            <span class="prio-inner" aria-hidden="true">
              {#if iconName}
                <BadgeIcon
                  name={iconName}
                  size={roundIconSize}
                  bg={bigVariant === 'solid' ? '#ffffff' : 'var(--prio-solid)'}
                  bgOpacity={1}
                  fg={bigVariant === 'solid' ? 'var(--prio-solid)' : '#ffffff'}
                />
              {/if}
              <span class="prio-text">{rawLabel}</span>
            </span>
          </span>
          {:else}
            <span
              class="prio {tone} {bigVariant} with-label"
              style={`--prio-size:${roundRenderSize}px; --prio-text-size:${roundTextSize}px;`}
              role="note"
              tabindex="0"
              aria-label={badge.label}
            >
              <span class="prio-inner" aria-hidden="true">
                {#if iconName}
                  <BadgeIcon
                    name={iconName}
                    size={roundIconSize}
                    bg={bigVariant === 'solid' ? '#ffffff' : 'var(--prio-solid)'}
                    bgOpacity={1}
                    fg={bigVariant === 'solid' ? 'var(--prio-solid)' : '#ffffff'}
                  />
                {/if}
                <span class="prio-text">{rawLabel}</span>
              </span>
            </span>
          {/if}
        {/if}
      {:else}
        {#if onClick && href}
          <a
            class="badge {tone} {variant} {effectiveType === 'mini' ? 'mini' : ''} {isComparisonAverage ? 'avg-grey' : ''} interactive"
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            aria-label={badge.label}
          >
            {#if iconName}
              <span class="icon" aria-hidden="true">
                <BadgeIcon
                  name={iconName}
                  size={pillIconSize}
                  bg={variant === 'outlined' ? 'var(--badge-solid)' : '#ffffff'}
                  fg={variant === 'outlined' ? '#ffffff' : 'var(--badge-solid)'}
                  bgOpacity={1}
                />
              </span>
            {/if}
            <span class="label">{badge.label}</span>
          </a>
        {:else}
          <span
            class="badge {tone} {variant} {effectiveType === 'mini' ? 'mini' : ''} {isComparisonAverage ? 'avg-grey' : ''} interactive"
            role="note"
            aria-label={badge.label}
            tabindex="0"
          >
            {#if iconName}
              <span class="icon" aria-hidden="true">
                <BadgeIcon
                  name={iconName}
                  size={pillIconSize}
                  bg={variant === 'outlined' ? 'var(--badge-solid)' : '#ffffff'}
                  fg={variant === 'outlined' ? '#ffffff' : 'var(--badge-solid)'}
                  bgOpacity={1}
                />
              </span>
            {/if}
            <span class="label">{badge.label}</span>
          </span>
        {/if}
      {/if}
    </span>
  {/if}
{/if}

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--badge-gap);
    padding: var(--badge-pad-y) var(--badge-pad-x);
    border-radius: 16px;
    border: var(--badge-border-w) solid transparent;
    font-weight: 550;
    font-size: 12px;
    line-height: 1;
    user-select: none;
    outline: none;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease,
      transform 120ms ease;

    /* Tokens (overridden by tone classes) */
    --badge-border: rgba(17, 24, 39, 0.22);
    --badge-fg: rgb(17, 24, 39);
    --badge-bg: rgba(17, 24, 39, 0.08);
    --badge-bg-hover: rgba(17, 24, 39, 0.12);
    --badge-solid: rgb(17, 24, 39);
    --badge-gap: 3px;
    --badge-pad-y: 3px;
    --badge-pad-x: 6px;
    --badge-border-w: 1px;
  }

  /* Tone tokens (roughly aligned with MUI palette intent) */
  .badge.neutral {
    --badge-border: rgba(17, 24, 39, 0.22);
    --badge-fg: rgb(17, 24, 39);
    --badge-bg: rgba(17, 24, 39, 0.08);
    --badge-bg-hover: rgba(17, 24, 39, 0.12);
    --badge-solid: rgb(17, 24, 39);
  }

  .badge.success {
    --badge-border: rgba(46, 125, 50, 0.65); /* ~MUI success.main */
    --badge-fg: rgb(27, 94, 32); /* ~MUI success.dark */
    --badge-bg: rgba(46, 125, 50, 0.14);
    --badge-bg-hover: rgba(46, 125, 50, 0.22);
    --badge-solid: rgb(46, 125, 50);
  }

  .badge.info {
    --badge-border: rgba(2, 136, 209, 0.65); /* ~MUI info.main */
    --badge-fg: rgb(1, 87, 155); /* ~MUI info.dark-ish */
    --badge-bg: rgba(2, 136, 209, 0.14);
    --badge-bg-hover: rgba(2, 136, 209, 0.22);
    --badge-solid: rgb(2, 136, 209);
  }

  .badge.warning {
    --badge-border: rgba(237, 108, 2, 0.70); /* ~MUI warning.main */
    --badge-fg: rgb(191, 54, 12); /* ~MUI warning.dark-ish */
    --badge-bg: rgba(237, 108, 2, 0.14);
    --badge-bg-hover: rgba(237, 108, 2, 0.22);
    --badge-solid: rgb(237, 108, 2);
  }

  /* Average comparison badge: match the atlas "average" grey color */
  .badge.avg-grey {
    --badge-border: rgba(156, 156, 156, 0.95);
    --badge-fg: rgb(156, 156, 156);
    --badge-bg: rgba(156, 156, 156, 0.10);
    --badge-bg-hover: rgba(156, 156, 156, 0.16);
    --badge-solid: rgb(156, 156, 156);
  }

  /* Variants */
  .badge.filled {
    background: var(--badge-solid);
    border-color: transparent;
    color: #ffffff;
  }

  .badge.outlined {
    background: transparent;
    border-color: var(--badge-border);
    color: var(--badge-fg);
  }

  .badge.interactive {
    cursor: pointer;
  }

  a.badge {
    text-decoration: none;
  }

  .badge.interactive:hover,
  .badge.interactive:focus-visible {
    transform: translateY(-1px);
  }

  .badge.interactive:hover {
    background: var(--badge-bg-hover);
  }

  /* Filled hover = darker solid (MUI-like) */
  .badge.filled.interactive:hover {
    background: var(--badge-fg);
  }

  /* MUI-ish focus ring */
  .badge.interactive:focus-visible {
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.25);
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .label {
    white-space: nowrap;
  }

  .tip-desc {
    display: block;
  }

  .tip-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    white-space: nowrap;
    color: rgba(255, 255, 255, 0.92);
    font: inherit;
    line-height: inherit;
    opacity: 0.95;
    margin-top: 6px;
    font-size: 11px;
  }

  .tip-hint-icon {
    width: 12px;
    height: 12px;
    display: block;
    opacity: 0.95;
  }

  /* Mini mode: collapsed icon-only; expands on hover/focus using the same outlined badge styling. */
  .badge.mini {
    --badge-gap: 0px;
    --badge-pad-y: 0px;
    --badge-pad-x: 0px;
    --badge-border-w: 0px; /* remove invisible 1px border so adjacent minis can touch */
    border-color: transparent; /* hide outlined border in collapsed state */
    background: transparent; /* no pill in collapsed state */
    font-size: 11px;
  }

  .badge.mini .label {
    max-width: 0;
    opacity: 0;
    overflow: hidden;
    line-height: 1.2; /* prevent descenders (e.g. 'g') from being clipped */
    padding-bottom: 1px; /* tiny extra room for glyph descenders */
    transition: max-width 320ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease;
  }

  .badge.mini:hover,
  .badge.mini:focus-visible {
    --badge-gap: 2px;
    --badge-pad-y: 2px;
    --badge-pad-x: 5px;
    --badge-border-w: 1px; /* restore border when expanded */
  }

  .badge.mini.outlined:hover,
  .badge.mini.outlined:focus-visible {
    border-color: var(--badge-border);
  }

  .badge.mini:hover .label,
  .badge.mini:focus-visible .label {
    max-width: 220px;
    opacity: 1;
  }

  /* Mini interaction should feel subtle (no lift), while still being clearly interactive. */
  .badge.mini.interactive {
    transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease,
      padding 320ms cubic-bezier(0.2, 0, 0, 1);
  }

  .badge.mini.interactive:hover,
  .badge.mini.interactive:focus-visible {
    transform: none;
    box-shadow: none;
  }

  /* Keep a clean keyboard-only focus ring (no drop shadow). */
  .badge.mini.interactive:focus-visible {
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.25);
  }

  /* ----- Big: round priority badge ----- */
  .prio {
    width: var(--prio-size);
    height: var(--prio-size);
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
    user-select: none;
    transition: transform 160ms cubic-bezier(0.2, 0, 0, 1), box-shadow 160ms cubic-bezier(0.2, 0, 0, 1),
      filter 160ms cubic-bezier(0.2, 0, 0, 1);
    --prio-solid: rgb(17, 24, 39);
    --prio-fg: #ffffff;
    --prio-border: rgba(17, 24, 39, 0.22);
    --prio-text: #ffffff;
  }

  a.prio {
    text-decoration: none;
    color: inherit;
  }

  .prio-inner {
    width: 100%;
    height: 100%;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .prio.with-label .prio-inner {
    flex-direction: column;
    gap: 2px;
    padding: 3px 5px 5px 5px;
    box-sizing: border-box;
  }

  .prio-text {
    font-size: var(--prio-text-size, 10px);
    font-weight: 550;
    letter-spacing: 0.02em;
    line-height: 1.05;
    color: var(--prio-text);
    text-align: center;
    white-space: normal;
    overflow-wrap: anywhere;
    opacity: 0.95;
  }

  .prio.neutral {
    --prio-solid: rgb(17, 24, 39);
    --prio-border: rgba(17, 24, 39, 0.22);
  }

  .prio.success {
    --prio-solid: rgb(46, 125, 50);
    --prio-border: rgba(46, 125, 50, 0.65);
  }

  .prio.info {
    --prio-solid: rgb(2, 136, 209);
    --prio-border: rgba(2, 136, 209, 0.65);
  }

  .prio.warning {
    --prio-solid: rgb(237, 108, 2);
    --prio-border: rgba(237, 108, 2, 0.7);
  }

  .prio.solid {
    background: var(--prio-solid);
  }

  .prio.ring {
    background: #ffffff;
    box-shadow: inset 0 0 0 2px var(--prio-solid);
    --prio-text: var(--prio-solid);
  }

  .prio.double-ring {
    background: var(--prio-solid);
    box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.95), 0 0 0 2px var(--prio-solid);
  }

  .prio.stamp {
    background: var(--prio-solid);
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.85);
    filter: saturate(1.05);
  }
  .prio.stamp .prio-inner {
    background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 0);
    background-size: 6px 6px;
    background-position: 0 0;
  }

  .prio.glow {
    background: var(--prio-solid);
    box-shadow: 0 10px 22px rgba(17, 24, 39, 0.16), 0 0 0 3px rgba(255, 255, 255, 0.92);
  }

  .prio:focus-visible {
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.28), 0 10px 22px rgba(17, 24, 39, 0.16);
  }

  .prio:hover {
    transform: translateY(-1px);
  }

  /* ----- Big: seal badge ----- */
  .seal {
    position: relative;
    width: var(--seal-size);
    height: var(--seal-size);
    border-radius: 999px;
    display: inline-grid;
    place-items: center;
    outline: none;
    cursor: pointer;
    user-select: none;
    background: transparent;
    --seal-solid: rgb(17, 24, 39);
    --seal-ring: rgba(17, 24, 39, 0.55);
    --seal-line: rgba(17, 24, 39, 0.18);
    --seal-ring-fg: var(--seal-solid);
  }

  a.seal {
    text-decoration: none;
    color: inherit;
  }

  .seal.success {
    --seal-solid: rgb(46, 125, 50);
    --seal-ring: rgba(46, 125, 50, 0.62);
    --seal-line: rgba(46, 125, 50, 0.22);
  }
  .seal.info {
    --seal-solid: rgb(2, 136, 209);
    --seal-ring: rgba(2, 136, 209, 0.62);
    --seal-line: rgba(2, 136, 209, 0.22);
  }
  .seal.warning {
    --seal-solid: rgb(237, 108, 2);
    --seal-ring: rgba(237, 108, 2, 0.68);
    --seal-line: rgba(237, 108, 2, 0.24);
  }

  .seal.filled {
    background: var(--seal-solid);
    --seal-ring-fg: rgba(255, 255, 255, 0.92);
  }

  .ring {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    font-size: var(--seal-font);
    color: var(--seal-ring-fg);
    opacity: 0.92;
    text-transform: uppercase;
    letter-spacing: 0.10em;
    font-weight: 550;
  }

  @keyframes rotation {
    0% {
      transform: rotate(0turn);
    }
    100% {
      transform: rotate(1turn);
    }
  }

  .ring.spin {
    animation: rotation var(--rotation) linear infinite;
  }

  .char {
    width: 1em;
    height: 100%;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%) rotate(var(--angle));
    text-align: center;
  }

  .center {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }

  .center-pill {
    width: calc(var(--seal-size) * 0.64);
    height: calc(var(--seal-size) * 0.64);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid var(--seal-line);
    display: grid;
    place-items: center;
    opacity: 0.95;
  }

  .seal.filled .center-pill {
    border-color: rgba(255, 255, 255, 0.35);
    background: #ffffff;
    opacity: 1;
  }

  .seal:focus-visible .center-pill {
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.25);
  }
</style>


<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import posthog from 'posthog-js';
  import { tick } from 'svelte';
  import { onDestroy } from 'svelte';
  import Badge from './Badge.svelte';
  import { badgeFeedback, markBadgeFeedbackShown } from './feedback';

  let rating: number | null = null;
  let ratingLabel: string | null = null;
  let comment = '';
  let submitted = false;
  let didShowCapture = false;
  let hoverRating: number | null = null;
  let commentEl: HTMLTextAreaElement | null = null;
  let wasOpen = false;
  let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

  const ratingOptions: { value: number; label: string; short: string }[] = [
    { value: 1, label: 'Very unhelpful', short: 'Very unhelpful' },
    { value: 2, label: 'Unhelpful', short: 'Unhelpful' },
    { value: 3, label: 'Neutral', short: 'Neutral' },
    { value: 4, label: 'Helpful', short: 'Helpful' },
    { value: 5, label: 'Very helpful', short: 'Very helpful' }
  ];

  $: ratingLabel = rating == null ? null : ratingOptions.find((o) => o.value === rating)?.label ?? null;
  $: displayRating = hoverRating ?? rating ?? 0;
  $: ratingColor =
    displayRating === 1
      ? '#ef4444' // red
      : displayRating === 2
        ? '#f59e0b' // orange
        : displayRating === 3
          ? '#3b82f6' // blue
          : displayRating === 4
            ? '#86efac' // light green
            : displayRating === 5
              ? '#22c55e'
              : '#111827';

  function selectRating(v: number) {
    if (v < 1 || v > 5) return;
    rating = v;
    // When the comment box appears, move focus into it so typing works immediately.
    tick().then(() => commentEl?.focus());
  }

  function toIds(badges: { id: string }[]) {
    return badges.map((b) => b.id);
  }

  function toLabels(badges: { id: string; label: string | null }[]) {
    return badges.map((b) => b.label ?? b.id);
  }

  function safeCapture(event: string, properties: Record<string, unknown> = {}) {
    if (!browser) return;
    try {
      posthog.capture(event, properties);
    } catch {
      // never block UI
    }
  }

  function close(reason: 'dismiss' | 'submit') {
    badgeFeedback.update((s) => ({ ...s, open: false }));
    if (reason === 'dismiss') {
      safeCapture('badge_feedback_dismissed', {
        interacted_badge_ids: toIds($badgeFeedback.interactedBadges),
        interacted_badge_count: $badgeFeedback.interactedBadges.length,
        pathname: $page.url.pathname
      });
    }
  }

  function submit(state: { interactedBadges: any[]; threshold: number }) {
    if (rating == null) return;
    submitted = true;
    safeCapture('badge_feedback_submitted', {
      rating,
      rating_label: ratingLabel,
      comment: comment.trim() || null,
      interacted_badge_ids: toIds(state.interactedBadges),
      interacted_badge_labels: toLabels(state.interactedBadges),
      interacted_badges: state.interactedBadges,
      interacted_badge_count: state.interactedBadges.length,
      threshold: state.threshold,
      pathname: $page.url.pathname
    });
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(() => {
      badgeFeedback.update((s) => ({ ...s, open: false }));
    }, 1600);
  }

  onDestroy(() => {
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
  });

  // When the modal opens, fire a "shown" event once.
  $: {
    if ($badgeFeedback.open && !wasOpen) {
      // reset fields ONLY on the open transition (prevents wiping rating while user is typing)
      rating = null;
      hoverRating = null;
      comment = '';
      submitted = false;
      didShowCapture = false;
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }

    if ($badgeFeedback.open && !didShowCapture) {
      didShowCapture = true;
      // Mark as shown immediately so we don't keep re-opening / spamming if the user keeps hovering badges.
      markBadgeFeedbackShown();
      safeCapture('badge_feedback_shown', {
        interacted_badge_ids: toIds($badgeFeedback.interactedBadges),
        interacted_badge_labels: toLabels($badgeFeedback.interactedBadges),
        interacted_badges: $badgeFeedback.interactedBadges,
        interacted_badge_count: $badgeFeedback.interactedBadges.length,
        threshold: $badgeFeedback.threshold,
        pathname: $page.url.pathname
      });
    }

    if (!$badgeFeedback.open) {
      didShowCapture = false;
    }

    wasOpen = $badgeFeedback.open;
  }
</script>

{#if $badgeFeedback.open}
  <div class="modal" role="dialog" aria-modal="false" aria-label="Badge feedback questionnaire">
      <div class="header">
        <div class="header-top">
          <div class="title">We noticed, that you interacted with some badges: </div>
          <button class="close" type="button" aria-label="Close" on:click={() => close('dismiss')}>×</button>
        </div>

        <div class="header-badges" aria-label="Badges you interacted with">
          {#each $badgeFeedback.interactedBadges.slice(-3) as b (b.id)}
            <span class="badge-preview {b.render}">
              <Badge
                badge={{ id: b.id, label: b.label ?? b.id, intent: b.intent ?? undefined, icon: b.icon ?? undefined }}
                type={b.render}
                bigStyle={b.bigStyle ?? undefined}
                variant={b.variant}
                bigVariant={b.bigVariant ?? undefined}
                bigSize={b.bigSize ?? undefined}
                sealVariant={b.sealVariant ?? undefined}
                sealSize={b.sealSize ?? undefined}
                sealFontScale={b.sealFontScale ?? undefined}
                rotationMs={b.rotationMs ?? undefined}
                analytics={false}
              />
            </span>
          {/each}
        </div>
      </div>

      <div class="body">
        {#if submitted}
          <div class="thanks" role="status" aria-live="polite">
            <div class="thanks-title">Thank you!</div>
            <div class="thanks-sub">Your feedback was sent.</div>
          </div>
        {:else}
          <p class="prompt">How helpful are they?</p>

          <div class="rating-block">
            <div class="stars-wrap {rating == null ? 'needs-rating' : ''}" style={`--rate-color:${ratingColor};`}>
              <div class="stars" role="radiogroup" aria-label="How helpful are the badges?">
                {#each [1, 2, 3, 4, 5] as v (v)}
                  <button
                    class="star-btn {displayRating >= v ? 'on' : 'off'} {rating === v ? 'selected' : ''}"
                    type="button"
                    aria-label={`Rate ${v} out of 5`}
                    on:mousedown|preventDefault
                    on:pointerdown|preventDefault
                    on:mouseenter={() => (hoverRating = v)}
                    on:mouseleave={() => (hoverRating = null)}
                    on:click={() => selectRating(v)}
                  >
                    <svg class="star" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                {/each}
              </div>
              {#if rating == null}
                <div class="hint" aria-hidden="true">Click a star to rate</div>
              {/if}
            </div>
          </div>

          {#if rating != null}
            <textarea
              class="comment"
              rows="3"
              bind:value={comment}
              bind:this={commentEl}
              placeholder="Why did you like/not like them? What's missing?"
              maxlength="500"
              on:keydown|stopPropagation
            />
          {/if}
        {/if}
      </div>

      <div class="footer">
        {#if submitted}
          <button class="secondary" type="button" on:click={() => close('submit')}>Close</button>
        {:else}
          <button class="secondary" type="button" on:click={() => close('dismiss')}>Not now</button>
          <button
            class="primary"
            type="button"
            disabled={rating == null || submitted}
            on:click={() => submit($badgeFeedback)}
          >
            Send feedback
          </button>
        {/if}
      </div>
  </div>
{/if}

<style>
  .modal {
    position: fixed;
    right: 16px;
    bottom: 16px;
    width: min(480px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    border: 1px solid rgba(17, 24, 39, 0.12);
    z-index: 1200;
    display: grid;
    grid-template-rows: auto 1fr auto;
  }

  .header {
    display: grid;
    gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(17, 24, 39, 0.08);
    background: #f9fafb;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .title {
    font-weight: 650;
    color: #111827;
  }

  .header-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .close {
    background: transparent;
    border: none;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    color: #374151;
  }

  .body {
    padding: 14px;
    color: #111827;
    overflow: auto;
  }

  .prompt {
    margin: 0 0 10px 0;
    color: #111827;
  }

  .thanks {
    padding: 12px 10px;
    border-radius: 12px;
    background: rgba(34, 197, 94, 0.10);
    border: 1px solid rgba(34, 197, 94, 0.20);
    text-align: center;
  }

  .thanks-title {
    font-weight: 750;
    color: #111827;
  }

  .thanks-sub {
    margin-top: 4px;
    font-size: 13px;
    color: #374151;
  }

  .badge-preview {
    display: inline-flex;
    align-items: center;
  }

  /* Big badges are visually large by design; scale down a bit inside the small card. */
  .badge-preview.big {
    transform: scale(0.78);
    transform-origin: left center;
  }

  .rating-block {
    margin: 6px 0 14px 0;
  }

  .stars-wrap {
    display: grid;
    gap: 10px;
    margin-top: 2px;
  }

  .stars-wrap.needs-rating {
    padding: 10px 8px;
    border-radius: 12px;
    background: rgba(17, 24, 39, 0.03);
    border: 1px dashed rgba(17, 24, 39, 0.16);
  }

  .hint {
    text-align: center;
    font-size: 12px;
    color: #6b7280;
    margin-top: 6px;
  }

  .stars {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
  }

  .star-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid rgba(17, 24, 39, 0.10);
    background: #ffffff;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
    color: rgba(17, 24, 39, 0.22);
  }

  .star-btn.on {
    color: var(--rate-color, #111827);
    border-color: color-mix(in srgb, var(--rate-color, #111827) 35%, white);
    box-shadow: 0 10px 18px color-mix(in srgb, var(--rate-color, #111827) 16%, transparent);
  }

  .star-btn:hover {
    transform: translateY(-1px);
  }

  .star-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.18), 0 10px 18px rgba(0, 0, 0, 0.10);
  }

  .star {
    width: 20px;
    height: 20px;
    display: block;
  }

  .comment {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    display: block;
    resize: vertical;
    border-radius: 10px;
    border: 1px solid rgba(17, 24, 39, 0.18);
    padding: 10px;
    font: inherit;
    outline: none;
  }

  .comment:focus {
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.18);
    border-color: rgba(25, 118, 210, 0.45);
  }

  .field {
    display: grid;
    gap: 6px;
  }

  .field .label {
    font-size: 12px;
    color: #374151;
  }

  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 12px 14px;
    border-top: 1px solid rgba(17, 24, 39, 0.08);
    background: #ffffff;
  }

  button.primary,
  button.secondary {
    border-radius: 10px;
    padding: 8px 12px;
    font-weight: 650;
    border: 1px solid transparent;
    cursor: pointer;
  }

  button.secondary {
    background: #f3f4f6;
    color: #111827;
    border-color: rgba(17, 24, 39, 0.12);
  }

  button.primary {
    background: #111827;
    color: #ffffff;
  }

  button.primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>


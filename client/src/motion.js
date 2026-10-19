// Motion helpers. One rule everywhere: if the phone asks for reduced motion
// (an accessibility setting), skip the animation and show the end state.
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Change screens with a smooth morph (View Transitions API).
 * Elements that share a `view-transition-name` on both screens (the notice
 * photo) visibly move/resize from one to the other. Browsers without the
 * API just switch instantly.
 */
export function transition(update) {
  if (!document.startViewTransition || reducedMotion()) return update();
  // flushSync makes React apply the state change inside the transition,
  // so the browser can snapshot "before" and "after".
  document.startViewTransition(() => flushSync(update));
}

/** Count a number up from 0 to `target` (ease-out), e.g. +0% -> +20%. */
export function useCountUp(target, ms = 950) {
  const [value, setValue] = useState(() => (target == null || reducedMotion() ? target : 0));
  useEffect(() => {
    if (target == null || reducedMotion()) {
      setValue(target);
      return;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      // Whole numbers while counting if the answer is whole (keeps the width steady).
      const step = Number.isInteger(target) ? 1 : 10;
      setValue(p < 1 ? Math.round(target * eased * step) / step : target);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

/** A short buzz on phones that support it (Android). iPhones ignore it. */
export function buzz(pattern = [70, 50, 70]) {
  if (reducedMotion()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

/** True only the first time it's called in this browser tab (for the neon sign-on). */
export function firstVisitThisSession(key = 'bcdc-intro') {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

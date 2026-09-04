import { useEffect, useRef, type ReactNode } from 'react';

// A horizontally auto-scrolling rail. Render the SAME set of children twice
// (the loop resets seamlessly at the half-way point). Pauses while the pointer
// is over it or the user is touching/scrolling, and honours reduced-motion.
export default function AutoRail({
  children,
  speed = 0.4,
  className = '',
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let paused = false;
    let resumeTimer = 0;

    const tick = () => {
      if (!paused) {
        el.scrollLeft += speed;
        // Seamless loop: children are duplicated, so wrap at the half width.
        if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft -= el.scrollWidth / 2;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const pause = () => { window.clearTimeout(resumeTimer); paused = true; };
    const resume = () => { paused = false; };
    // After touching/tapping, wait a moment before resuming so the tap lands
    // as a click (navigation) rather than being carried off by the scroll.
    const resumeSoon = () => {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => { paused = false; }, 2500);
    };

    // Pointer events cover mouse + touch. Pausing on pointerdown freezes the
    // rail during a tap so the click reaches the card's link.
    el.addEventListener('pointerenter', pause);
    el.addEventListener('pointerleave', resume);
    el.addEventListener('pointerdown', pause);
    el.addEventListener('pointerup', resumeSoon);
    el.addEventListener('pointercancel', resumeSoon);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resumeTimer);
      el.removeEventListener('pointerenter', pause);
      el.removeEventListener('pointerleave', resume);
      el.removeEventListener('pointerdown', pause);
      el.removeEventListener('pointerup', resumeSoon);
      el.removeEventListener('pointercancel', resumeSoon);
    };
  }, [speed]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

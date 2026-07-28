'use client';

import { useEffect, useRef } from 'react';

/**
 * The mark, struck as a solid.
 *
 * Not an SVG laid over the photograph — an object standing in it. Each of the
 * three bars is a real prism (six faces, shaded as if lit from the upper left),
 * so it holds up as it turns instead of collapsing into a flat graphic.
 *
 * It turns toward the pointer and drifts on a slow sine when left alone. Both
 * are decoration: under `prefers-reduced-motion` it renders as a still object
 * at its rest angle and no listeners are attached.
 */

/** Bar geometry in mark units, matching the 24×24 flat mark exactly. */
const BARS: readonly { ox: number; oy: number; w: number; h: number }[] = [
  { ox: 0, oy: -5, w: 18, h: 2 },
  { ox: 2.5, oy: 0, w: 13, h: 2 },
  { ox: 0, oy: 5, w: 18, h: 2 },
];

const REST_X = -14;
const REST_Y = -26;

export function MarkSpecimen({ caption = 'The mark, struck' }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame: number | null = null;
    let origin: number | null = null;

    const idle = (ts: number) => {
      if (origin === null) origin = ts;
      const t = (ts - origin) / 1000;
      node.style.transform =
        `rotateX(${(REST_X + Math.sin(t * 0.55) * 3.5).toFixed(2)}deg) ` +
        `rotateY(${(REST_Y + Math.sin(t * 0.38) * 9).toFixed(2)}deg)`;
      frame = window.requestAnimationFrame(idle);
    };

    frame = window.requestAnimationFrame(idle);

    const track = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const dx = (event.clientX - (box.left + box.width / 2)) / window.innerWidth;
      const dy = (event.clientY - (box.top + box.height / 2)) / window.innerHeight;

      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
      node.classList.add('k-mark3d--live');
      node.style.transform =
        `rotateX(${(REST_X - dy * 26).toFixed(2)}deg) ` +
        `rotateY(${(REST_Y + dx * 46).toFixed(2)}deg)`;
    };

    const release = () => {
      node.classList.remove('k-mark3d--live');
      if (frame === null) {
        origin = null;
        frame = window.requestAnimationFrame(idle);
      }
    };

    window.addEventListener('pointermove', track, { passive: true });
    window.addEventListener('pointerleave', release);
    window.addEventListener('blur', release);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', track);
      window.removeEventListener('pointerleave', release);
      window.removeEventListener('blur', release);
    };
  }, []);

  return (
    <div className="k-specimen" aria-hidden="true">
      <div className="k-mark3d" ref={ref}>
        {BARS.map((bar, index) => (
          <div
            key={index}
            className="k-bar"
            style={
              {
                '--ox': bar.ox,
                '--oy': bar.oy,
                '--w': bar.w,
                '--h': bar.h,
              } as React.CSSProperties
            }
          >
            <i className="fr" />
            <i className="bk" />
            <i className="rt" />
            <i className="lf" />
            <i className="tp" />
            <i className="bt" />
          </div>
        ))}
      </div>
      <p className="k-specimen__cap">{caption}</p>
    </div>
  );
}

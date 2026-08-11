'use client';

import { useEffect, useRef } from 'react';

import Image from 'next/image';

import { CLOUD_SIGNUP_URL } from '../../nav/nav-config';
import { MarkSpecimen } from './mark-specimen';
import { prefersReducedMotion } from './motion';

/**
 * Plate I — the site.
 *
 * The photograph was commissioned to a composition constraint: the ridgeline
 * sits in the lower third and the upper two-thirds is empty sky. That is what
 * lets the headline sit on the image with no scrim behind it. Its one warm
 * accent is the same oxide used for plate numbers, so the picture and the ink
 * belong to each other.
 *
 * On scroll the photograph, the type and the specimen leave at three different
 * rates, so the plate has thickness rather than sliding away as one flat card.
 */
export function PlateSite({ surveyedOn }: { surveyedOn: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const mid = midRef.current;
    if (!frame || !mid) return;
    if (prefersReducedMotion()) return;

    let queued = false;

    const draw = () => {
      queued = false;
      const y = window.scrollY;
      // Past the fold there is nothing to move; stop paying for it.
      if (y > window.innerHeight * 1.2) return;
      frame.style.transform = `translate3d(0,${(y * 0.18).toFixed(2)}px,0)`;
      mid.style.transform = `translate3d(0,${(y * -0.06).toFixed(2)}px,0)`;
      mid.style.opacity = String(
        Math.max(0, 1 - y / (window.innerHeight * 0.72)),
      );
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(draw);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    draw();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="k-plate k-site">
      <div className="k-site__frame" ref={frameRef}>
        <Image
          src="/plates/site.webp"
          alt="An immense mountain range breaking through a flat sea of cloud at first light"
          fill
          priority
          sizes="100vw"
          quality={82}
        />
      </div>
      <div className="k-site__screen" />
      <div className="k-site__wash" />

      <div className="k-site__mid" ref={midRef}>
        <div className="k-site__rail">
          <span>
            <b>Plate I</b>
          </span>
          <span>The site</span>
          <span>&nbsp;</span>
          <span>Station 01</span>
          <span>
            Surveyed <b>{surveyedOn}</b>
          </span>
        </div>

        <div className="k-site__lead">
          <h1 className="k-site__title">
            Your agents don&rsquo;t need better memories.
            <br />
            They need <em>your team&rsquo;s context</em>.
          </h1>
          <p className="k-site__sub">
            Context management for AI agents &mdash; every decision, constraint
            and lesson, kept current and handed to whoever works next
          </p>
          <div className="k-acts k-site__acts">
            <a className="k-act" href={CLOUD_SIGNUP_URL}>
              Start free
            </a>
            <a className="k-act k-act--line" href="#ledger">
              Read the ledger ↓
            </a>
          </div>
        </div>

        <MarkSpecimen />
      </div>

      <div className="k-site__foot">
        <p className="k-marg">
          <b>Plate I</b> — the site
        </p>
        <p className="k-marg">
          one shared workplace · claude code · cursor · codex
        </p>
        <p className="k-marg">surveyed {surveyedOn}</p>
      </div>
    </section>
  );
}

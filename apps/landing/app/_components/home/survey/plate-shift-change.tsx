import Image from 'next/image';

/**
 * Plate V — the site at shift change. A breath between the mechanism and the
 * specification, carrying the one sentence the whole page exists to land.
 */
export function PlateShiftChange() {
  return (
    <section className="k-hall">
      <Image
        src="/plates/hall.webp"
        alt="An immense empty industrial hall at dawn, between shifts"
        fill
        sizes="100vw"
        quality={80}
      />
      <div className="k-hall__wash" />
      <div className="k-hall__q">
        <p className="k-hall__line">
          The next agent starts where the last one finished.
        </p>
        <p className="k-hall__attr">Plate V — the site at shift change</p>
      </div>
    </section>
  );
}

import Image from 'next/image';

import { MOVEMENTS } from './survey-data';

/**
 * Plate IV — the apparatus. The handover loop, drawn as a mechanism.
 *
 * The margin note names the two movements that separate this from a database:
 * distilling raw activity into durable conclusions, and retiring a fact when a
 * newer one contradicts it. Anyone can keep text. Almost nobody retires it.
 */
export function PlateApparatus() {
  return (
    <section className="k-plate">
      <p className="k-pnum">
        <b>Plate IV</b> &nbsp;— the apparatus &nbsp;·&nbsp; the handover loop
      </p>

      <div className="k-app" style={{ marginTop: '38px' }}>
        <figure className="k-fig k-fig--engraved" style={{ aspectRatio: '1' }}>
          <Image
            src="/plates/apparatus.webp"
            alt="An engraved plate of the handover apparatus, shown in section"
            width={1500}
            height={1500}
            sizes="(max-width: 900px) 100vw, 40vw"
          />
          <figcaption>Fig. 1 — six movements of the handover</figcaption>
        </figure>

        <ol className="k-steps">
          {MOVEMENTS.map((movement) => (
            <li key={movement.title}>
              <div>
                <h4>{movement.title}</h4>
                <p>{movement.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="k-marg" style={{ marginTop: '40px', maxWidth: '56ch' }}>
        Movements <b>iv</b> and <b>v</b> are the ones a plain store cannot
        perform. Anyone can keep text. Almost nobody retires it when it stops
        being true.
      </p>
    </section>
  );
}

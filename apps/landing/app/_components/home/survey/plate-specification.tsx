import Image from 'next/image';

import { SPECIFICATION } from './survey-data';

/**
 * Plate VI — the specification.
 *
 * The answer to the objection that actually gets raised: shared memory is only
 * useful if its scope is strict. This plate is as much about what Klio refuses
 * to keep as what it keeps — the refusals are printed in the oxide.
 *
 * The figure is a sorting apparatus in section: material enters, meets a graded
 * screen, and leaves by one of two chutes. That is the redaction path, drawn.
 */
export function PlateSpecification() {
  return (
    <section className="k-plate">
      <p className="k-pnum">
        <b>Plate VI</b> &nbsp;— the specification &nbsp;·&nbsp; scope &amp;
        refusals
      </p>
      <p className="k-lede" style={{ margin: '26px 0 34px' }}>
        Strong scope is the feature. Random global memory everywhere is the
        failure.
      </p>

      <div className="k-spec">
        <div>
          {SPECIFICATION.map((pair, index) => (
            <div
              className="k-two"
              key={pair[0].heading}
              style={index > 0 ? { marginTop: '26px' } : undefined}
            >
              {pair.map((column) => (
                <div key={column.heading}>
                  <h4 className={column.refusal ? 'is-refusal' : undefined}>
                    {column.heading}
                  </h4>
                  <ul>
                    {column.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}

          <p className="k-marg" style={{ marginTop: '30px', maxWidth: '56ch' }}>
            Redaction runs <b>before</b> anything is written, and fails closed.
            If it cannot be made safe, it is not stored.
          </p>
        </div>

        <figure className="k-fig k-fig--mounted">
          <Image
            src="/plates/sorting.webp"
            alt="An engraved plate of the sorting apparatus, shown in section"
            width={1400}
            height={1875}
            sizes="(max-width: 900px) 100vw, 30vw"
          />
          <figcaption>Fig. 2 — the sorting apparatus, in section</figcaption>
        </figure>
      </div>
    </section>
  );
}

import { describe, expect, it } from 'vitest';

import { PLANS } from '~/lib/pricing';
import {
  articleSchema,
  breadcrumbSchema,
  compareSchema,
  faqPageSchema,
  organizationSchema,
  productOfferSchema,
  softwareApplicationSchema,
} from '~/lib/seo/schemas';
import { FAQ, ORG, POSITIONING_SENTENCE, SAME_AS } from '~/lib/site-meta';

describe('lib/seo/schemas', () => {
  describe('softwareApplicationSchema', () => {
    const s = softwareApplicationSchema();
    it('has SoftwareApplication type and the canonical identity', () => {
      expect(s['@context']).toBe('https://schema.org');
      expect(s['@type']).toBe('SoftwareApplication');
      expect(s.name).toBe(ORG.name);
      expect(s.url).toBe(ORG.url);
    });
    it('uses DeveloperApplication category', () => {
      expect(s.applicationCategory).toBe('DeveloperApplication');
    });
    it('carries the canonical positioning as its description', () => {
      expect(s.description).toBe(POSITIONING_SENTENCE);
    });
  });

  describe('organizationSchema', () => {
    const s = organizationSchema();
    it('has Organization type and sameAs from site-meta', () => {
      expect(s['@type']).toBe('Organization');
      expect(s.name).toBe(ORG.name);
      expect(s.sameAs).toEqual(SAME_AS);
    });
  });

  describe('faqPageSchema', () => {
    const s = faqPageSchema();
    it('emits FAQPage with one Question per FAQ entry', () => {
      expect(s['@type']).toBe('FAQPage');
      expect(s.mainEntity).toHaveLength(FAQ.length);
      for (const q of s.mainEntity) {
        expect(q['@type']).toBe('Question');
        expect(q.acceptedAnswer['@type']).toBe('Answer');
        expect(typeof q.acceptedAnswer.text).toBe('string');
      }
    });
  });

  describe('productOfferSchema', () => {
    const s = productOfferSchema();
    it('emits one Product with one Offer per plan', () => {
      expect(s['@type']).toBe('Product');
      expect(s.offers).toHaveLength(PLANS.length);
      for (const offer of s.offers) {
        expect(offer['@type']).toBe('Offer');
        expect(offer.priceCurrency).toBe('USD');
        expect(typeof offer.price).toBe('string');
        expect(offer.url).toMatch(/^https?:\/\//);
      }
    });
    it('emits priceSpecification only for plans that need one', () => {
      const offers = s.offers;
      const team = offers.find((o) => o.name === 'Team')!;
      const free = offers.find((o) => o.name === 'Free')!;
      expect(team.priceSpecification).toBeDefined();
      expect(free.priceSpecification).toBeUndefined();
    });

    it('carries BOTH the per-seat unit and the annual rate on a seat plan', () => {
      // Regression: per-seat and annual were emitted as two `priceSpecification`
      // keys in one object literal, so the per-seat one was silently dropped and
      // the offer published a bare "20" that reads as $20 for a whole team.
      const team = s.offers.find((o) => o.name === 'Team')!;
      const specs = team.priceSpecification as unknown as Array<
        Record<string, unknown>
      >;
      expect(Array.isArray(specs)).toBe(true);
      expect(specs.some((sp) => sp.unitText === 'user')).toBe(true);
      expect(specs.some((sp) => sp.unitCode === 'ANN')).toBe(true);
    });
    it('describes the offer with real, non-empty text', () => {
      expect(s.description.length).toBeGreaterThan(20);
    });
  });

  describe('breadcrumbSchema', () => {
    const s = breadcrumbSchema([
      { name: 'Home', url: 'https://tryvex.dev' },
      { name: 'Pricing', url: 'https://tryvex.dev/pricing' },
    ]);
    it('emits BreadcrumbList with positions starting at 1', () => {
      expect(s['@type']).toBe('BreadcrumbList');
      expect(s.itemListElement).toHaveLength(2);
      expect(s.itemListElement[0]?.position).toBe(1);
      expect(s.itemListElement[1]?.position).toBe(2);
      expect(s.itemListElement[0]?.name).toBe('Home');
      expect(s.itemListElement[0]?.item).toBe('https://tryvex.dev');
      expect(s.itemListElement[0]?.['@type']).toBe('ListItem');
      expect(s.itemListElement[1]?.['@type']).toBe('ListItem');
    });
    it('handles empty array gracefully', () => {
      const empty = breadcrumbSchema([]);
      expect(empty.itemListElement).toEqual([]);
    });
  });

  describe('compareSchema', () => {
    const nodes = compareSchema({
      vendorSlug: 'braintrust',
      vendorName: 'Braintrust',
      vendorUrl: 'https://www.braintrust.dev',
    });
    it('returns three nodes: Klio, competitor, breadcrumb', () => {
      expect(nodes).toHaveLength(3);
      const types = nodes.map((n) => n['@type']);
      expect(types).toEqual([
        'SoftwareApplication',
        'SoftwareApplication',
        'BreadcrumbList',
      ]);
    });
    it('breadcrumb ends at the vendor page', () => {
      const breadcrumb = nodes[2];
      const last = breadcrumb.itemListElement.at(-1);
      expect(last?.name).toBe('Braintrust');
      expect(last?.item).toBe(`${ORG.url}/compare/braintrust`);
    });
  });

  describe('articleSchema', () => {
    const s = articleSchema({
      headline: 'Test Article',
      description: 'A test description',
      datePublished: '2026-01-01',
      dateModified: '2026-04-25',
      url: `${ORG.url}/test`,
    });
    it('emits Article with the canonical publisher', () => {
      expect(s['@type']).toBe('Article');
      expect(s.headline).toBe('Test Article');
      expect(s.publisher.name).toBe(ORG.name);
    });
    it('preserves both date fields', () => {
      expect(s.datePublished).toBe('2026-01-01');
      expect(s.dateModified).toBe('2026-04-25');
    });
  });
});

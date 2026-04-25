import { describe, expect, it } from 'vitest';
import {
  softwareApplicationSchema,
  organizationSchema,
  faqPageSchema,
  productOfferSchema,
  breadcrumbSchema,
  compareSchema,
  articleSchema,
} from '~/lib/seo/schemas';
import { PLANS } from '~/lib/pricing';
import { FAQ, SAME_AS, ORG } from '~/lib/site-meta';

describe('lib/seo/schemas', () => {
  describe('softwareApplicationSchema', () => {
    const s = softwareApplicationSchema();
    it('has SoftwareApplication type and Vex identity', () => {
      expect(s['@context']).toBe('https://schema.org');
      expect(s['@type']).toBe('SoftwareApplication');
      expect(s.name).toBe('Vex');
      expect(s.url).toBe(ORG.url);
    });
    it('uses DeveloperApplication category', () => {
      expect(s.applicationCategory).toBe('DeveloperApplication');
    });
    it('description contains no OSS claims', () => {
      expect(s.description).not.toMatch(/open[\s-]?source/i);
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
    it('emits priceSpecification only for plans with priceYearly', () => {
      const offers = s.offers;
      const pro = offers.find((o) => o.name === 'Pro')!;
      const free = offers.find((o) => o.name === 'Free')!;
      expect(pro.priceSpecification).toBeDefined();
      expect(free.priceSpecification).toBeUndefined();
    });
    it('description contains no OSS claims', () => {
      expect(s.description).not.toMatch(/open[\s-]?source/i);
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
    it('returns three nodes: Vex, competitor, breadcrumb', () => {
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
      expect(last?.item).toBe('https://tryvex.dev/compare/braintrust');
    });
  });

  describe('articleSchema', () => {
    const s = articleSchema({
      headline: 'Test Article',
      description: 'A test description',
      datePublished: '2026-01-01',
      dateModified: '2026-04-25',
      url: 'https://tryvex.dev/test',
    });
    it('emits Article with publisher = Vex', () => {
      expect(s['@type']).toBe('Article');
      expect(s.headline).toBe('Test Article');
      expect(s.publisher.name).toBe('Vex');
    });
    it('preserves both date fields', () => {
      expect(s.datePublished).toBe('2026-01-01');
      expect(s.dateModified).toBe('2026-04-25');
    });
  });
});

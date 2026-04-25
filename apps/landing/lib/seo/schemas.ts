/**
 * Typed Schema.org JSON-LD generators for the landing site.
 *
 * Every blob is produced by a function (no top-level JSON literals) so
 * consumers can compose them with `JSON.stringify(productOfferSchema())`
 * inside server components.
 *
 * Sources of truth:
 * - `~/lib/pricing` — `PLANS`, `CURRENCY`, `LAST_UPDATED`
 * - `~/lib/site-meta` — `ORG`, `SAME_AS`, `FAQ`, `POSITIONING_SENTENCE`
 *
 * Do not hardcode plan data, FAQ entries, or `sameAs` URLs here.
 * Do not introduce OSS strings ("open source", "Apache 2.0", etc.) —
 * descriptions flow from `POSITIONING_SENTENCE`.
 */
import { CURRENCY, LAST_UPDATED, PLANS } from '~/lib/pricing';
import { FAQ, ORG, POSITIONING_SENTENCE, SAME_AS } from '~/lib/site-meta';

const CONTEXT = 'https://schema.org' as const;
const SITE_URL = ORG.url;
const DOCS_URL = 'https://docs.tryvex.dev' as const;
const PYPI_URL = 'https://pypi.org/project/vex-sdk/' as const;

export function softwareApplicationSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'SoftwareApplication',
    name: ORG.name,
    description: POSITIONING_SENTENCE,
    url: ORG.url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: CURRENCY,
      description: 'Free tier available',
    },
    softwareHelp: {
      '@type': 'WebPage',
      url: DOCS_URL,
    },
    downloadUrl: PYPI_URL,
  } as const;
}

export function organizationSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    name: ORG.name,
    url: ORG.url,
    logo: ORG.logo,
    sameAs: SAME_AS,
  } as const;
}

export function faqPageSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage' as const,
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question' as const,
      name: f.question,
      acceptedAnswer: { '@type': 'Answer' as const, text: f.answer },
    })),
  };
}

export function productOfferSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'Product' as const,
    name: ORG.name,
    description: POSITIONING_SENTENCE,
    brand: { '@type': 'Brand' as const, name: ORG.name },
    dateModified: LAST_UPDATED,
    offers: PLANS.map((plan) => ({
      '@type': 'Offer' as const,
      name: plan.name,
      description: plan.description,
      price: String(plan.priceMonthly),
      priceCurrency: CURRENCY,
      category: 'SaaS subscription',
      eligibleCustomerType: plan.audience,
      url: plan.cta.href,
      ...(plan.priceYearly !== undefined && {
        priceSpecification: {
          '@type': 'UnitPriceSpecification' as const,
          price: String(plan.priceYearly),
          priceCurrency: CURRENCY,
          unitCode: 'ANN',
          referenceQuantity: {
            '@type': 'QuantitativeValue' as const,
            value: 1,
            unitCode: 'ANN',
          },
        },
      }),
    })),
  };
}

export interface BreadcrumbItem {
  readonly name: string;
  readonly url: string;
}

export function breadcrumbSchema(items: ReadonlyArray<BreadcrumbItem>) {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList' as const,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem' as const,
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface CompareInput {
  readonly vendorSlug: string;
  readonly vendorName: string;
  readonly vendorUrl: string;
}

export function compareSchema(input: CompareInput) {
  return [
    softwareApplicationSchema(),
    {
      '@context': CONTEXT,
      '@type': 'SoftwareApplication',
      name: input.vendorName,
      url: input.vendorUrl,
      applicationCategory: 'DeveloperApplication',
    } as const,
    breadcrumbSchema([
      { name: 'Home', url: SITE_URL },
      { name: 'Compare', url: `${SITE_URL}/compare` },
      {
        name: input.vendorName,
        url: `${SITE_URL}/compare/${input.vendorSlug}`,
      },
    ]),
  ] as const;
}

export interface ArticleInput {
  readonly headline: string;
  readonly description: string;
  readonly datePublished: string;
  readonly dateModified: string;
  readonly url: string;
}

export function articleSchema(input: ArticleInput) {
  return {
    '@context': CONTEXT,
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    url: input.url,
    publisher: {
      '@type': 'Organization' as const,
      name: ORG.name,
      url: ORG.url,
    },
  } as const;
}

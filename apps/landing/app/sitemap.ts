import type { MetadataRoute } from 'next';

import { ORG } from '~/lib/site-meta';

import { getAllPosts } from '~/lib/blog';
import {
  getAllChecklists,
  getAllConceptComparisons,
  getAllFrameworkIndustryGuides,
  getAllFrameworkUseCaseGuides,
  getAllGuides,
  getAllProblemFrameworkGuides,
  getAllProblemGuides,
} from '~/lib/pseo/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const blogPosts = getAllPosts().map((post) => ({
    url: `${ORG.url}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const guides = getAllGuides().map((g) => ({
    url: `${ORG.url}/guides/${g.meta.framework}`,
    lastModified: new Date(g.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const checklists = getAllChecklists().map((c) => ({
    url: `${ORG.url}/checklists/${c.meta.industry}-${c.meta.useCase}`,
    lastModified: new Date(c.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const conceptComparisons = getAllConceptComparisons().map((c) => ({
    url: `${ORG.url}/compare/concepts/${c.meta.slug}`,
    lastModified: new Date(c.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const problemGuides = getAllProblemGuides().map((g) => ({
    url: `${ORG.url}/learn/${g.meta.slug}`,
    lastModified: new Date(g.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const frameworkUseCaseGuides = getAllFrameworkUseCaseGuides().map((g) => ({
    url: `${ORG.url}/guides/${g.meta.framework}/${g.meta.useCase}`,
    lastModified: new Date(g.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const frameworkIndustryGuides = getAllFrameworkIndustryGuides().map((g) => ({
    url: `${ORG.url}/guides/${g.meta.framework}/${g.meta.industry}`,
    lastModified: new Date(g.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const problemFrameworkGuides = getAllProblemFrameworkGuides().map((g) => ({
    url: `${ORG.url}/learn/${g.meta.problem}/${g.meta.framework}`,
    lastModified: new Date(g.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    {
      url: ORG.url,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${ORG.url}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...blogPosts,
    {
      url: `${ORG.url}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${ORG.url}/compare/langsmith`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${ORG.url}/compare/langfuse`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${ORG.url}/compare/guardrails-ai`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...guides,
    ...checklists,
    ...conceptComparisons,
    ...problemGuides,
    ...frameworkUseCaseGuides,
    ...frameworkIndustryGuides,
    ...problemFrameworkGuides,
    {
      url: `${ORG.url}/tools/agent-health-score`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${ORG.url}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${ORG.url}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}

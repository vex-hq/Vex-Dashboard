import type { MetadataRoute } from 'next';

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
    url: `https://tryvex.dev/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const guides = getAllGuides().map((g) => ({
    url: `https://tryvex.dev/guides/${g.meta.framework}`,
    lastModified: new Date(g.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const checklists = getAllChecklists().map((c) => ({
    url: `https://tryvex.dev/checklists/${c.meta.industry}-${c.meta.useCase}`,
    lastModified: new Date(c.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const conceptComparisons = getAllConceptComparisons().map((c) => ({
    url: `https://tryvex.dev/compare/concepts/${c.meta.slug}`,
    lastModified: new Date(c.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const problemGuides = getAllProblemGuides().map((g) => ({
    url: `https://tryvex.dev/learn/${g.meta.slug}`,
    lastModified: new Date(g.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const frameworkUseCaseGuides = getAllFrameworkUseCaseGuides().map((g) => ({
    url: `https://tryvex.dev/guides/${g.meta.framework}/${g.meta.useCase}`,
    lastModified: new Date(g.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const frameworkIndustryGuides = getAllFrameworkIndustryGuides().map((g) => ({
    url: `https://tryvex.dev/guides/${g.meta.framework}/${g.meta.industry}`,
    lastModified: new Date(g.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const problemFrameworkGuides = getAllProblemFrameworkGuides().map((g) => ({
    url: `https://tryvex.dev/learn/${g.meta.problem}/${g.meta.framework}`,
    lastModified: new Date(g.meta.generatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    {
      url: 'https://tryvex.dev',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://tryvex.dev/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...blogPosts,
    {
      url: 'https://tryvex.dev/pricing',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://tryvex.dev/compare/langsmith',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: 'https://tryvex.dev/compare/langfuse',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: 'https://tryvex.dev/compare/guardrails-ai',
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
      url: 'https://tryvex.dev/tools/agent-health-score',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: 'https://tryvex.dev/privacy',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: 'https://tryvex.dev/terms',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}

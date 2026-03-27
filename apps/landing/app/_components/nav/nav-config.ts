export type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  description?: string;
};

export type NavGroup = {
  label: string;
  items: NavLink[];
};

export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return 'items' in item;
}

export const GITHUB_REPO_URL = 'https://github.com/Vex-AI-Dev/Vex';
export const GITHUB_API_URL = 'https://api.github.com/repos/Vex-AI-Dev/Vex';
export const APP_URL = 'https://app.tryvex.dev';
export const DOCS_URL = 'https://docs.tryvex.dev';

export const PRODUCT_GROUP: NavGroup = {
  label: 'Product',
  items: [
    {
      label: 'How It Works',
      href: '/#how-it-works',
      description: 'See how Vex catches drift in production',
    },
    {
      label: 'Quick Start',
      href: '/#code',
      description: 'Instrument your agent in 5 minutes',
    },
    {
      label: 'Pricing',
      href: '/pricing',
      description: 'Free tier, no credit card required',
    },
    {
      label: 'Docs',
      href: DOCS_URL,
      external: true,
      description: 'Full SDK and API reference',
    },
  ],
};

export const RESOURCES_GROUP: NavGroup = {
  label: 'Resources',
  items: [
    { label: 'Framework Guides', href: '/guides' },
    { label: 'Compliance Checklists', href: '/checklists' },
    { label: 'Problem Guides', href: '/learn' },
    { label: 'Comparisons', href: '/compare' },
  ],
};

export const NAV_ITEMS: NavItem[] = [
  PRODUCT_GROUP,
  RESOURCES_GROUP,
  { label: 'Blog', href: '/blog' },
  { label: 'Changelog', href: '/changelog' },
];

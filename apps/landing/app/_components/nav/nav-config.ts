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

export const GITHUB_REPO_URL = 'https://github.com/klio-tech/klio';
export const GITHUB_API_URL = 'https://api.github.com/repos/klio-tech/klio';
export const APP_URL = 'https://app.klio.tech';
export const DOCS_URL = 'https://docs.klio.tech';
// Klio Cloud auth (live, magic-link) — the hosted dashboard at app.klio.tech.
export const CLOUD_SIGNUP_URL = 'https://app.klio.tech/auth/sign-up';
export const CLOUD_SIGNIN_URL = 'https://app.klio.tech/auth/sign-in';

export const PRODUCT_GROUP: NavGroup = {
  label: 'Product',
  items: [
    {
      label: 'How It Works',
      href: '/#how-it-works',
      description: 'How shared memory keeps your agents reliable',
    },
    {
      label: 'Quick Start',
      href: '/#code',
      description: 'Give your agents memory in one command',
    },
    {
      label: 'Pricing',
      href: '/pricing',
      description: 'Free self-host, no credit card required',
    },
    {
      label: 'Docs',
      href: DOCS_URL,
      external: true,
      description: 'MCP tools, hooks, and API reference',
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

import { AppLogo } from '~/components/app-logo';

const sections = [
  {
    heading: 'Product',
    links: [
      { href: 'https://docs.klio.tech', label: 'Docs' },
      { href: 'https://github.com/klio-tech/klio', label: 'GitHub' },
      { href: '/blog', label: 'Blog' },
      { href: '/changelog', label: 'Changelog' },
      { href: '/pricing', label: 'Pricing' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { href: '/guides', label: 'Framework Guides' },
      { href: '/checklists', label: 'Compliance Checklists' },
      { href: '/learn', label: 'Problem Guides' },
      { href: '/compare', label: 'Comparisons' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: 'https://klio.tech', label: 'About' },
      { href: 'https://x.com/klio_tech', label: 'Twitter / X' },
      { href: 'mailto:contact@klio.tech', label: 'contact@klio.tech' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-border border-t">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-5">
          <div>
            <AppLogo href="/" />
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              Memory for AI agents. Local-first, encrypted, open source.
            </p>
          </div>

          {sections.map((section) => (
            <div key={section.heading}>
              <h3 className="text-foreground mb-4 text-sm font-semibold">
                {section.heading}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={
                        link.href.startsWith('http') ? '_blank' : undefined
                      }
                      rel={
                        link.href.startsWith('http')
                          ? 'noopener noreferrer'
                          : undefined
                      }
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

import { AppLogo } from '~/components/app-logo';

const sections = [
  {
    heading: 'Product',
    links: [
      { href: 'https://docs.tryvex.dev', label: 'Docs' },
      { href: 'https://github.com/Vex-AI-Dev/Vex', label: 'GitHub' },
      { href: 'https://api.tryvex.dev', label: 'API' },
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
      { href: 'https://tryvex.dev', label: 'About' },
      { href: 'https://x.com/tryvex', label: 'Twitter / X' },
      { href: 'mailto:info@tryvex.dev', label: 'info@tryvex.dev' },
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
    <footer className="border-t border-[#252525]">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-5">
          <div>
            <AppLogo href="/" />
            <p className="mt-4 text-sm leading-relaxed text-[#a2a2a2]">
              Runtime reliability for AI agents in production.
            </p>
          </div>

          {sections.map((section) => (
            <div key={section.heading}>
              <h3 className="mb-4 text-sm font-semibold text-white">
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
                      className="text-sm text-[#a2a2a2] transition-colors hover:text-white"
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

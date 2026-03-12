'use client';

import { useState } from 'react';

import Link from 'next/link';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@kit/ui/collapsible';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@kit/ui/sheet';
import { cn } from '@kit/ui/utils';

import { GitHubStarsBadge } from './github-stars-badge';
import {
  APP_URL,
  NAV_ITEMS,
  type NavGroup,
  type NavItem,
  type NavLink,
  isNavGroup,
} from './nav-config';

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function MobileNavLink({ item }: { item: NavLink }) {
  const isExternal = item.external || item.href.startsWith('http');
  const Comp = isExternal ? 'a' : Link;
  const externalProps = isExternal
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  return (
    <SheetClose asChild>
      <Comp
        href={item.href}
        {...externalProps}
        className="block rounded-md px-3 py-2 text-sm text-[#a2a2a2] transition-colors hover:bg-[#161616] hover:text-white"
      >
        {item.label}
        {isExternal && (
          <span className="ml-1 text-[#585858]" aria-hidden="true">
            ↗
          </span>
        )}
      </Comp>
    </SheetClose>
  );
}

function MobileNavGroup({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-[#a2a2a2] transition-colors hover:bg-[#161616] hover:text-white">
        {group.label}
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 ml-3 space-y-0.5 border-l border-[#252525] pl-3">
        {group.items.map((item) => (
          <MobileNavLink key={item.href} item={item} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MobileNav({ formatted }: { formatted: string | null }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Open navigation menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#a2a2a2] transition-colors hover:bg-[#161616] hover:text-white md:hidden"
        >
          <MenuIcon />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 border-r border-[#252525] bg-[#0a0a0a] p-0"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        <nav className="flex h-full flex-col px-4 pt-12 pb-6">
          <div className="flex-1 space-y-1">
            {NAV_ITEMS.map((item: NavItem) =>
              isNavGroup(item) ? (
                <MobileNavGroup key={item.label} group={item} />
              ) : (
                <MobileNavLink key={item.href} item={item as NavLink} />
              ),
            )}
          </div>

          <div className="space-y-3 border-t border-[#252525] pt-4">
            <GitHubStarsBadge
              formatted={formatted}
              className="w-full justify-center"
            />
            <SheetClose asChild>
              <a
                href={APP_URL}
                className="flex h-9 w-full items-center justify-center rounded-md bg-emerald-500 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
              >
                Get Started
              </a>
            </SheetClose>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

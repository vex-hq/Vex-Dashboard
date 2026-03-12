'use client';

import Link from 'next/link';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@kit/ui/navigation-menu';
import { cn } from '@kit/ui/utils';

import {
  NAV_ITEMS,
  type NavGroup,
  type NavItem,
  type NavLink,
  isNavGroup,
} from './nav-config';

function NavDropdownItem({ item }: { item: NavLink }) {
  const Comp = item.external ? 'a' : Link;
  const externalProps = item.external
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  return (
    <li>
      <NavigationMenuLink asChild>
        <Comp
          href={item.href}
          {...externalProps}
          className="group block rounded-lg px-3.5 py-3 no-underline transition-all outline-none select-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-medium leading-none text-[#e0e0e0] group-hover:text-white">
              {item.label}
              {item.external && (
                <span className="ml-1 text-[#555]" aria-hidden="true">
                  ↗
                </span>
              )}
            </span>
            {item.description && (
              <span className="text-[12px] leading-relaxed text-[#555] group-hover:text-[#777]">
                {item.description}
              </span>
            )}
          </div>
        </Comp>
      </NavigationMenuLink>
    </li>
  );
}

function NavDropdown({ group }: { group: NavGroup }) {
  const hasDescriptions = group.items.some((item) => item.description);

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger
        className={cn(
          'bg-transparent text-[#a2a2a2] hover:bg-transparent hover:text-white',
          'focus:bg-transparent focus:text-white',
          'data-[state=open]:bg-transparent data-[state=open]:text-white',
          'h-9 px-3 text-sm font-medium',
        )}
      >
        {group.label}
      </NavigationMenuTrigger>
      <NavigationMenuContent
        className={cn(
          'p-2',
          hasDescriptions ? 'min-w-[320px]' : 'min-w-[220px]',
        )}
      >
        <ul className="flex flex-col gap-0.5">
          {group.items.map((item) => (
            <NavDropdownItem key={item.href} item={item} />
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function NavDirectLink({ item }: { item: NavLink }) {
  const Comp = item.external ? 'a' : Link;
  const externalProps = item.external
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  return (
    <NavigationMenuItem>
      <NavigationMenuLink asChild>
        <Comp
          href={item.href}
          {...externalProps}
          className="inline-flex h-9 items-center px-3 text-sm font-medium text-[#a2a2a2] transition-colors hover:text-white"
        >
          {item.label}
        </Comp>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}

export function DesktopNav() {
  return (
    <div className="hidden items-center md:flex">
      <NavigationMenu
        className={cn(
          '[&_[data-radix-navigation-menu-viewport]]:!rounded-xl',
          '[&_[data-radix-navigation-menu-viewport]]:!border',
          '[&_[data-radix-navigation-menu-viewport]]:!border-white/[0.08]',
          '[&_[data-radix-navigation-menu-viewport]]:!bg-[#141414]',
          '[&_[data-radix-navigation-menu-viewport]]:!shadow-[0_20px_60px_-10px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05),0_0_40px_-15px_rgba(16,185,129,0.06)]',
          '[&_[data-radix-navigation-menu-viewport]]:!backdrop-blur-xl',
        )}
      >
        <NavigationMenuList className="gap-1">
          {NAV_ITEMS.map((item: NavItem) =>
            isNavGroup(item) ? (
              <NavDropdown key={item.label} group={item} />
            ) : (
              <NavDirectLink key={item.href} item={item} />
            ),
          )}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

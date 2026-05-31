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
          className="group hover:bg-foreground/[0.06] focus:bg-foreground/[0.06] block rounded-lg px-3.5 py-3 no-underline transition-all outline-none select-none"
        >
          <div className="flex flex-col gap-1">
            <span className="text-foreground text-[13px] leading-none font-medium">
              {item.label}
              {item.external && (
                <span className="text-muted-foreground ml-1" aria-hidden="true">
                  ↗
                </span>
              )}
            </span>
            {item.description && (
              <span className="text-muted-foreground group-hover:text-foreground text-[12px] leading-relaxed">
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
          'text-muted-foreground hover:text-foreground bg-transparent hover:bg-transparent',
          'focus:text-foreground focus:bg-transparent',
          'data-[state=open]:text-foreground data-[state=open]:bg-transparent',
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
          className="text-muted-foreground hover:text-foreground inline-flex h-9 items-center px-3 text-sm font-medium transition-colors"
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
          '[&_[data-radix-navigation-menu-viewport]]:!border-border',
          '[&_[data-radix-navigation-menu-viewport]]:!bg-popover',
          '[&_[data-radix-navigation-menu-viewport]]:!shadow-[0_20px_60px_-10px_rgba(10,10,10,0.14)]',
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

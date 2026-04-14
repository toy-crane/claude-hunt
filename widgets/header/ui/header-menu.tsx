"use client";

import { RiUserLine } from "@remixicon/react";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/ui/avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@shared/ui/dropdown-menu.tsx";

interface HeaderMenuProps {
  avatarUrl: string | null;
  displayName: string | null;
}

export function HeaderMenu({ displayName, avatarUrl }: HeaderMenuProps) {
  const trimmed = displayName?.trim() ?? "";
  const initial = trimmed.charAt(0).toUpperCase();
  const hasInitial = initial.length > 0;
  const altText = trimmed.length > 0 ? trimmed : "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar>
          {avatarUrl ? <AvatarImage alt={altText} src={avatarUrl} /> : null}
          <AvatarFallback data-testid="header-avatar-fallback">
            {hasInitial ? (
              initial
            ) : (
              <RiUserLine aria-label="Account" className="size-4" />
            )}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {/* Populated in Tasks 4 (Theme) and 6 (Settings + Log out). */}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

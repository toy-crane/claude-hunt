"use client";

import {
  RiComputerLine,
  RiMoonLine,
  RiSunLine,
  RiUserLine,
} from "@remixicon/react";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/ui/avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@shared/ui/dropdown-menu.tsx";
import { useTheme } from "next-themes";

interface HeaderMenuProps {
  avatarUrl: string | null;
  displayName: string | null;
}

export function HeaderMenu({ displayName, avatarUrl }: HeaderMenuProps) {
  const trimmed = displayName?.trim() ?? "";
  const initial = trimmed.charAt(0).toUpperCase();
  const hasInitial = initial.length > 0;
  const altText = trimmed.length > 0 ? trimmed : "Account";

  const { theme, setTheme } = useTheme();

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
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={setTheme} value={theme}>
          <DropdownMenuRadioItem value="light">
            <RiSunLine />
            <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <RiMoonLine />
            <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <RiComputerLine />
            <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuGroup>
          {/* Populated in Task 6 (Settings + Log out). */}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

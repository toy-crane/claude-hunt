"use client";

import { signOut } from "@features/auth-login";
import {
  RiComputerLine,
  RiLogoutBoxRLine,
  RiMoonLine,
  RiSettings3Line,
  RiSunLine,
  RiUserLine,
} from "@remixicon/react";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/ui/dropdown-menu";
import Link from "next/link";
import { useTheme } from "next-themes";

interface HeaderMenuProps {
  avatarUrl: string | null;
  displayName: string | null;
}

export function HeaderMenu({ displayName, avatarUrl }: HeaderMenuProps) {
  const trimmed = displayName?.trim() ?? "";
  const initial = trimmed.charAt(0).toUpperCase();
  const hasInitial = initial.length > 0;
  const altText = trimmed.length > 0 ? trimmed : "계정";

  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="계정 메뉴 열기"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar>
          {avatarUrl ? <AvatarImage alt={altText} src={avatarUrl} /> : null}
          <AvatarFallback data-testid="header-avatar-fallback">
            {hasInitial ? initial : <RiUserLine aria-label="계정" />}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>테마</DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={setTheme} value={theme}>
          <DropdownMenuRadioItem value="light">
            <RiSunLine />
            <span>라이트</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <RiMoonLine />
            <span>다크</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <RiComputerLine />
            <span>시스템</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <RiSettings3Line />
            <span>설정</span>
          </Link>
        </DropdownMenuItem>
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button className="w-full" type="submit">
              <RiLogoutBoxRLine />
              <span>로그아웃</span>
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

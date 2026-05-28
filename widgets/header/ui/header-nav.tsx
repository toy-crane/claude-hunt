"use client";

import { cn } from "@shared/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface HeaderNavProps {
  className?: string;
  projectCount: number;
}

export function HeaderNav({ projectCount, className }: HeaderNavProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isProjects = pathname.startsWith("/projects");

  return (
    <nav
      aria-label="주요 내비게이션"
      className={cn("flex items-center gap-1", className)}
    >
      <NavLink active={isHome} href="/">
        홈
      </NavLink>
      <NavLink active={isProjects} href="/projects">
        프로젝트
        <span className="ml-1 font-mono text-[10px] text-muted-foreground">
          {projectCount}
        </span>
      </NavLink>
    </nav>
  );
}

interface NavLinkProps {
  active: boolean;
  children: React.ReactNode;
  href: string;
}

function NavLink({ active, children, href }: NavLinkProps) {
  return (
    <Link
      className={cn(
        "-mb-px border-b px-2.5 py-1.5 text-xs",
        active
          ? "border-foreground font-medium text-foreground"
          : "border-transparent text-muted-foreground"
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

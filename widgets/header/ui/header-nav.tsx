"use client";

import { cn } from "@shared/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DOCS_URL = "https://docs.claude-hunt.com/";

export interface HeaderNavProps {
  className?: string;
  projectCount: number;
}

interface HeaderNavViewProps extends HeaderNavProps {
  isHome: boolean;
  isProjects: boolean;
}

/**
 * Presentational nav. No hooks, so it renders into the static shell (and as
 * the {@link HeaderNavFallback}) without reading the dynamic pathname.
 */
function HeaderNavView({
  projectCount,
  className,
  isHome,
  isProjects,
}: HeaderNavViewProps) {
  return (
    <nav
      aria-label="주요 내비게이션"
      className={cn("flex w-full items-center md:w-auto md:gap-1", className)}
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
      <NavLink active={false} external href={DOCS_URL}>
        강의자료
      </NavLink>
    </nav>
  );
}

export function HeaderNav({ projectCount, className }: HeaderNavProps) {
  const pathname = usePathname();
  return (
    <HeaderNavView
      className={className}
      isHome={pathname === "/"}
      isProjects={pathname.startsWith("/projects")}
      projectCount={projectCount}
    />
  );
}

/**
 * Active-state-free nav for the Suspense fallback / static shell. `usePathname`
 * is request-dynamic, so the real {@link HeaderNav} (with the active-link
 * highlight) hydrates over this on the client.
 */
export function HeaderNavFallback({ projectCount, className }: HeaderNavProps) {
  return (
    <HeaderNavView
      className={className}
      isHome={false}
      isProjects={false}
      projectCount={projectCount}
    />
  );
}

interface NavLinkProps {
  active: boolean;
  children: React.ReactNode;
  external?: boolean;
  href: string;
}

function NavLink({ active, children, external, href }: NavLinkProps) {
  const className = cn(
    "-mb-px inline-flex flex-1 items-center justify-center border-b px-3 py-2 text-sm md:flex-none md:justify-start md:px-2.5 md:py-1.5 md:text-xs",
    active
      ? "border-foreground font-medium text-foreground"
      : "border-transparent text-muted-foreground"
  );

  if (external) {
    return (
      <a
        className={className}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  }
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

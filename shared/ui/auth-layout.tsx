import { Logo } from "./logo";

interface AuthLayoutProps {
  children: React.ReactNode;
  /** One-line subtitle rendered as a muted `<p>` under the heading. */
  description: string;
  /** Page heading rendered as a single `<h1>`. */
  title: string;
}

/**
 * Shared page shell for `/login` and `/onboarding`. Provides the
 * flex-centered background, max-width container, and unified Logo →
 * h1 → subtitle header. Callers supply the form body via `children`.
 *
 * The blinking Logo cursor is always on — per the
 * fit-login-onboarding spec, motion must not differ between the
 * login and onboarding screens.
 */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <div className="w-full max-w-sm">
        <div>
          <Logo blink className="text-3xl" />
          <h1 className="mt-8 font-semibold text-2xl tracking-tight">
            {title}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">{description}</p>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

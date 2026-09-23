import Link from "next/link";
import { cn } from "@/lib/utils";

/** Shared primitives for the beta onboarding screens. */

export function BetaTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "text-balance text-center text-2xl font-bold leading-tight sm:text-3xl",
        className
      )}
      style={{ color: "var(--beta-ink)" }}
    >
      {children}
    </h1>
  );
}

export function BetaLead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn("text-pretty text-center text-sm leading-relaxed sm:text-base", className)}
      style={{ color: "var(--beta-body)" }}
    >
      {children}
    </p>
  );
}

const ctaClasses = cn(
  "block w-full rounded-full px-8 py-4 text-center text-base font-medium transition-opacity",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-40",
  "hover:opacity-90"
);

const ctaStyle = {
  backgroundColor: "var(--beta-cta)",
  color: "var(--beta-cta-ink)",
  "--tw-ring-color": "var(--beta-ink)",
  "--tw-ring-offset-color": "var(--beta-bg)",
} as React.CSSProperties;

/** Same pill as BetaButton, but a real link (used for "open the feed"). */
export function BetaLinkButton({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(ctaClasses, className)} style={ctaStyle}>
      {children}
    </Link>
  );
}

export function BetaButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(ctaClasses, className)} style={ctaStyle} {...props}>
      {children}
    </button>
  );
}

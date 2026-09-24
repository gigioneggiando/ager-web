import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Primitives for the onboarding, expressed in the coordinates of the 402x874
 * Figma frame. The whole frame is scaled as one (see .beta-stage), so every
 * value here is the design value, unmodified.
 */

/** Absolute box inside the stage. */
export function Box({
  left,
  top,
  width,
  height,
  className,
  style,
  children,
}: {
  left?: number;
  top: number;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const centred = left === undefined;
  return (
    <div
      className={cn("absolute", className)}
      style={{
        top,
        // Centred with auto margins, never with a transform: the entrance
        // animation animates transform and would cancel the centring.
        ...(centred
          ? { left: 0, right: 0, marginInline: "auto", width: width ?? "fit-content" }
          : { left, width }),
        height,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** 20/24 bold, the screen title. */
export function Title({
  children,
  color = "var(--beta-ink)",
  top,
}: {
  children: React.ReactNode;
  color?: string;
  top: number;
}) {
  return (
    <Box left={30} top={top} width={342}>
      <h1
        className="text-center font-bold"
        style={{ fontSize: 20, lineHeight: "24px", color }}
      >
        {children}
      </h1>
    </Box>
  );
}

const ctaClass =
  "inline-flex items-center justify-center rounded-[35px] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

const ctaStyle: React.CSSProperties = {
  padding: "17px 52px",
  backgroundColor: "var(--beta-cta)",
  color: "var(--beta-cta-ink)",
  fontSize: 20,
  lineHeight: "24px",
  whiteSpace: "nowrap",
  ...({
    "--tw-ring-color": "var(--beta-navy)",
    "--tw-ring-offset-color": "var(--beta-bg)",
  } as React.CSSProperties),
};

/** The pill button. Width comes from the label, exactly as in the design. */
export function Cta({
  top,
  children,
  onClick,
  disabled,
}: {
  top: number;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Box top={top}>
      <button type="button" onClick={onClick} disabled={disabled} className={ctaClass} style={ctaStyle}>
        {children}
      </button>
    </Box>
  );
}

/** Same pill, as a link (the last screen leaves the site). */
export function CtaLink({
  top,
  href,
  children,
}: {
  top: number;
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = /^https?:\/\//.test(href);
  return (
    <Box top={top}>
      {isExternal ? (
        <a href={href} rel="noopener" className={ctaClass} style={ctaStyle}>
          {children}
        </a>
      ) : (
        <Link href={href} className={ctaClass} style={ctaStyle}>
          {children}
        </Link>
      )}
    </Box>
  );
}

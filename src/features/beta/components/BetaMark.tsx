import { cn } from "@/lib/utils";

/**
 * The Ager mark, tinted with the beta ink colour.
 * The source PNG is a transparent black glyph, so it is used as a mask and the
 * colour comes from the background - that way it follows light/dark for free.
 */
export default function BetaMark({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("block h-12 w-12 sm:h-14 sm:w-14", className)}
      style={{
        backgroundColor: "var(--beta-ink)",
        maskImage: "url(/beta/ager-mark.png)",
        WebkitMaskImage: "url(/beta/ager-mark.png)",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

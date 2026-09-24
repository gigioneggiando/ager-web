/**
 * The Ager mark, tinted with the navy ink.
 * The source PNG is a transparent black glyph, so it is used as a mask and the
 * colour comes from the background - that way it follows light/dark for free.
 */
export default function BetaMark({
  size,
  top,
  label,
}: {
  size: number;
  top: number;
  label: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className="beta-mark absolute left-1/2 -translate-x-1/2"
      style={{
        top,
        width: size,
        height: size,
        backgroundColor: "var(--beta-navy)",
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

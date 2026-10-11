const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Fixed, non-interactive background: animated aurora mesh, a fine grid masked
 * with a radial fade, and a subtle grain overlay.
 */
export function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-surface-0" />

      <div
        className="aurora-blob -left-32 -top-40 size-[38rem] bg-brand-600/25"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="aurora-blob -right-40 top-1/4 size-[34rem] bg-accent-500/20"
        style={{ animationDelay: '-7s' }}
      />
      <div
        className="aurora-blob -bottom-40 left-1/3 size-[30rem] bg-synthesis/20"
        style={{ animationDelay: '-14s' }}
      />

      <div
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}

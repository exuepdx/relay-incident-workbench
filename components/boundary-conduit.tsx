/**
 * The boundary between Vercel and the customer's estate, as a conduit with
 * requests (violet, downward) and evidence (teal, upward) in flight.
 * Pure SVG with SMIL motion, so it animates without JavaScript.
 */
export function BoundaryConduit() {
  const path = "M28 8 C 28 70, 28 170, 28 232";
  const dots = [0, 0.8, 1.6, 2.4];
  return (
    <div className="conduit" aria-hidden="true">
      <svg viewBox="0 0 56 240">
        <defs>
          <linearGradient id="conduit" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#6d4fd2" stopOpacity="0.9" />
            <stop offset="1" stopColor="#14b8a6" stopOpacity="0.9" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={path} stroke="url(#conduit)" strokeWidth="1.5" strokeDasharray="4 6" fill="none" opacity="0.6" />
        <path d={path} stroke="url(#conduit)" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.08" />
        {dots.map((begin, i) => (
          <circle key={`d${i}`} r="3" fill="#a78bfa" filter="url(#glow)">
            <animateMotion dur="3.2s" begin={`${begin}s`} repeatCount="indefinite" path={path} />
          </circle>
        ))}
        {dots.map((begin, i) => (
          <circle key={`u${i}`} r="2.4" fill="#5eead4" filter="url(#glow)">
            <animateMotion
              dur="3.2s"
              begin={`${begin + 0.4}s`}
              repeatCount="indefinite"
              path={path}
              keyPoints="1;0"
              keyTimes="0;1"
              calcMode="linear"
            />
          </circle>
        ))}
        <text x="44" y="120" transform="rotate(90 44 120)" textAnchor="middle">
          HTTPS · BEARER · READ-ONLY
        </text>
      </svg>
    </div>
  );
}

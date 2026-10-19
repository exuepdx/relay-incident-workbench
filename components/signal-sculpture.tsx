/** Decorative architecture sculpture, never a representation of measured telemetry.
 * SVG + CSS keep the workbench off a continuous WebGL render loop. */
export function SignalSculpture() {
  return (
    <div className="signal-sculpture" aria-hidden="true">
      <svg viewBox="0 0 320 250" fill="none">
        <defs>
          <linearGradient id="signal-plane" x1="80" y1="40" x2="240" y2="220" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8fdcff" stopOpacity=".32" />
            <stop offset="1" stopColor="#8fdcff" stopOpacity=".015" />
          </linearGradient>
          <linearGradient id="signal-edge" x1="50" y1="70" x2="260" y2="190" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c1efff" />
            <stop offset="1" stopColor="#567dff" stopOpacity=".3" />
          </linearGradient>
        </defs>
        <ellipse cx="160" cy="174" rx="147" ry="62" className="sculpture-orbit" />
        <ellipse cx="160" cy="174" rx="125" ry="49" className="sculpture-orbit inner" />
        <path d="M160 25V225M20 174h280" className="sculpture-axis" />
        {[0, 1, 2].map((layer) => (
          <g key={layer} className={`sculpture-layer layer-${layer}`} transform={`translate(0 ${layer * 39})`}>
            <path d="m160 33 105 51-105 51L55 84Z" fill="url(#signal-plane)" stroke="url(#signal-edge)" />
            <path
              d="m55 84 105 51 105-51v8l-105 51L55 92Z"
              fill="#7bc9ff"
              fillOpacity=".055"
              stroke="#8fdcff"
              strokeOpacity=".14"
            />
            <path d="m105 84 55-27 55 27-55 27Z" stroke="#a5e6ff" strokeOpacity=".25" />
            <circle cx="160" cy="84" r="5" fill="#b7f7e0" />
            <circle cx="160" cy="84" r="13" stroke="#b7f7e0" strokeOpacity=".5" />
          </g>
        ))}
        <path d="M160 84v78" stroke="#b7f7e0" strokeWidth="1.5" strokeDasharray="3 5" className="sculpture-thread" />
        <circle cx="55" cy="84" r="3" fill="#9cdfff" />
        <circle cx="265" cy="162" r="3" fill="#b7f7e0" />
      </svg>
    </div>
  );
}

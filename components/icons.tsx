export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    pulse: <path d="M2 12h4l3-8 5 16 3-8h5" />,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    layers: <><path d="m12 3 10 5-10 5L2 8 12 3Z"/><path d="m2 12 10 5 10-5M2 16l10 5 10-5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    spark: <><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/><path d="M20 2v4m-2-2h4"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m8 5 7 7-7 7"/>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.pulse}</svg>;
}
export function Logo() {
  return <span className="logo"><span className="logo-mark" aria-hidden="true"><i/><i/><i/></span>relay<span className="logo-period">.</span></span>;
}

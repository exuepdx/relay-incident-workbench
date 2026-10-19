import Link from "next/link";
import { Icon, Logo } from "./icons";
import { customer } from "@/lib/customer";

export function Shell({ children, current }: { children: React.ReactNode; current?: string }) {
  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to investigation
      </a>
      <aside className="sidebar">
        <Link href="/" aria-label="Relay home" className="brand-link">
          <Logo />
          <span className="brand-edition">INCIDENT WORKBENCH</span>
        </Link>
        <div className="workspace">
          <span className="workspace-icon">N</span>
          <div>
            <strong>{customer.name}</strong>
            <span>On-call bridge</span>
          </div>
        </div>
        <nav className="nav-group" aria-label="Incidents">
          <span className="eyebrow nav-label">Open incidents</span>
          {customer.incidents.map((i) => (
            <Link
              key={i.id}
              className="nav-item"
              href={`/incidents/${i.id}`}
              aria-current={i.id === current ? "page" : undefined}
            >
              <Icon name="pulse" size={16} />
              <span className="nav-incident">
                <span className="mono">{i.id}</span>
                <span>{i.short}</span>
              </span>
              <span className="sev" aria-hidden="true" />
            </Link>
          ))}
        </nav>
        <nav className="nav-group" aria-label="Workspace">
          <span className="eyebrow nav-label">Workspace</span>
          <Link className="nav-item" href="/proposal">
            <Icon name="layers" size={16} />
            Presentation
            <Icon name="arrow" size={14} />
          </Link>
        </nav>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}

export function Topbar({ crumbs, children }: { crumbs: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="topbar">
      <div className="crumbs">{crumbs}</div>
      <div className="topbar-right">
        <span className="chip">
          <i /> Synthetic scenario
        </span>
        {children}
        <Link href="/proposal" className="btn btn-ghost">
          Presentation <Icon name="arrow" size={14} />
        </Link>
      </div>
    </header>
  );
}

import type { Evidence } from "@/lib/contracts";
import { Icon } from "./icons";

/** Every evidence item the agent can cite, addressable by id for citation links. */
export function EvidenceRegister({ evidence, note }: { evidence: Evidence[]; note?: string }) {
  return (
    <div className="register">
      {note && (
        <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
          {note}
        </p>
      )}
      {evidence.map((item) => (
        <article id={`evidence-${item.id}`} className="panel evidence" key={item.id}>
          <div className="evidence-top">
            <span className="cite">{item.id}</span>
            <span className="chip">{item.kind}</span>
          </div>
          <h3>{item.title}</h3>
          <p>{item.detail}</p>
          <footer>
            <Icon name="layers" size={13} /> {item.source}
          </footer>
        </article>
      ))}
    </div>
  );
}

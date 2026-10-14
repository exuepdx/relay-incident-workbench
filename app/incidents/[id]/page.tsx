import { Suspense } from "react";

// With Cache Components, params are runtime data: read them inside a Suspense
// boundary so the shell around it is still prerendered.
export default function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="page">
      <p className="eyebrow">Incident</p>
      <Suspense fallback={<div className="skeleton" style={{ height: 32, width: 200 }} />}>
        <Title params={params} />
      </Suspense>
    </main>
  );
}

async function Title({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <h1>{id}</h1>;
}

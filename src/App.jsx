import Producoes from "./pages/Producoes";

export default function App() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: "#F4F3F0" }}>
      <header style={{ position: 'sticky', top: 0, backgroundColor: "#F5F7FF", boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', zIndex: 100 }}>
        <div style={{ maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', paddingTop: '1rem', paddingBottom: '1rem', paddingLeft: '1rem', paddingRight: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--lncc-blue)', margin: 0 }}>LNCC SDumont</p>
            <h1 style={{ marginTop: '0.75rem', fontSize: '2.25rem', fontWeight: 600, color: '#1f2937' }}>Painel de Produções</h1>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '1rem', paddingBottom: '1.25rem' }}>
        <Producoes />
      </main>
    </div>
  );
}

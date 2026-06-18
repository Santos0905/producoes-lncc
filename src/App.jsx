import Producoes from "./pages/Producoes";

export default function App() {
  return (
    <div className="min-vh-100" style={{ backgroundColor: "#F4F3F0" }}>
      <header className="sticky-top shadow-sm" style={{ backgroundColor: "#F5F7FF" }}>
        <div className="container-xl py-4 flex-column flex-lg-row d-flex align-items-lg-center justify-content-lg-between gap-3">
          <div>
            <p className="small fw-semibold text-uppercase tracking-wide text-primary">LNCC SDumont</p>
            <h1 className="mt-3 display-4 fw-semibold text-dark">Painel de Produções</h1>
          </div>
        </div>
      </header>
      <main className="container-xl py-4 py-lg-5"><Producoes /></main>
    </div>
  );
}
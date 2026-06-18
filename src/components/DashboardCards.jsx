import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './DashboardCards.css';

export default function DashboardCards() {
  const [summary, setSummary] = useState({ totalProductions: 0, bibliographic: 0, projects: 0, technical: 0 });
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState(null);

  const formatarNumero = (v) => v != null && !isNaN(Number(v)) ? Number(v).toLocaleString('pt-BR') : "0";

  useEffect(() => {
    let isMounted = true;
    api.get('/api/producoes/totais')
      .then(res => {
        if (!isMounted || !res.data) return;
        setSummary({
          totalProductions: res.data.total_producoes ?? 0,
          bibliographic: res.data.bibliographic ?? 0,
          projects: res.data.projects_with_funding ?? 0,
          technical: res.data.technical ?? 0
        });
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        setErrorLog("Falha na comunicação com o container do backend ao puxar totais.");
        setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const cardsData = [
    { title: "Produções Totais", val: summary.totalProductions, desc: "Todas produções registradas no sistema" },
    { title: "Total de Produções Bibliográficas", val: summary.bibliographic, desc: "Artigos, livros e trabalhos completos" },
    { title: "Projetos com Aporte de Agências e Fomento a Empresas", val: summary.projects, desc: "Com financiamento de agências empresariais" },
    { title: "Total de Produções Técnicas e de Inovação", val: summary.technical, desc: "Teses, dissertações e produções técnicas" }
  ];

  return (
    <section className="px-4 mb-4">
      {errorLog && (
        <div className="alert alert-danger text-center" role="alert">
          {errorLog} <br /><small>Verifique se o container <strong>fastapi_app</strong> está de pé.</small>
        </div>
      )}
      <div className="row g-4 align-items-stretch">
        {cardsData.map((c, i) => (
          <div key={i} className="col-12 col-md-6 col-lg-5 col-xl-3">
            <article className="card-hover-effect card h-100 border-0 p-3 text-center">
              <div className="mb-2">
                <span className="badge bg-primary px-3 py-2 fs-6 fw-semibold mb-4 text-wrap" style={{ lineHeight: 1.1 }}>{c.title}</span>
              </div>
              <p className="display-6 fw-bold text-dark mb-2 lh-1">{loading ? "..." : formatarNumero(c.val)}</p>
              <p className="h6 fw-semibold text-muted lh-lg mb-1">{c.desc}</p>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
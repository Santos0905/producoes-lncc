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
    <section style={{ paddingLeft: '1rem', paddingRight: '1rem', marginBottom: '1rem' }}>
      {errorLog && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', marginBottom: '1rem' }}>
          {errorLog} <br /><small>Verifique se o container <strong>fastapi_app</strong> está de pé.</small>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
        {cardsData.map((c, i) => (
          <div key={i}>
            <article className="card-hover-effect" style={{
              backgroundColor: '#ffffff',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '1.5rem 0.75rem',
              textAlign: 'center',
              height: '100%',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: 'var(--lncc-blue)',
                  color: 'white',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.25rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  lineHeight: 1.1,
                  wordWrap: 'break-word'
                }}>
                  {c.title}
                </span>
              </div>
              <p style={{
                fontSize: '1.875rem',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '0.5rem',
                marginTop: 0,
                lineHeight: 1
              }}>
                {loading ? "..." : formatarNumero(c.val)}
              </p>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#6b7280',
                marginBottom: '0.25rem',
                marginTop: 'auto',
                lineHeight: 1.5
              }}>
                {c.desc}
              </p>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}

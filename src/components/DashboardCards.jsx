import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './DashboardCards.css';

export default function DashboardCards() {
  const [summary, setSummary] = useState({
    totalProductions: 0,
    bibliographic: 0,
    projects: 0,
    technical: 0
  });

  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState(null);

  const formatarNumero = (valor) => {
    if (valor === undefined || valor === null) return "0";
    const numero = Number(valor);
    return isNaN(numero) ? "0" : numero.toLocaleString('pt-BR');
  };

  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(() => {
      if (isMounted) {
        setLoading(true);
        setErrorLog(null);
      }
    }, 0);

    api.get('/api/producoes/totais')
      .then(res => {
        if (!isMounted) return;
        if (res.data) {
          setSummary({
            totalProductions: res.data.total_producoes ?? 0,
            bibliographic: res.data.bibliographic ?? 0,
            projects: res.data.projects_with_funding ?? 0,
            technical: res.data.technical ?? 0
          });
        }
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error("Erro ao conectar ao Docker:", err);
        setErrorLog("Falha na comunicação com o container do backend ao puxar totais.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <section className="px-4 mb-4">
      {errorLog && (
        <div className="alert alert-danger text-center" role="alert">
          {errorLog} <br />
          <small>Verifique se o container <strong>fastapi_app</strong> está de pé.</small>
        </div>
      )}

      <div className="row g-4 align-items-stretch">
        {/* CARD 1: PRODUÇÕES TOTAIS */}
        <div className="col-12 col-md-6 col-lg-5 col-xl-3">
          <article className="card-hover-effect card h-100 border-0 p-3 text-center">
            <div className="mb-2">
              <span className="badge bg-primary px-3 py-2 fs-6 fw-semibold mb-4 text-wrap" style={{ lineHeight: 1.1 }}>
                Produções Totais
              </span>
            </div>
            <p className="display-6 fw-bold text-dark mb-2 lh-1">
              {loading ? "..." : formatarNumero(summary.totalProductions)}
            </p>
            <p className="h6 fw-semibold text-muted lh-lg mb-1">
              Todas produções registradas no sistema
            </p>
          </article>
        </div>

        {/* CARD 2: PRODUÇÕES BIBLIOGRÁFICAS */}
        <div className="col-12 col-md-6 col-lg-5 col-xl-3">
          <article className="card-hover-effect card h-100 border-0 p-3 text-center">
            <div className="mb-2">
              <span className="badge bg-primary px-3 py-2 fs-6 fw-semibold mb-4 text-wrap" style={{ lineHeight: 1.1 }}>
                Total de Produções Bibliográficas
              </span>
            </div>
            <p className="display-6 fw-bold text-dark mb-2 lh-1">
              {loading ? "..." : formatarNumero(summary.bibliographic)}
            </p>
            <p className="h6 fw-semibold text-muted lh-lg mb-1">
              Artigos, livros e trabalhos completos
            </p>
          </article>
        </div>

        {/* CARD 3: PROJETOS COM APORTE*/}
        <div className="col-12 col-md-6 col-lg-5 col-xl-3">
          <article className="card-hover-effect card h-100 border-0 p-3 text-center">
            <div className="mb-2">
              <span className="badge bg-primary px-3 py-2 fs-6 fw-semibold mb-4 text-wrap" style={{ lineHeight: 1.1 }}>
                Projetos com Aporte de Agências e Fomento a Empresas
              </span>
            </div>
            <p className="display-6 fw-bold text-dark mb-2 lh-1">
              {loading ? "..." : formatarNumero(summary.projects)}
            </p>
            <p className="h6 fw-semibold text-muted lh-lg mb-1">
              Com financiamento de agências empresariais
            </p>
          </article>
        </div>

        {/* CARD 4: PRODUÇÕES TÉCNICAS E INOVAÇÃO */}
        <div className="col-12 col-md-6 col-lg-5 col-xl-3">
          <article className="card-hover-effect card h-100 border-0 p-3 text-center">
            <div className="mb-2">
              <span className="badge bg-primary px-3 py-2 fs-6 fw-semibold mb-4 text-wrap" style={{ lineHeight: 1.1 }}>
                Total de Produções Técnicas e de Inovação
              </span>
            </div>
            <p className="display-6 fw-bold text-dark mb-2 lh-1">
              {loading ? "..." : formatarNumero(summary.technical)}
            </p>
            <p className="h6 fw-semibold text-muted lh-lg mb-1">
              Teses, dissertações e produções técnicas
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

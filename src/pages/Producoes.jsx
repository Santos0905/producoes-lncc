import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardCards from '../components/DashboardCards';
import api from '../services/api';
import './Producoes.css';
import useDebouncedValue from '../hooks/useDebouncedValue';

const Producoes = () => {
  const [listaProducoes, setListaProducoes] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState(null);

  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [anoFiltro, setAnoFiltro] = useState('');

  // paginação real (backend)
  const [pageSize] = useState(10);

  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const [carregandoPagina, setCarregandoPagina] = useState(false);
  const carregandoPaginaRef = useRef(false);

  const totalItems = Array.isArray(listaProducoes) ? listaProducoes.length : 0;
  const hasMore = totalItems < total;


  const debouncedAno = useDebouncedValue(anoFiltro, 250);

  const anoParam = useMemo(() => {
    if (debouncedAno === '' || debouncedAno === null || debouncedAno === undefined) return null;
    const n = Number(debouncedAno);
    return Number.isFinite(n) ? n : null;
  }, [debouncedAno]);

  const params = useMemo(
    () => ({
      tipo: tipoFiltro === 'Todos' ? null : tipoFiltro,
      ano: anoParam,
    }),
    [tipoFiltro, anoParam]
  );

  const fetchPage = useCallback(
    async ({ reset = false } = {}) => {
      if (carregandoPaginaRef.current) return;

      if (reset) {
        setOffset(0);
        setListaProducoes([]);
        setTotal(0);
      }

      setCarregandoLista(!reset ? false : true);
      setErroLista(null);
      setCarregandoPagina(true);
      carregandoPaginaRef.current = true;

      try {
        const res = await api.get('/api/producoes/pagina', {
          params: {
            ...params,
            limit: pageSize,
            offset: reset ? 0 : offset,
          },
        });

        const dados = res.data?.items;
        const totalBackend = res.data?.total;

        setListaProducoes((prev) => {
          if (reset) return Array.isArray(dados) ? dados : [];
          const novos = Array.isArray(dados) ? dados : [];
          return [...prev, ...novos];
        });

        if (typeof totalBackend === 'number') {
          setTotal(totalBackend);
        } else {
          setTotal(0);
        }

        setCarregandoLista(false);
      } catch (err) {
        console.error('Erro ao buscar página de produções no backend:', err);
        setErroLista('Erro ao carregar as produções. Verifique a conexão com o backend.');
        setListaProducoes([]);
        setTotal(0);
        setCarregandoLista(false);
      } finally {
        setCarregandoPagina(false);
        carregandoPaginaRef.current = false;
      }
    },
    [params, pageSize, offset]
  );

  // ao trocar filtros, resetar e buscar 1ª página
  useEffect(() => {
    fetchPage({ reset: true });
  }, [tipoFiltro, anoParam]);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setOffset((prev) => prev + pageSize);
  }, [hasMore, pageSize]);

  useEffect(() => {
    if (offset === 0) return;
    fetchPage({ reset: false });
  }, [offset, fetchPage]);

  // Paginação é controlada muda pelos botões
  const producoesVisiveis = listaProducoes;




  return (
    <div className="py-4">
      <DashboardCards />


      <div className="mx-4 producoes-filtros">
          <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div>
            <h3 className="h4 mb-0 fw-semibold" style={{ color: '#0f172a' }}>
              Bibliografias
            </h3>
          </div>
        </div>

        {/* Abaixo de Bibliografias */}

        {/* 1) Campo Ano */}
        <div className="d-flex align-items-center gap-2 flex-wrap" style={{ paddingTop: 6, paddingBottom: 8 }}>
          <label htmlFor="anoFiltro" style={{ fontSize: '.875rem', color: '#64748b', fontWeight: 600 }}>
            Ano
          </label>
          <input
            id="anoFiltro"
            type="number"
            className="form-control form-control-sm"
            style={{ maxWidth: 140 }}
            value={anoFiltro}
            onChange={(e) => setAnoFiltro(e.target.value)}
            placeholder="Ex: 2025"
          />
        </div>

        {/* 2) Campo Tipo + Projetos com Aporte */}
        <div className="d-flex align-items-center gap-2 flex-wrap" style={{ paddingBottom: 2 }}>
          <label htmlFor="tipoFiltro" style={{ fontSize: '.875rem', color: '#64748b', fontWeight: 600 }}>
            Tipo
          </label>
          <select
            id="tipoFiltro"
            className="form-select form-select-sm"
            style={{ maxWidth: 240 }}
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
          >
            <option value="Bibliográfica">Bibliográfica</option>
            <option value="Técnica/Inovação">Técnica/Inovação</option>
            <option value="Financiamento">Projetos com Aporte</option>
            <option value="Todos">Todos</option>
          </select>
        </div>


      </div>

      <div className="mx-4 producoes-list-card" style={{ position: 'relative' }}>
        {(carregandoLista || carregandoPagina) && (

          <div className="producoes-loading">
            <div
              className="spinner-border"
              role="status"
              style={{ color: 'var(--lncc-blue)', width: 28, height: 28 }}
            >
              <span className="visually-hidden">Carregando...</span>
            </div>
            <p className="mt-2 mb-0" style={{ color: '#64748b', fontWeight: 600 }}>
              Carregando bibliografias...
            </p>
            <p className="mb-0" style={{ color: '#94a3b8', fontSize: '.875rem' }}>
              Por favor, aguarde enquanto buscamos os dados
            </p>
          </div>
        )}

        {erroLista && !carregandoLista && !carregandoPagina && (

          <div className="p-4" style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
            <p className="mb-0" style={{ color: '#b91c1c', fontWeight: 700 }}>
              ⚠️ {erroLista}
            </p>
          </div>
        )}

        {!carregandoLista && !carregandoPagina && !erroLista && listaProducoes.length === 0 && (

          <div className="producoes-empty">
            <p className="mb-1" style={{ color: '#64748b', fontWeight: 600 }}>
              Nenhuma produção encontrada
            </p>
            <p className="mb-0" style={{ color: '#94a3b8', fontSize: '.875rem' }}>
              Verifique se existem dados no banco de dados
            </p>
          </div>
        )}

        {!carregandoLista && !carregandoPagina && Array.isArray(listaProducoes) && listaProducoes.length > 0 && (

          <div className="producoes-list-header-divider">

            {producoesVisiveis.map((item, index) => {
              const itemId = item && item.id ? item.id : `producao-${index}`;

              return (
                <article key={itemId} className="producoes-item-card">
                  <div className="d-flex align-items-start justify-content-between gap-3">
                    <span className="producoes-type-badge">{(item && item.tipo) || 'Outros'}</span>
                  </div>

                  <h4 className="producoes-title producoes-title-single-line">
                    {(item && item.titulo) || 'Título não informado'}
                  </h4>

                  <p className="producoes-meta">
                    {(item && item.autores) || 'Autores não registrados'}
                    <span className="producoes-meta-sep">•</span>
                    {(item && item.ano) || 'Ano N/A'}
                  </p>
                </article>
              );
            })}

          
            {total > pageSize && (

              <div className="producoes-pagination" style={{ padding: '0 1.5rem 1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ border: '1px solid rgba(15,23,42,.15)', color: '#0f172a' }}
                  onClick={() => setOffset((prev) => Math.max(0, prev - pageSize))}
                  disabled={offset === 0 || carregandoPagina}
                >
                  Anterior
                </button>

                <span style={{ margin: '0 0.75rem', color: '#64748b', fontWeight: 700 }}>
                  Página {Math.floor(offset / pageSize) + 1} de {Math.ceil(total / pageSize)}
                </span>

                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ border: '1px solid rgba(15,23,42,.15)', color: '#0f172a' }}
                  onClick={() => setOffset((prev) => prev + pageSize)}
                  disabled={!hasMore || carregandoPagina}
                >
                  Próxima
                </button>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
};


export default Producoes;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardCards from '../components/DashboardCards';
import api from '../services/api';
import './Producoes.css';
import useDebouncedValue from '../hooks/useDebouncedValue';

const stripPrefix = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/^(t[ií]tulo|titulo|pesquisa|nome|autor(es)?)[\s:–—-]+/i, '').trim();
};

const isNameString = (value) => {
  if (!value || typeof value !== 'string') return false;
  const normalized = value.trim();
  return /[,;]|\s+e\s+|\s+and\s+/i.test(normalized) || /^[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+$/.test(normalized);
};

const removeAuthorSuffix = (value, authorsValue) => {
  if (!value || typeof value !== 'string') return '';
  let result = value.trim();

  if (authorsValue && typeof authorsValue === 'string') {
    const authorNormalized = authorsValue.trim();
    const idx = result.toLowerCase().indexOf(authorNormalized.toLowerCase());
    if (idx > 0) {
      result = result.slice(0, idx).trim();
    }
  }

  result = result.replace(/\s*\((?:por|by)\s+[^)]+\)$/i, '').trim();
  result = result.replace(/\s+(?:por|by)\s+.+$/i, '').trim();
  result = result.replace(/\s*[-–—]\s*[A-ZÀ-Ú][^\-–—|:]+$/i, '').trim();
  result = result.replace(/\s*[|:]\s*[A-ZÀ-Ú][^\-–—|:]+$/i, '').trim();
  return result;
};

const shouldCutAtPeriod = (after) => {
  if (!after || typeof after !== 'string') return false;
  const normalized = after.trim();
  if (/^(por|by|autor(es)?|nome|participantes?)\b/i.test(normalized)) return true;
  if (/[,;]|\s+e\s+|\s+and\s+/i.test(normalized)) return true;
  if (/^[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+/.test(normalized)) return true;
  if (normalized.length < 40 && /[A-ZÀ-Ú]/.test(normalized)) return true;
  return false;
};

const extractTitleUntilPeriod = (value) => {
  if (!value || typeof value !== 'string') return value;
  const cleaned = value.trim();
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex <= 0) return cleaned;
  const before = cleaned.slice(0, dotIndex).trim();
  const after = cleaned.slice(dotIndex + 1).trim();
  if (shouldCutAtPeriod(after)) {
    return before;
  }
  return cleaned;
};

const formatResearchTitle = (value, authorsValue) => {
  let cleaned = stripPrefix(value);
  if (!cleaned) return 'Título não informado';

  cleaned = removeAuthorSuffix(cleaned, authorsValue);
  cleaned = extractTitleUntilPeriod(cleaned);

  const separators = [' | ', ' - ', ' — ', ':'];
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const parts = cleaned.split(sep).map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2 && isNameString(parts[1])) {
        return parts[0];
      }
      if (parts.length >= 2 && parts[0].length > 10) {
        return parts[0];
      }
    }
  }

  return cleaned;
};

const formatAuthorNames = (value) => {
  const cleaned = stripPrefix(value);
  if (!cleaned) return 'Autores não registrados';

  const separators = [' | ', ' - ', ' — ', ':'];
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const parts = cleaned.split(sep).map((part) => part.trim()).filter(Boolean);
      const namePart = parts.find(isNameString);
      if (namePart) return namePart;
      if (parts.length > 1) return parts[parts.length - 1];
    }
  }

  return cleaned;
};

const Producoes = () => {
  const [listaProducoes, setListaProducoes] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState(null);

  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [anoFiltro, setAnoFiltro] = useState('');
  const [filtroAporte, setFiltroAporte] = useState(false);

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
      has_funding: filtroAporte ? true : null,
    }),
    [tipoFiltro, anoParam, filtroAporte]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoFiltro, anoParam, filtroAporte]);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setOffset((prev) => prev + pageSize);
  }, [hasMore, pageSize]);

  useEffect(() => {
    if (offset === 0) return;
    fetchPage({ reset: false });
  }, [offset, fetchPage]);

  // Paginação é controlada apenas pelos botões (sem scroll automático)
  const producoesVisiveis = listaProducoes;




  return (
    <div className="py-4">
      <DashboardCards />


      <div className="mx-4 producoes-filtros">
          <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div>
            <h3 className="h4 mb-0 fw-semibold" style={{ color: '#0f172a' }}>
              Produções
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
            <option value="Todos">Todos</option>
          </select>

          <div className="form-check" style={{ marginLeft: 4 }}>
            <input
              id="filtroAporte"
              className="form-check-input"
              type="checkbox"
              checked={filtroAporte}
              onChange={(e) => setFiltroAporte(e.target.checked)}
            />
            <label
              htmlFor="filtroAporte"
              className="form-check-label"
              style={{ fontSize: '.875rem', color: '#64748b', fontWeight: 600 }}
            >
              Projetos com Aporte
            </label>
          </div>
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
                    <div className="d-flex flex-column gap-2">
                      <span className="producoes-type-badge">{(item && item.tipo) || 'Outros'}</span>
                      {item && item.subtipo && (
                        <span style={{ fontSize: '.75rem', color: '#64748b', fontWeight: 500 }}>
                          {item.subtipo}
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="producoes-title producoes-title-single-line">
                    {formatResearchTitle(item?.titulo, item?.autores)}
                  </h4>

                  <p className="producoes-meta">
                    {formatAuthorNames(item?.autores)}
                  </p>

                  <p className="producoes-meta">
                    <span style={{ fontWeight: 600 }}>Ano:</span>
                    <span className="producoes-meta-sep">•</span>
                    {(item && item.ano) || 'N/A'}
                  </p>

                  {item && item.local_publicacao && (
                    <div className="producoes-meta-details">
                      <div className="producoes-meta-details-item">
                        <span className="producoes-meta-details-label">Local:</span> {item.local_publicacao}
                      </div>
                    </div>
                  )}
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

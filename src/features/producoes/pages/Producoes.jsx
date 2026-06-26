import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardCards from '../../dashboard/components/DashboardCards';
import ProductionYearChart from '../components/ProductionYearChart';
import api from '../services/api';
import './Producoes.css';
import useDebouncedValue from '../hooks/useDebouncedValue';

const Producoes = () => {
  const [listaProducoes, setListaProducoes] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState(null);

  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [subtipoFiltro, setSubtipoFiltro] = useState('Todos');
  const [anoFiltro, setAnoFiltro] = useState('');

  const [subtiposDisponveis, setSubtiposDisponveis] = useState([]);
  const [carregandoSubtipos, setCarregandoSubtipos] = useState(false);

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
      subtipo: subtipoFiltro === 'Todos' ? null : subtipoFiltro,
      ano: anoParam,
    }),
    [tipoFiltro, subtipoFiltro, anoParam]
  );

  useEffect(() => {
    const buscarSubtipos = async () => {
      setCarregandoSubtipos(true);
      try {
        const res = await api.get('/api/producoes/subtipos', {
          params: {
            tipo: tipoFiltro === 'Todos' ? null : tipoFiltro,
          },
        });
        console.log('Subtipos recebidos:', res.data?.subtipos);
        setSubtiposDisponveis(res.data?.subtipos || []);
        
        if (subtipoFiltro !== 'Todos' && !res.data?.subtipos?.includes(subtipoFiltro)) {
          setSubtipoFiltro('Todos');
        }
      } catch (err) {
        console.error('Erro ao buscar subtipos:', err);
        setSubtiposDisponveis([]);
      } finally {
        setCarregandoSubtipos(false);
      }
    };

    buscarSubtipos();
  }, [tipoFiltro]);

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
        console.log('Enviando params:', params);
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

  useEffect(() => {
    fetchPage({ reset: true });
  }, [tipoFiltro, subtipoFiltro, anoParam]);

  useEffect(() => {
    if (offset === 0) return;
    fetchPage({ reset: false });
  }, [offset, fetchPage]);

  const producoesVisiveis = listaProducoes;

  const formatarTipo = (tipo) => {
    if (!tipo) return tipo;
    const tipoMap = {
      'Bibliografica': 'Bibliográfica',
      'Tecnica/Inovacao': 'Técnica/Inovação',
      'Projetos com Aporte': 'Projetos com Aporte'
    };
    return tipoMap[tipo] || tipo;
  };

  const getTipoBadgeColor = (tipo) => {
    switch (tipo) {
      case 'Bibliografica':
        return { bg: '#e0e7ff', text: '#3730a3' };
      case 'Tecnica/Inovacao':
      case 'Técnica/Inovação':
        return { bg: '#fce7f3', text: '#9f1239' };
      case 'Projetos com Aporte':
        return { bg: '#dcfce7', text: '#166534' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const getSubtipoBadgeColor = () => {
    return { bg: '#dbeafe', text: '#0369a1' };
  };

  return (
    <div style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
      <DashboardCards />

      <ProductionYearChart tipo={tipoFiltro} subtipo={subtipoFiltro} ano={anoFiltro} />

      <div style={{ marginLeft: '1rem', marginRight: '1rem', marginTop: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginTop: '-1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: 0, fontWeight: 600, color: '#0f172a' }}>
              Filtro de Produções
            </h3>
          </div>
        </div>

        {/* Container para os filtros lado a lado */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {/* Campo Ano */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="anoFiltro" style={{ fontSize: '.875rem', color: '#64748b', fontWeight: 600 }}>
              Ano
            </label>
            <input
              id="anoFiltro"
              type="number"
              style={{
                maxWidth: 140,
                padding: '0.375rem 0.5rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontFamily: 'inherit'
              }}
              value={anoFiltro}
              onChange={(e) => setAnoFiltro(e.target.value)}
              placeholder="Ex: 2025"
            />
          </div>

          {/* Campo Tipo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="tipoFiltro" style={{ fontSize: '.875rem', color: '#64748b', fontWeight: 600 }}>
              Tipo
            </label>
            <select
              id="tipoFiltro"
              style={{
                maxWidth: 280,
                padding: '0.375rem 0.5rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontFamily: 'inherit'
              }}
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
            >
              <option value="Todos">Todos</option>
              <option value="Bibliografica">Bibliográfica</option>
              <option value="Tecnica/Inovacao">Técnica/Inovação</option>
              <option value="financiamento">Projetos com Aporte</option>
            </select>
          </div>

          {/* Campo Subtipo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="subtipoFiltro" style={{ fontSize: '.875rem', color: '#64748b', fontWeight: 600 }}>
              Subtipo {carregandoSubtipos && <small>(carregando...)</small>}
            </label>
            <select
              id="subtipoFiltro"
              style={{
                maxWidth: 380,
                padding: '0.375rem 0.5rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontFamily: 'inherit'
              }}
              value={subtipoFiltro}
              onChange={(e) => setSubtipoFiltro(e.target.value)}
              disabled={carregandoSubtipos || subtiposDisponveis.length === 0}
            >
              <option value="Todos">Todos ({subtiposDisponveis.length})</option>
              {subtiposDisponveis && subtiposDisponveis.length > 0 ? (
                subtiposDisponveis.map((subtipo) => (
                  <option key={subtipo} value={subtipo}>
                    {subtipo}
                  </option>
                ))
              ) : (
                <option disabled>Carregando subtipos...</option>
              )}
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginLeft: '1rem', marginRight: '1rem', marginTop: '1rem', backgroundColor: '#ffffff', border: '1px solid rgba(15,23,42,.08)', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,.04)', overflow: 'hidden', position: 'relative' }}>
        {(carregandoLista || carregandoPagina) && (
          <div style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
            <div style={{ borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: 'var(--lncc-blue)', width: 28, height: 28, animation: 'spin 1s linear infinite', display: 'inline-block' }}>
              <span style={{ display: 'none' }}>Carregando...</span>
            </div>
            <p style={{ marginTop: '0.5rem', marginBottom: 0, color: '#64748b', fontWeight: 600 }}>
              Carregando produções...
            </p>
            <p style={{ marginBottom: 0, color: '#94a3b8', fontSize: '.875rem', marginTop: '0.25rem' }}>
              Por favor, aguarde enquanto buscamos os dados
            </p>
          </div>
        )}

        {erroLista && !carregandoLista && !carregandoPagina && (
          <div style={{ padding: '1rem', background: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
            <p style={{ marginBottom: 0, color: '#b91c1c', fontWeight: 700 }}>
              ⚠️ {erroLista}
            </p>
          </div>
        )}

        {!carregandoLista && !carregandoPagina && !erroLista && listaProducoes.length === 0 && (
          <div style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
            <p style={{ marginBottom: '0.25rem', color: '#64748b', fontWeight: 600, margin: 0 }}>
              Nenhuma produção encontrada
            </p>
            <p style={{ marginBottom: 0, color: '#94a3b8', fontSize: '.875rem', marginTop: '0.25rem' }}>
              Verifique se existem dados no banco de dados com os filtros selecionados
            </p>
          </div>
        )}

        {!carregandoLista && !carregandoPagina && Array.isArray(listaProducoes) && listaProducoes.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(15,23,42,.06)' }}>
            {producoesVisiveis.map((item, index) => {
              const itemId = item && item.id ? item.id : `producao-${index}`;
              const tipoBadgeColor = getTipoBadgeColor(item?.tipo);
              const subtipoBadgeColor = getSubtipoBadgeColor();

              return (
                <article key={itemId} style={{
                  padding: '1.25rem 1.5rem',
                  borderBottom: '4px solid #cbd5e1',
                  background: 'linear-gradient(180deg, rgba(248,250,252,.55), rgb(255, 255, 255))',
                  cursor: 'pointer'
                }}>
                  {/* Badges */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <span style={{
                      backgroundColor: tipoBadgeColor.bg,
                      color: tipoBadgeColor.text,
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '0.25rem',
                      fontWeight: 600
                    }}>
                      {formatarTipo((item && item.tipo) || 'Tipo')}
                    </span>
                    
                    {item?.subtipo && (
                      <span style={{
                        backgroundColor: subtipoBadgeColor.bg,
                        color: subtipoBadgeColor.text,
                        fontSize: '0.75rem',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '0.25rem',
                        fontWeight: 600
                      }}>
                        {item.subtipo}
                      </span>
                    )}
                  </div>

                  {/* Título */}
                  <h4 style={{
                    marginTop: '0.375rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    lineHeight: 1.2,
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                    margin: 0,
                    marginBottom: '0.5rem'
                  }}>
                    {(item && item.titulo) || 'Título não informado'}
                  </h4>

                  {/* Meta */}
                  <p style={{
                    margin: 0,
                    color: '#64748b',
                    fontSize: '.875rem'
                  }}>
                    <span style={{ display: 'inline-block', width: '.45rem', textAlign: 'center', color: '#cbd5e1' }}>•</span>
                    {(item && item.ano) || 'Ano N/A'}
                  </p>
                </article>
              );
            })}

            {total > pageSize && (
              <div style={{ padding: '1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{
                    border: '1px solid rgba(15,23,42,.15)',
                    color: '#0f172a',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.25rem',
                    backgroundColor: '#ffffff',
                    cursor: offset === 0 || carregandoPagina ? 'not-allowed' : 'pointer',
                    opacity: offset === 0 || carregandoPagina ? 0.5 : 1
                  }}
                  onClick={() => setOffset((prev) => Math.max(0, prev - pageSize))}
                  disabled={offset === 0 || carregandoPagina}
                >
                  Anterior
                </button>

                <span style={{ color: '#64748b', fontWeight: 700 }}>
                  Página {Math.floor(offset / pageSize) + 1} de {Math.ceil(total / pageSize)}
                </span>

                <button
                  type="button"
                  style={{
                    border: '1px solid rgba(15,23,42,.15)',
                    color: '#0f172a',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '0.25rem',
                    backgroundColor: '#ffffff',
                    cursor: !hasMore || carregandoPagina ? 'not-allowed' : 'pointer',
                    opacity: !hasMore || carregandoPagina ? 0.5 : 1
                  }}
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

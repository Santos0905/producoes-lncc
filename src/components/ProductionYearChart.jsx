import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

const ProductionYearChart = ({ tipo, subtipo, ano }) => {
  const [chartData, setChartData] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const fetchYearData = async () => {
      setCarregando(true);
      setErro(null);
      try {
        // Busca todas as produções sem paginação para agrupar por ano
        const res = await api.get('/api/producoes/por-ano', {
          params: {
            tipo: tipo === 'Todos' ? null : tipo,
            subtipo: subtipo === 'Todos' ? null : subtipo,
            ano: ano && ano !== '' ? Number(ano) : null,
          },
        });

        const anos = res.data?.dados || [];
        
        // Calcula o acumulado
        let acumulado = 0;
        const dataFormatada = anos
          .sort((a, b) => a.ano - b.ano)
          .map((item) => {
            acumulado += item.total;
            return {
              ano: item.ano,
              total: item.total,
              acumulado: acumulado,
            };
          });

        setChartData(dataFormatada);
      } catch (err) {
        console.error('Erro ao buscar dados do gráfico:', err);
        setErro('Erro ao carregar dados do gráfico');
        setChartData([]);
      } finally {
        setCarregando(false);
      }
    };

    fetchYearData();
  }, [tipo, subtipo, ano]);

  if (carregando) {
    return (
      <div className="mx-4" style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '0.5rem', marginBottom: '2rem' }}>
        <div className="spinner-border" role="status" style={{ color: 'var(--lncc-blue)', width: 24, height: 24 }}>
          <span className="visually-hidden">Carregando gráfico...</span>
        </div>
        <p className="mt-2 mb-0" style={{ color: '#64748b', fontWeight: 600 }}>
          Carregando gráfico de produções...
        </p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="mx-4" style={{ padding: '1.5rem', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', marginBottom: '2rem', borderRadius: '0.5rem' }}>
        <p className="mb-0" style={{ color: '#b91c1c', fontWeight: 700 }}>
          ⚠️ {erro}
        </p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="mx-4" style={{ padding: '1.5rem', backgroundColor: '#f1f5f9', textAlign: 'center', marginBottom: '2rem', borderRadius: '0.5rem' }}>
        <p className="mb-0" style={{ color: '#64748b', fontWeight: 600 }}>
          Sem dados disponíveis para o período selecionado
        </p>
      </div>
    );
  }

  return (
    <div className="mx-4" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 className="h5 mb-0 fw-semibold" style={{ color: '#0f172a' }}>
          Total Acumulativo de Produções por Ano
        </h3>
      </div>
      
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="ano"
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '0.5rem',
              padding: '0.75rem',
            }}
            labelStyle={{ color: '#0f172a', fontWeight: 600 }}
            formatter={(value) => value.toLocaleString('pt-BR')}
          />
          <Legend
            wrapperStyle={{ paddingTop: '1rem' }}
          />
          <Bar
            dataKey="total"
            fill="#ef7d5c"
            name="Produções do Ano"
          />
          <Bar
            dataKey="acumulado"
            fill="#3b82f6"
            name="Total Acumulado"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductionYearChart;

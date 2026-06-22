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
        const res = await api.get('/api/producoes/por-ano', {
          params: {
            tipo: tipo === 'Todos' ? null : tipo,
            subtipo: subtipo === 'Todos' ? null : subtipo,
            ano: ano && ano !== '' ? Number(ano) : null,
          },
        });

        const anos = res.data?.dados || [];
        
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
      <div style={{ marginLeft: '1rem', marginRight: '1rem', padding: '2rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '0.5rem', marginBottom: '2rem' }}>
        <div style={{ borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: 'var(--lncc-blue)', width: 24, height: 24, animation: 'spin 1s linear infinite', display: 'inline-block' }}>
          <span style={{ display: 'none' }}>Carregando gráfico...</span>
        </div>
        <p style={{ marginTop: '0.5rem', marginBottom: 0, color: '#64748b', fontWeight: 600 }}>
          Carregando gráfico de produções...
        </p>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={{ marginLeft: '1rem', marginRight: '1rem', padding: '1.5rem', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', marginBottom: '2rem', borderRadius: '0.5rem' }}>
        <p style={{ marginBottom: 0, color: '#b91c1c', fontWeight: 700 }}>
          ⚠️ {erro}
        </p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div style={{ marginLeft: '1rem', marginRight: '1rem', padding: '1.5rem', backgroundColor: '#f1f5f9', textAlign: 'center', marginBottom: '2rem', borderRadius: '0.5rem' }}>
        <p style={{ marginBottom: 0, color: '#64748b', fontWeight: 600 }}>
          Sem dados disponíveis para o período selecionado
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: '1rem', marginRight: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 0, fontWeight: 600, color: '#0f172a' }}>
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

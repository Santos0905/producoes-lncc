import { useEffect, useState } from 'react';
import DashboardCards from '../components/DashboardCards';
import api from '../services/api';

const Producoes = () => {
  const [listaProducoes, setListaProducoes] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);

  useEffect(() => {
    let isMounted = true;

    api.get('/api/producoes/lista')
      .then(res => {
        if (!isMounted) return;
        console.log("DADOS EXATOS DA LISTA RECEBIDOS DO BACKEND DOCKER:", res.data);

        if (res.data && Array.isArray(res.data)) {
          setListaProducoes(res.data);
        } else if (res.data && Array.isArray(res.data.producoes)) {
          setListaProducoes(res.data.producoes);
        } else if (res.data && Array.isArray(res.data.data)) {
          setListaProducoes(res.data.data);
        } else {
          console.error("A API não retornou um formato de lista esperado (Array):", res.data);
          setListaProducoes([]);
        }
        setCarregandoLista(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error("Erro ao buscar produções no backend:", err);
        setListaProducoes([]);
        setCarregandoLista(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 py-4">
      <DashboardCards />

      <div className="mx-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          
          {/* ⚠️ O bloco com o texto "Carregando listagem de produções..." foi completamente removido daqui */}

          {!carregandoLista && Array.isArray(listaProducoes) && listaProducoes.map((item, index) => {
            const itemId = item && item.id ? item.id : `producao-${index}`;

            return (
              <div key={itemId} className="p-6 hover:bg-gray-50/80 transition-colors duration-150">
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                  {(item && item.tipo) || 'Outros'}
                </span>

                <h4 className="mt-2.5 text-base font-semibold text-gray-900 leading-snug">
                  {(item && item.titulo) || 'Título não informado'}
                </h4>

                <p className="text-sm text-gray-500 mt-1.5 m-0">
                  {(item && item.autores) || 'Autores não registrados'}{' '}
                  <span className="text-gray-300 mx-1.5">•</span>{' '}
                  {(item && item.ano) || 'Ano N/A'}
                </p>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
};

export default Producoes;
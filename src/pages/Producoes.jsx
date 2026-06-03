import { useEffect, useState } from 'react';
import DashboardCards from '../components/DashboardCards';
import api from '../services/api';

const Producoes = () => {
  const [listaProducoes, setListaProducoes] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState(null);

  useEffect(() => {
    let isMounted = true;

    setCarregandoLista(true);
    setErroLista(null);

    api.get('/api/producoes/lista')
      .then(res => {
        if (!isMounted) return;
        console.log("DADOS EXATOS DA LISTA RECEBIDOS DO BACKEND DOCKER:", res.data);

        if (Array.isArray(res.data)) {
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
        setErroLista("Erro ao carregar a lista de produções. Verifique a conexão com o backend.");
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
          
          {carregandoLista && (
            <div className="p-8 text-center">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
              </div>
              <p className="text-gray-600 font-medium">Carregando produções...</p>
              <p className="text-sm text-gray-500 mt-1">Por favor, aguarde enquanto buscamos os dados</p>
            </div>
          )}

          {erroLista && !carregandoLista && (
            <div className="p-6 bg-red-50 border-l-4 border-red-500">
              <p className="text-red-700 font-medium">⚠️ {erroLista}</p>
            </div>
          )}

          {!carregandoLista && !erroLista && listaProducoes.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-gray-500 font-medium">Nenhuma produção encontrada</p>
              <p className="text-sm text-gray-400 mt-1">Verifique se existem dados no banco de dados</p>
            </div>
          )}

          {!carregandoLista && Array.isArray(listaProducoes) && listaProducoes.length > 0 && listaProducoes.map((item, index) => {
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

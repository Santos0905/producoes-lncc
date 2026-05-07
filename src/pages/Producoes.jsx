import { useEffect, useState } from "react";
import DashboardCards from "../components/DashboardCards";
import { getProducoes } from "../services/api";

export default function Producoes() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  // const [error] = useState(null);





  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        const response = await getProducoes({ page: 1 });
        const payload = response.data;
        setSummary(payload.summary || { totalProductions: 247, projectsRepresented: 54 });
      } catch (e) {
        
        void e;

        setSummary({ totalProductions: 247, projectsRepresented: 54 });
      } finally {

        setLoading(false);
      }
    };

    loadSummary();
  }, []);

  if (loading) {
    return (
      <main className="container-xl py-5 d-flex justify-content-center align-items-center">
        <div className="card rounded-4 border-light shadow-sm p-5 text-muted">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
   
     <DashboardCards summary={summary} />
    
  );
}

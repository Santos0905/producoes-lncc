export default function DashboardCards({ summary = {} }) {
  const cardsData = [
    {  
      value: summary.totalProductions || 247, 
      type: 'Produções Totais',
      subtitle: 'Todas produções registradas no sistema'
    },
    {  
      value: 178, 
      type: 'Total de Produções Bibliográficas',
      subtitle: 'Artigos, livros e trabalhos completos'
    },
    {  
      value: summary.projectsRepresented || 54, 
      type: 'Projetos com Aporte de Agências e Fomento a Empresas',
      subtitle: 'Com financiamento de agências empresariais'
    },
    {  
      value: 70, 
      type: 'Total de Produções Técnicas e de Inovação',
      subtitle: 'Teses, dissertações e produções técnicas'
    },
  ];

  return (
    <section className="row g-4 mb-4 align-items-stretch">
      {cardsData.map((card, index) => (
        <div key={index} className="col-12 col-md-6 col-lg-5 col-xl-3">
          <article
            className="card h-100 border-0 shadow-lg p-3 text-center card-hover"
            style={{ minHeight: '100px', borderRadius: '1.25rem', backgroundColor: '#f0f0f0' }}
          >
            <div className="mb-2">
              <span
                className="badge bg-primary px-3 py-2 fs-6 fw-semibold mb-4 text-wrap"
                style={{ lineHeight: 1.1 }}
              >
                {card.type}
              </span>
            </div>

            <p className="display-6 fw-black text-dark mb-2 lh-1">
              {card.value.toLocaleString()}
            </p>

            <p className="h6 fw-semibold text-muted lh-lg mb-1">{card.subtitle}</p>
          </article>
        </div>
      ))}
    </section>
  );
}

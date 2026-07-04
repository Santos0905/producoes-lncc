# Painel de Produções - LNCC SDumont

Documentação simplificada do projeto dashboard React + Vite para exibição e gerenciamento de produções intelectuais do LNCC.

---

## 📋 Visão Geral

- **Stack**: React 18 + Vite + Bootstrap 5.3.3 CDN
- **Padrão**: Feature-Based Architecture (Cascata)
- **Estilização**: Inline styles + Bootstrap classes (sem Tailwind)
- **Gráficos**: Recharts (bar chart apenas)
- **HTTP Client**: Axios

---

## 🗂️ Estrutura do Projeto

```
src/
├── features/
│   ├── dashboard/
│   │   └── components/
│   │       ├── DashboardCards.jsx          # Cards de estatísticas
│   │       └── DashboardCards.css
│   ├── producoes/
│   │   ├── components/
│   │   │   └── ProductionYearChart.jsx     # Gráfico de barras por ano
│   │   ├── pages/
│   │   │   ├── Producoes.jsx               # Página principal com filtros e lista
│   │   │   └── Producoes.css
│   │   ├── hooks/
│   │   │   └── useDebouncedValue.js        # Debounce para input de ano
│   │   └── services/
│   │       └── api.js                      # Cliente Axios
│   └── services/
│       └── api.js                          # Importado pela pasta producoes
├── App.jsx                                  # Componente raiz
└── index.css                                # Estilos globais
```

---

## 🎨 Cores Principais

| Cor | Valor | Uso |
|-----|-------|-----|
| LNCC Blue | `#004a8d` | Primary, headers |
| Background | `#F4F3F0` | Fundo geral |
| Dividers | `#cbd5e1` | Separadores entre items |
| Text Dark | `#0f172a` | Textos principais |

---

## 🔌 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/producoes/totais` | Totais por tipo |
| GET | `/api/producoes/por-ano` | Produções agrupadas por ano |
| GET | `/api/producoes/subtipos` | Lista de subtipos (filtrado por tipo) |
| GET | `/api/producoes/pagina` | Produções paginadas com filtros |

### Query Params (Paginação)
- `limit`: número de itens por página (padrão: 10)
- `offset`: posição inicial (padrão: 0)
- `tipo`: filtro opcional (ex: "Bibliografica")
- `subtipo`: filtro opcional
- `ano`: filtro opcional (número)

---

## 🖼️ Componentes Principais

### DashboardCards
- Exibe 4 cards com estatísticas totais
- Faz requisição a `/api/producoes/totais`
- Estilizado com cores por tipo

### ProductionYearChart
- Gráfico de barras (Recharts)
- Dados de `/api/producoes/por-ano`
- Responsivo e interativo

### Producoes (Página)
- Filtros: Ano (input), Tipo (select), Subtipo (select)
- Lista paginada com scroll
- Badges de tipo/subtipo por item
- Paginação com botões Anterior/Próxima

---

## ⚙️ Componentes de Suporte

### useDebouncedValue
Hook customizado para debounce em inputs (delay: 250ms)
```javascript
const debouncedValue = useDebouncedValue(value, delayMs)
```

### api.js (Axios)
Cliente HTTP configurado:
```javascript
const api = axios.create({
  baseURL: 'http://localhost:8000'
})
```

---

## 🚀 Comandos

```bash
# Desenvolvimento
npm run dev

# Build produção
npm run build

# Preview da build
npm run preview
```

---

## 📱 Responsividade

- Filtros flexíveis em linha (quebram em mobile)
- Lista de produções responsiva
- Gráfico adapta-se ao container
- Cards de dashboard empilham em telas pequenas

---

## 🎯 Tipos de Produção

| Tipo | Cor Badge | Código |
|------|-----------|--------|
| Bibliográfica | Azul (#e0e7ff) | `Bibliografica` |
| Técnica/Inovação | Rosa (#fce7f3) | `Tecnica/Inovacao` |
| Projetos com Aporte | Verde (#dcfce7) | `financiamento` |

---

## 📦 Dependências Principais

- `react`: 18+
- `axios`: HTTP client
- `recharts`: Gráficos
- `vite`: Build tool

---

## 🔧 Configuração Local

1. Backend esperado em: `http://localhost:8000/api`
2. Bootstrap carregado via CDN em `index.html`
3. Variável CSS `--lncc-blue` definida em `index.css`

---

## 📝 Estilo de Código

- **Inline styles**: Preferência geral para estilos React
- **CSS arquivos**: Apenas para animações complexas (ex: `@keyframes spin`)
- **Bootstrap**: Classes utilitárias apenas (`d-flex`, `gap-*`, etc)
- **Sem Tailwind**: Completamente removido do projeto

---

## 🐛 Debug Comum

### Produções não carregam
- Verificar se backend está rodando em `http://localhost:8000`
- Abrir DevTools → Network → verificar requisições a `/api/producoes/*`

### Subtipos vazios
- Confirmar que endpoint `/api/producoes/subtipos` retorna array

### Gráfico em branco
- Validar que `/api/producoes/por-ano` retorna dados com campos `ano` e `total`

---

## 📄 Último Update

Estrutura final com container branco para lista, linhas divisórias de 4px entre items, e paginação centralizada.

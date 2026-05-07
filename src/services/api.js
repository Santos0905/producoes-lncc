import dataset from "../data/lncc-data.json";

const PAGE_SIZE = 12;
const SIMULATED_DELAY_MS = 120;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeSearch(value) {
  return value.trim().toLowerCase();
}

function matchesFilters(item, filters) {
  const query = normalizeSearch(filters.query || "");

  if (query) {
    const searchableText = [
      item.projectTitle,
      item.description,
      item.coordinatorName,
      item.institutionName,
      ...(item.knowledgeAreas || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!searchableText.includes(query)) {
      return false;
    }
  }

  if (filters.year && String(item.year) !== String(filters.year)) {
    return false;
  }

  if (filters.type && item.type !== filters.type) {
    return false;
  }

  if (filters.state && item.state !== filters.state) {
    return false;
  }

  return true;
}

export async function getDashboardData() {
  await wait(SIMULATED_DELAY_MS);

  return {
    data: {
      summary: dataset.summary,
      dashboard: dataset.dashboard,
    },
  };
}

export async function getProducoes(filters = {}) {
  await wait(SIMULATED_DELAY_MS);

  const currentPage = Math.max(Number(filters.page) || 1, 1);
  const filteredProductions = dataset.productions.filter((item) =>
    matchesFilters(item, filters),
  );

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const pageItems = filteredProductions.slice(startIndex, endIndex);

  return {
    data: {
      data: pageItems,
      page: currentPage,
      pageSize: PAGE_SIZE,
      total: filteredProductions.length,
      filters: dataset.productionView.filters,
      summary: dataset.productionView.summary,
      recentProductions: dataset.productionView.recentProductions,
      productionTypes: dataset.productionView.productionTypes,
    },
  };
}

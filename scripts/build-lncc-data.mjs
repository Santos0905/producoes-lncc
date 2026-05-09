import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dumpPath = path.join(rootDir, "projeto", "mysql", "dump", "backup.sql");
const outputPath = path.join(rootDir, "src", "data", "lncc-data.json");

const BIBLIOGRAPHIC_TYPE_LABELS = {
  APP: "Artigos completos",
  AAP: "Artigos aceitos",
  LC: "Livros e capitulos",
  TJR: "Textos em jornais",
  TAC: "Trabalhos em anais",
  DMA: "Dissertacao em andamento",
  DMD: "Dissertacao defendida",
  TDA: "Tese em andamento",
  TDD: "Tese defendida",
  OPB: "Outras producoes",
};

function getInsertBlock(source, tableName) {
  const marker = `INSERT INTO \`${tableName}\` VALUES `;
  const startIndex = source.indexOf(marker);

  if (startIndex === -1) {
    throw new Error(`Nao foi possivel localizar dados para a tabela ${tableName}.`);
  }

  let inString = false;
  let escaped = false;
  const valuesStartIndex = startIndex + marker.length;

  for (let index = valuesStartIndex; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "'" && nextChar === "'") {
        index += 1;
        continue;
      }

      if (char === "'") {
        inString = false;
      }

      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === ";") {
      return source.slice(valuesStartIndex, index);
    }
  }

  throw new Error(`Nao foi possivel delimitar os valores da tabela ${tableName}.`);
}

function parseValue(token) {
  if (token === "NULL") {
    return null;
  }

  if (/^-?\d+(\.\d+)?$/.test(token)) {
    return Number(token);
  }

  return token
    .replace(/\\\\/g, "\\")
    .replace(/\\'/g, "'")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

function parseInsertRows(block) {
  const rows = [];
  let currentRow = [];
  let currentToken = "";
  let inString = false;
  let depth = 0;
  let escaped = false;

  for (let index = 0; index < block.length; index += 1) {
    const char = block[index];
    const nextChar = block[index + 1];

    if (inString) {
      if (escaped) {
        currentToken += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        currentToken += char;
        escaped = true;
        continue;
      }

      if (char === "'" && nextChar === "'") {
        currentToken += "'";
        index += 1;
        continue;
      }

      if (char === "'") {
        inString = false;
        continue;
      }

      currentToken += char;
      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === "(") {
      depth += 1;

      if (depth === 1) {
        currentRow = [];
        currentToken = "";
      } else {
        currentToken += char;
      }

      continue;
    }

    if (char === ")") {
      if (depth > 1) {
        currentToken += char;
      }

      depth -= 1;

      if (depth === 0) {
        currentRow.push(parseValue(currentToken.trim()));
        rows.push(currentRow);
        currentRow = [];
        currentToken = "";
      }

      continue;
    }

    if (depth === 0) {
      continue;
    }

    if (char === "," && depth === 1) {
      currentRow.push(parseValue(currentToken.trim()));
      currentToken = "";
      continue;
    }

    currentToken += char;
  }

  return rows;
}

function cleanText(value) {
  if (!value) {
    return "";
  }

  const rawText = String(value);
  const fixedText =
    /[ÃÂâ€]/.test(rawText) && !rawText.includes("�")
      ? Buffer.from(rawText, "latin1").toString("utf8")
      : rawText;

  return fixedText
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, "-")
    .replace(/&micro;/gi, "micro")
    .replace(/&pi;/gi, "pi")
    .replace(/&sup;/gi, "")
    .replace(/&sub;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function createExcerpt(text, maxLength = 220) {
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  const candidate = text.slice(0, maxLength);
  const periodIndex = candidate.lastIndexOf(". ");

  if (periodIndex >= Math.floor(maxLength * 0.5)) {
    return candidate.slice(0, periodIndex + 1).trim();
  }

  return `${candidate.trim()}...`;
}

function normalizeState(value) {
  const normalized = cleanText(value).toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
}

function compareCycle(currentCycle, nextCycle) {
  const currentCycleNumber = Number(currentCycle?.cycle ?? 0);
  const nextCycleNumber = Number(nextCycle?.cycle ?? 0);

  if (nextCycleNumber !== currentCycleNumber) {
    return nextCycleNumber - currentCycleNumber;
  }

  const currentStart = currentCycle?.startDate ? new Date(currentCycle.startDate).getTime() : 0;
  const nextStart = nextCycle?.startDate ? new Date(nextCycle.startDate).getTime() : 0;

  if (nextStart !== currentStart) {
    return nextStart - currentStart;
  }

  return Number(nextCycle?.id ?? 0) - Number(currentCycle?.id ?? 0);
}

function sortByValueDesc(left, right) {
  if (right.value !== left.value) {
    return right.value - left.value;
  }

  return left.label.localeCompare(right.label, "pt-BR");
}

function buildCountSeries(entries, limit = Infinity, aggregateOther = false) {
  const sortedEntries = [...entries].sort(sortByValueDesc);

  if (!aggregateOther || sortedEntries.length <= limit) {
    return sortedEntries.slice(0, limit);
  }

  const topEntries = sortedEntries.slice(0, limit - 1);
  const otherValue = sortedEntries
    .slice(limit - 1)
    .reduce((total, entry) => total + entry.value, 0);

  return [...topEntries, { label: "Outras", value: otherValue }];
}

async function buildDataset() {
  const source = await fs.readFile(dumpPath, "utf8");

  const institutionRows = parseInsertRows(getInsertBlock(source, "institution"));
  const departmentRows = parseInsertRows(getInsertBlock(source, "department"));
  const userRows = parseInsertRows(getInsertBlock(source, "user"));
  const projectRows = parseInsertRows(getInsertBlock(source, "project"));
  const projectCycleRows = parseInsertRows(getInsertBlock(source, "project_cycle"));
  const projectTypeRows = parseInsertRows(getInsertBlock(source, "project_type"));
  const projectStatusRows = parseInsertRows(getInsertBlock(source, "project_status"));
  const knowledgeAreaRows = parseInsertRows(getInsertBlock(source, "knowledge_area"));
  const projectKnowledgeRows = parseInsertRows(getInsertBlock(source, "project_knowledge"));
  const productionTypeRows = parseInsertRows(getInsertBlock(source, "bibliographic_production_type"));
  const productionRows = parseInsertRows(
    getInsertBlock(source, "project_bibliographic_production"),
  );

  const institutionsById = Object.fromEntries(
    institutionRows.map(([id, name, uf, type, countryId]) => [
      id,
      {
        id,
        name: cleanText(name),
        uf: normalizeState(uf),
        type,
        countryId,
      },
    ]),
  );

  const departmentsById = Object.fromEntries(
    departmentRows.map(([id, name, institutionId]) => [
      id,
      {
        id,
        name: cleanText(name),
        institutionId,
      },
    ]),
  );

  const usersById = Object.fromEntries(
    userRows.map(([uid, name, institutionId, nationality]) => [
      uid,
      {
        uid,
        name: cleanText(name),
        institutionId,
        nationality: cleanText(nationality),
      },
    ]),
  );

  const projectTypesById = Object.fromEntries(
    projectTypeRows.map(([id, name]) => [
      id,
      {
        id,
        name: cleanText(name),
      },
    ]),
  );

  const projectStatusesById = Object.fromEntries(
    projectStatusRows.map(([id, name]) => [
      String(id),
      {
        id,
        name: cleanText(name),
      },
    ]),
  );

  const knowledgeAreasById = Object.fromEntries(
    knowledgeAreaRows.map(([id, name]) => [
      id,
      {
        id,
        name: cleanText(name),
      },
    ]),
  );

  const bibliographicTypesById = Object.fromEntries(
    productionTypeRows.map(([id, fullName, code]) => [
      id,
      {
        id,
        code: cleanText(code),
        fullName: cleanText(fullName),
        label: BIBLIOGRAPHIC_TYPE_LABELS[cleanText(code)] ?? cleanText(fullName),
      },
    ]),
  );

  const latestCycleByProject = {};

  for (const [id, gid, cycle, type, status, coordinator, department, consent, startDate, endDate, concludedDate] of projectCycleRows) {
    const cycleRecord = {
      id,
      gid,
      cycle,
      type,
      status: status === null ? null : String(status),
      coordinator,
      department,
      consent,
      startDate,
      endDate,
      concludedDate,
    };

    if (!latestCycleByProject[gid] || compareCycle(latestCycleByProject[gid], cycleRecord) < 0) {
      latestCycleByProject[gid] = cycleRecord;
    }
  }

  const knowledgeByProject = {};

  for (const [gid, knowledgeId] of projectKnowledgeRows) {
    if (!knowledgeByProject[gid]) {
      knowledgeByProject[gid] = [];
    }

    const knowledgeArea = knowledgeAreasById[knowledgeId];

    if (knowledgeArea) {
      knowledgeByProject[gid].push(knowledgeArea.name);
    }
  }

  const projectsById = {};

  for (const [gid, group, title, acronym, visibility] of projectRows) {
    const cycle = latestCycleByProject[gid] ?? null;
    const coordinator = cycle?.coordinator ? usersById[cycle.coordinator] : null;
    const department = cycle?.department ? departmentsById[cycle.department] : null;
    const institution =
      (department?.institutionId && institutionsById[department.institutionId]) ||
      (coordinator?.institutionId && institutionsById[coordinator.institutionId]) ||
      null;

    const knowledgeAreas = [...new Set(knowledgeByProject[gid] ?? [])].sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );

    projectsById[gid] = {
      gid,
      group: cleanText(group),
      title: cleanText(title),
      acronym: cleanText(acronym),
      visibility: Number(visibility ?? 0),
      cycle: Number(cycle?.cycle ?? 0),
      type: projectTypesById[cycle?.type]?.name ?? "Nao classificado",
      status: projectStatusesById[cycle?.status]?.name ?? "Sem status",
      coordinatorName: cleanText(coordinator?.name),
      institutionName: cleanText(institution?.name),
      state: normalizeState(institution?.uf),
      knowledgeAreas,
      startDate: cycle?.startDate ?? null,
      endDate: cycle?.endDate ?? null,
      concludedDate: cycle?.concludedDate ?? null,
      productionsCount: 0,
    };
  }

  const publicProductions = [];

  for (const [id, projectId, typeId, description, year, isPublic] of productionRows) {
    const project = projectsById[projectId];

    if (!project || project.visibility !== 1 || Number(isPublic) !== 1) {
      continue;
    }

    const bibliographicType = bibliographicTypesById[typeId];
    const cleanedDescription = cleanText(description);

    project.productionsCount += 1;

    publicProductions.push({
      id,
      projectId,
      projectTitle: project.title,
      projectAcronym: project.acronym,
      year: Number(year),
      type: bibliographicType?.label ?? "Producao bibliografica",
      typeCode: bibliographicType?.code ?? "",
      typeFullLabel: bibliographicType?.fullName ?? "Producao bibliografica",
      state: project.state,
      institutionName: project.institutionName,
      coordinatorName: project.coordinatorName,
      knowledgeAreas: project.knowledgeAreas,
      description: cleanedDescription,
      excerpt: createExcerpt(cleanedDescription),
    });
  }

  const publicProjects = Object.values(projectsById)
    .filter((project) => project.visibility === 1)
    .sort((left, right) => left.title.localeCompare(right.title, "pt-BR"));

  publicProductions.sort((left, right) => {
    if (right.year !== left.year) {
      return right.year - left.year;
    }

    return right.id - left.id;
  });

  const stateCounts = new Map();
  const areaCounts = new Map();
  const statusCounts = new Map();
  const productionYearCounts = new Map();
  const productionTypeCounts = new Map();

  for (const project of publicProjects) {
    if (project.state) {
      stateCounts.set(project.state, (stateCounts.get(project.state) ?? 0) + 1);
    }

    statusCounts.set(project.status, (statusCounts.get(project.status) ?? 0) + 1);

    for (const area of project.knowledgeAreas) {
      areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
    }
  }

  for (const production of publicProductions) {
    productionYearCounts.set(
      String(production.year),
      (productionYearCounts.get(String(production.year)) ?? 0) + 1,
    );
    productionTypeCounts.set(
      production.type,
      (productionTypeCounts.get(production.type) ?? 0) + 1,
    );
  }

  const projectsByState = buildCountSeries(
    [...stateCounts.entries()].map(([label, value]) => ({ label, value })),
  );
  const projectsByArea = buildCountSeries(
    [...areaCounts.entries()].map(([label, value]) => ({ label, value })),
    8,
    true,
  );
  const projectsByStatus = buildCountSeries(
    [...statusCounts.entries()].map(([label, value]) => ({ label, value })),
  );
  const productionsByType = buildCountSeries(
    [...productionTypeCounts.entries()].map(([label, value]) => ({ label, value })),
    6,
    true,
  );
  const productionsByYear = [...productionYearCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => Number(left.label) - Number(right.label))
    .slice(-10);

  const activeProjects =
    statusCounts.get("Ativo") ??
    statusCounts.get("1") ??
    0;

  const dataset = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalProjects: publicProjects.length,
      activeProjects,
      totalProductions: publicProductions.length,
      latestProductionYear: publicProductions[0]?.year ?? null,
      totalKnowledgeAreas: areaCounts.size,
      totalStates: stateCounts.size,
    },
    dashboard: {
      highlights: [
        { label: "Projetos publicos", value: publicProjects.length },
        { label: "Projetos ativos", value: activeProjects },
        { label: "Producoes publicas", value: publicProductions.length },
        { label: "Areas mapeadas", value: areaCounts.size },
      ],
      charts: {
        projectsByState,
        projectsByArea,
        projectsByStatus,
        productionsByYear,
      },
    },
    productionView: {
      filters: {
        years: [...new Set(publicProductions.map((production) => production.year))]
          .sort((left, right) => right - left),
        types: [...new Set(publicProductions.map((production) => production.type))]
          .sort((left, right) => left.localeCompare(right, "pt-BR")),
        states: [...new Set(publicProductions.map((production) => production.state).filter(Boolean))]
          .sort((left, right) => left.localeCompare(right, "pt-BR")),
      },
      summary: {
        totalProductions: publicProductions.length,
        projectsRepresented: publicProjects.filter((project) => project.productionsCount > 0).length,
        latestProductionYear: publicProductions[0]?.year ?? null,
      },
      recentProductions: publicProductions.slice(0, 5),
      productionTypes: productionsByType,
    },
    projects: publicProjects,
    productions: publicProductions,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  return dataset;
}

try {
  const dataset = await buildDataset();

  console.log(
    `Dataset gerado com ${dataset.summary.totalProjects} projetos e ${dataset.summary.totalProductions} producoes em ${outputPath}`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

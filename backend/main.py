from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal, MySQLSessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

allowed_origins = [
    "http://localhost:5174",      
    "http://localhost:5173",      
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_mysql_db():
    db = MySQLSessionLocal()
    try:
        yield db
    finally:
        db.close()


def build_production_query(table_name: str, tipo_display: str, ano_filtro: int | None = None, with_pagination: bool = False, limit: int = 10, offset: int = 0):
    """
    Função única para gerar queries de produção.
    
    Args:
        table_name: Nome da tabela (ex: 'project_bibliographic_production')
        tipo_display: Tipo a exibir (ex: 'Bibliográfica')
        ano_filtro: Filtro de ano (opcional)
        with_pagination: Se True, inclui LIMIT/OFFSET
        limit: Número de registros por página
        offset: Offset da paginação
    
    Returns:
        dict com 'data_query', 'count_query', 'params'
    """
    where_conditions = ["p.public = 1"]
    
    if ano_filtro is not None:
        where_conditions.append("p.year = :ano_filtro")
    
    where_clause = " AND ".join(where_conditions)
    
    # Tenta buscar campos opcionais (se existirem, caso contrário retorna NULL)
    # Estrutura: id, titulo (description), autores (description), ano (year), tipo, subtipo, local_publicacao, impact_factor
    data_query = f"""
        SELECT
            p.id,
            p.description as titulo,
            p.description as autores,
            p.year as ano,
            '{tipo_display}' as tipo,
            NULL as subtipo,
            NULL as local_publicacao
        FROM {table_name} p
        WHERE {where_clause}
        ORDER BY ano DESC
    """
    
    if with_pagination:
        data_query += " LIMIT :limit OFFSET :offset"
    
    count_query = f"""
        SELECT COUNT(*) as cnt
        FROM {table_name} p
        WHERE {where_clause}
    """
    
    params = {}
    if ano_filtro is not None:
        params["ano_filtro"] = ano_filtro
    if with_pagination:
        params["limit"] = limit
        params["offset"] = offset
    
    return {
        "data_query": data_query,
        "count_query": count_query,
        "params": params
    }

@app.get("/api/producoes/lista")
def listar_producoes(db: Session = Depends(get_mysql_db), tipo: str | None = None, ano: int | None = None, has_funding: bool | None = None):
    """
    Lista todas as produções com filtros opcionais.
    """
    try:
        tipo_normalizado = (tipo or "").strip().lower()
        if tipo_normalizado in ["", "todos", "outros", "none", "null"]:
            tipo_normalizado = "todos"

        ano_filtro = ano if isinstance(ano, int) else None
        has_funding_filtro = has_funding

        queries_to_union = []
        all_params = {}

        # Se filtro de aporte, busca apenas tabela de financiamento
        if has_funding_filtro is True:
            q_info = build_production_query("project_funding", "Projetos com Aporte", ano_filtro, with_pagination=False)
            queries_to_union.append(q_info["data_query"])
            all_params.update(q_info["params"])
        
        # Se tipo específico (bibliográfica)
        elif tipo_normalizado == "bibliográfica":
            q_info = build_production_query("project_bibliographic_production", "Bibliográfica", ano_filtro, with_pagination=False)
            queries_to_union.append(q_info["data_query"])
            all_params.update(q_info["params"])
        
        # Se tipo específico (técnica/inovação)
        elif tipo_normalizado in ["técnica/inovação", "tecnica/inovacao", "técnica", "tecnica", "inovação", "inovacao"]:
            q_info = build_production_query("project_technical_innovation", "Técnica/Inovação", ano_filtro, with_pagination=False)
            queries_to_union.append(q_info["data_query"])
            all_params.update(q_info["params"])
        
        # Se "todos" - UNION de bibliográfica + técnica
        else:
            q_biblio = build_production_query("project_bibliographic_production", "Bibliográfica", ano_filtro, with_pagination=False)
            q_tech = build_production_query("project_technical_innovation", "Técnica/Inovação", ano_filtro, with_pagination=False)
            queries_to_union.append(q_biblio["data_query"])
            queries_to_union.append(q_tech["data_query"])
            all_params.update(q_biblio["params"])
            all_params.update(q_tech["params"])

        # Executar UNION se múltiplas queries, caso contrário executar única
        if len(queries_to_union) == 1:
            final_query = queries_to_union[0]
        else:
            final_query = " UNION ALL ".join(queries_to_union) + " ORDER BY ano DESC"

        result = db.execute(text(final_query), all_params).fetchall()

        producoes = [
            {
                "id": row[0],
                "titulo": row[1] if row[1] else "Título não informado",
                "autores": row[2] if row[2] else "Autores não registrados",
                "ano": row[3] if row[3] else "N/A",
                "tipo": row[4] if row[4] else "Outros",
                "subtipo": row[5] if row[5] else None,
                "local_publicacao": row[6] if row[6] else None,
            }
            for row in result
        ]

        print(f"[DEBUG] Retornando {len(producoes)} produções do MySQL (tipo={tipo})")
        return producoes

    except Exception as e:
        print(f"[ERROR] Erro ao buscar lista de produções: {e}")
        import traceback
        traceback.print_exc()
        return []


@app.get("/api/producoes/pagina")
def pagina_producoes(
    db: Session = Depends(get_mysql_db),
    tipo: str | None = None,
    ano: int | None = None,
    has_funding: bool | None = None,
    limit: int = 10,
    offset: int = 0,
):
    """Carrega uma página (limit/offset) das produções com os mesmos filtros do endpoint /lista."""

    try:
        tipo_normalizado = (tipo or "").strip().lower()
        if tipo_normalizado in ["", "todos", "outros", "none", "null"]:
            tipo_normalizado = "todos"

        ano_filtro = ano if isinstance(ano, int) else None
        has_funding_filtro = has_funding

        # Sanitização
        if limit is None or limit <= 0:
            limit = 10
        if offset is None or offset < 0:
            offset = 0

        queries_to_union = []
        count_queries = []
        all_params = {}

        # Se filtro de aporte, busca apenas tabela de financiamento
        if has_funding_filtro is True:
            q_info = build_production_query("project_funding", "Projetos com Aporte", ano_filtro, with_pagination=True, limit=limit, offset=offset)
            queries_to_union.append(q_info["data_query"])
            count_queries.append(q_info["count_query"])
            all_params.update(q_info["params"])
        
        # Se tipo específico (bibliográfica)
        elif tipo_normalizado == "bibliográfica":
            q_info = build_production_query("project_bibliographic_production", "Bibliográfica", ano_filtro, with_pagination=True, limit=limit, offset=offset)
            queries_to_union.append(q_info["data_query"])
            count_queries.append(q_info["count_query"])
            all_params.update(q_info["params"])
        
        # Se tipo específico (técnica/inovação)
        elif tipo_normalizado in ["técnica/inovação", "tecnica/inovacao", "técnica", "tecnica", "inovação", "inovacao"]:
            q_info = build_production_query("project_technical_innovation", "Técnica/Inovação", ano_filtro, with_pagination=True, limit=limit, offset=offset)
            queries_to_union.append(q_info["data_query"])
            count_queries.append(q_info["count_query"])
            all_params.update(q_info["params"])
        
        # Se "todos" - UNION de bibliográfica + técnica
        else:
            q_biblio = build_production_query("project_bibliographic_production", "Bibliográfica", ano_filtro, with_pagination=False)
            q_tech = build_production_query("project_technical_innovation", "Técnica/Inovação", ano_filtro, with_pagination=False)
            
            # Remover ORDER BY das queries individuais para usar no UNION
            biblio_query_no_order = q_biblio["data_query"].replace(" ORDER BY ano DESC", "")
            tech_query_no_order = q_tech["data_query"].replace(" ORDER BY ano DESC", "")
            
            # Para UNION com paginação, precisa de subquery
            union_query = f"""
                SELECT * FROM (
                    {biblio_query_no_order}
                    UNION ALL
                    {tech_query_no_order}
                ) t
                ORDER BY ano DESC
                LIMIT :limit OFFSET :offset
            """
            queries_to_union.append(union_query)
            
            # Para contagem, soma ambas as tabelas
            if ano_filtro is not None:
                count_union = f"""
                    SELECT (
                        (SELECT COUNT(*) FROM project_bibliographic_production WHERE public = 1 AND year = :ano_filtro)
                        +
                        (SELECT COUNT(*) FROM project_technical_innovation WHERE public = 1 AND year = :ano_filtro)
                    ) as total
                """
            else:
                count_union = f"""
                    SELECT (
                        (SELECT COUNT(*) FROM project_bibliographic_production WHERE public = 1)
                        +
                        (SELECT COUNT(*) FROM project_technical_innovation WHERE public = 1)
                    ) as total
                """
            count_queries.append(count_union)
            all_params.update(q_biblio["params"])
            all_params.update(q_tech["params"])
            all_params["limit"] = limit
            all_params["offset"] = offset

        # Executar query de dados
        if len(queries_to_union) == 1:
            final_query = queries_to_union[0]
        else:
            final_query = " UNION ALL ".join(queries_to_union) + " ORDER BY ano DESC LIMIT :limit OFFSET :offset"

        result = db.execute(text(final_query), all_params).fetchall()

        # Executar query de contagem
        if len(count_queries) == 1:
            count_query = count_queries[0]
            # Remover LIMIT/OFFSET dos params para a contagem
            count_params = {k: v for k, v in all_params.items() if k not in ["limit", "offset"]}
            total_row = db.execute(text(count_query), count_params).fetchone()
        else:
            total_row = db.execute(text(count_queries[0]), count_params if 'count_params' in locals() else all_params).fetchone()

        total = total_row[0] if total_row and total_row[0] is not None else 0

        items = [
            {
                "id": row[0],
                "titulo": row[1] if row[1] else "Título não informado",
                "autores": row[2] if row[2] else "Autores não registrados",
                "ano": row[3] if row[3] else "N/A",
                "tipo": row[4] if row[4] else "Outros",
                "subtipo": row[5] if row[5] else None,
                "local_publicacao": row[6] if row[6] else None,
            }
            for row in result
        ]

        return {"items": items, "total": int(total)}

    except Exception as e:
        print(f"[ERROR] Erro ao buscar página de produções: {e}")
        import traceback
        traceback.print_exc()
        return {"items": [], "total": 0}


@app.get("/api/producoes/resumo")
def resumo_producoes(db: Session = Depends(get_db)):
    return {"status": "Endpoint descontinuado. Use /api/producoes/lista ou /api/producoes/totais"}


@app.get("/api/health")
def health_check(db: Session = Depends(get_mysql_db)):
    try:
        result = db.execute(text("SELECT 1")).scalar()
        return {
            "status": "healthy",
            "mysql": "connected",
            "result": result
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "mysql": "disconnected",
            "error": str(e)
        }

@app.get("/api/producoes/totais")
def totais_producoes(db: Session = Depends(get_mysql_db)):
    """Retorna os totais de produções por tipo."""
    try:
        # Usar a função para gerar queries de contagem
        q_biblio = build_production_query("project_bibliographic_production", "Bibliográfica")
        q_tech = build_production_query("project_technical_innovation", "Técnica/Inovação")
        q_funding = build_production_query("project_funding", "Projetos com Aporte")
        
        bibliographic_result = db.execute(text(q_biblio["count_query"]), q_biblio["params"]).fetchone()
        bibliographic_count = bibliographic_result[0] if bibliographic_result and bibliographic_result[0] else 0
        
        technical_result = db.execute(text(q_tech["count_query"]), q_tech["params"]).fetchone()
        technical_count = technical_result[0] if technical_result and technical_result[0] else 0
        
        projects_result = db.execute(text(q_funding["count_query"]), q_funding["params"]).fetchone()
        projects_with_funding = projects_result[0] if projects_result and projects_result[0] else 0
        
        # Total de todas as produções
        total_producoes = bibliographic_count + technical_count + projects_with_funding
        
        print(f"[DEBUG] Totais - Bibliographic: {bibliographic_count}, Technical: {technical_count}, Funding: {projects_with_funding}, Total: {total_producoes}")
        
        return {
            "total_producoes": int(total_producoes),
            "bibliographic": int(bibliographic_count),
            "projects_with_funding": int(projects_with_funding),
            "technical": int(technical_count)
        }
    except Exception as e:
        print(f"[ERROR] Erro ao buscar totais: {e}")
        import traceback
        traceback.print_exc()
        return {
            "total_producoes": 0,
            "bibliographic": 0,
            "projects_with_funding": 0,
            "technical": 0,
            "error": str(e)
        }

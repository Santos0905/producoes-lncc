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

# ========== MAPEAMENTO DE TIPOS E TABELAS ==========
TIPO_TABELA = {
    "bibliográfica": ("project_bibliographic_production", "Bibliográfica"),
    "técnica/inovação": ("project_technical_innovation", "Técnica/Inovação"),
    "financiamento": ("project_funding", "Projetos com Aporte"),
}

def normalizar_tipo(tipo):
    """Normaliza tipo para chave de mapeamento."""
    t = (tipo or "").strip().lower()
    t = t.replace("tecnica", "técnica").replace("inovacao", "inovação")
    
    if t in ["", "todos", "outros", "none", "null"]:
        return "todos"
    
    for key in TIPO_TABELA:
        if t == key or t.startswith(key.split("/")[0].replace("é", "e")):
            return key
    return "todos"

def build_query(tipo_normalizado, ano_filtro=None, limit=None, offset=None):
    """Constrói query base sem duplicação.
    
    Retorna: (data_query, count_query, params)
    """
    params = {}
    if ano_filtro:
        params["ano_filtro"] = ano_filtro
    if limit:
        params["limit"] = limit
    if offset is not None:
        params["offset"] = offset
    
    # Tipo específico
    if tipo_normalizado != "todos" and tipo_normalizado in TIPO_TABELA:
        table, display_type = TIPO_TABELA[tipo_normalizado]
        where = "WHERE p.public = 1"
        if ano_filtro:
            where += " AND p.year = :ano_filtro"
        
        if tipo_normalizado == "bibliográfica":
            select_base = f"""
                SELECT 
                    p.id,
                    p.description,
                    p.description,
                    p.year,
                    '{display_type}' AS tipo,
                    bpt.name AS subtipo
                FROM {table} p
                LEFT JOIN bibliographic_production_type bpt
                    ON p.bibliogragraphic_type_id = bpt.id
                {where}
            """ 
        elif tipo_normalizado == "técnica/inovação":
            select_base = f"""
                SELECT 
                    p.id,
                    p.description,
                    p.description,
                    p.year,
                    '{display_type}' AS tipo,
                    tipt.name AS subtipo
                FROM {table} p
                LEFT JOIN technical_innovation_production_type tipt
                    ON p.technical_innovation_type_id = tipt.id
                {where}
            """
        else:
            # financiamento: subtipo fixo como N/P
            select_base = f"SELECT p.id, p.description, p.description, p.year, '{display_type}' AS tipo, 'N/P' AS subtipo FROM {table} p {where}"
        
        data_query = select_base + " ORDER BY p.year DESC"
        if limit:
            data_query += " LIMIT :limit OFFSET :offset"
        
        count_query = f"SELECT COUNT(*) FROM {table} p {where}"
        return (data_query, count_query, params)
    
    # Todos os tipos - CORRIGIDO COM SUBTIPOS
    where_base = "WHERE p.public = 1"
    if ano_filtro:
        where_base += " AND p.year = :ano_filtro"
    
    selects = []
    
    # Bibliográfica
    selects.append(f"""
        SELECT 
            p.id,
            p.description,
            p.description,
            p.year,
            'Bibliográfica' AS tipo,
            bpt.name AS subtipo
        FROM project_bibliographic_production p
        LEFT JOIN bibliographic_production_type bpt
            ON p.bibliogragraphic_type_id = bpt.id
        {where_base}
    """)
    
    # Técnica/Inovação
    selects.append(f"""
        SELECT 
            p.id,
            p.description,
            p.description,
            p.year,
            'Técnica/Inovação' AS tipo,
            tipt.name AS subtipo
        FROM project_technical_innovation p
        LEFT JOIN technical_innovation_production_type tipt
            ON p.technical_innovation_type_id = tipt.id
        {where_base}
    """)
    
    # Financiamento
    selects.append(f"""
        SELECT 
            p.id,
            p.description,
            p.description,
            p.year,
            'Projetos com Aporte' AS tipo,
            'N/P' AS subtipo
        FROM project_funding p
        {where_base}
    """)
    
    union_query = " UNION ALL ".join(selects)
    data_query = f"({union_query}) ORDER BY year DESC"
    if limit:
        data_query += " LIMIT :limit OFFSET :offset"
    
    count_parts = []
    for table, _ in TIPO_TABELA.values():
        where = "public = 1"
        if ano_filtro:
            where += " AND year = :ano_filtro"
        count_parts.append(f"(SELECT COUNT(*) FROM {table} WHERE {where})")
    
    count_query = f"SELECT {' + '.join(count_parts)}"
    return (data_query, count_query, params)


@app.get("/api/producoes/lista")
def listar_producoes(db: Session = Depends(get_mysql_db), tipo: str | None = None, ano: int | None = None):
    try:
        tipo_norm = normalizar_tipo(tipo)
        ano_filtro = ano if isinstance(ano, int) else None
        
        data_query, _, params = build_query(tipo_norm, ano_filtro)
        result = db.execute(text(data_query), params).fetchall()
        
        return [{"id": r[0], "titulo": r[1], "ano": r[3], "tipo": r[4], "subtipo": r[5]} for r in result]
    except Exception as e:
        print(f"[ERROR] {e}")
        return []

@app.get("/api/producoes/pagina")
def pagina_producoes(
    db: Session = Depends(get_mysql_db),
    tipo: str | None = None,
    subtipo: str | None = None,
    ano: int | None = None,
    limit: int = 10,
    offset: int = 0,
):
    try:
        tipo_norm = normalizar_tipo(tipo)
        ano_filtro = ano if isinstance(ano, int) else None
        limit = max(1, min(limit, 100))
        offset = max(0, offset)
        
        data_query, count_query, params = build_query(tipo_norm, ano_filtro, limit, offset)
        
        # Adiciona filtro de subtipo se fornecido
        if subtipo and subtipo != 'Todos':
            # Filtra por subtipo na subquery
            data_query = f"({data_query}) WHERE subtipo = :subtipo_filtro ORDER BY year DESC"
            params['subtipo_filtro'] = subtipo
        
        result = db.execute(text(data_query), params).fetchall()
        total_row = db.execute(text(count_query), params).fetchone()
        total = total_row[0] if total_row else 0
        
        items = [{"id": r[0], "titulo": r[1], "ano": r[3], "tipo": r[4], "subtipo": r[5]} for r in result]
        return {"items": items, "total": int(total)}
    except Exception as e:
        print(f"[ERROR] {e}")
        return {"items": [], "total": 0}

@app.get("/api/producoes/totais")
def totais_producoes(db: Session = Depends(get_mysql_db)):
    try:
        totals = {}
        for key, (table, display_type) in TIPO_TABELA.items():
            result = db.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()
            count = result[0] if result else 0
            totals[key] = int(count)
        
        return {
            "total_producoes": sum(totals.values()),
            "bibliographic": totals.get("bibliográfica", 0),
            "technical": totals.get("técnica/inovação", 0),
            "projects_with_funding": totals.get("financiamento", 0),
        }
    except Exception as e:
        print(f"[ERROR] {e}")
        return {"total_producoes": 0, "bibliographic": 0, "technical": 0, "projects_with_funding": 0}

@app.get("/api/health")
def health_check(db: Session = Depends(get_mysql_db)):
    try:
        result = db.execute(text("SELECT 1")).scalar()
        return {"status": "healthy", "mysql": "connected", "result": result}
    except Exception as e:
        return {"status": "unhealthy", "mysql": "disconnected", "error": str(e)}

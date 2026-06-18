from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal, MySQLSessionLocal, engine
import models, traceback

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def get_mysql_db():
    db = MySQLSessionLocal()
    try: yield db
    finally: db.close()

# Mantendo mapeamento exato das tabelas e joins originais
TIPO_TABELA = {
    "bibliografica": ("project_bibliographic_production", "Bibliografica", "bibliogragraphic_type_id", "bibliographic_production_type"),
    "tecnica/inovacao": ("project_technical_innovation", "Tecnica/Inovacao", "technical_innovation_type_id", "technical_innovation_production_type"),
    "financiamento": ("project_funding", "Projetos com Aporte", "funding_type_id", "funding_type"),
}

def normalizar_tipo(tipo):
    t = (tipo or "").strip().lower().replace("ç", "c").replace("á", "a").replace("é", "e")
    if t in ["", "todos", "outros", "none", "null"]: return "todos"
    for key in TIPO_TABELA:
        if t == key.replace("ç", "c").replace("á", "a").replace("é", "e") or t.startswith(key.split("/")[0]): return key
    return "todos"

def montar_query_bloco(table, display_type, fk, join_table, where, subtipo_filtro):
    sub_where = f" AND j.name = :subtipo_filtro" if subtipo_filtro else ""
    coalesce_val = "''" if display_type == "Projetos com Aporte" else "'Sem subtipo'"
    
    # Mantendo estritamente p.description duplicado como titulo e autores conforme o seu original
    data = f"SELECT p.id, p.description, p.description, p.year, '{display_type}' AS tipo, COALESCE(j.name, {coalesce_val}) AS subtipo FROM {table} p LEFT JOIN {join_table} j ON p.{fk} = j.id {where} {sub_where}"
    count = f"SELECT COUNT(*) FROM {table} p LEFT JOIN {join_table} j ON p.{fk} = j.id {where} {sub_where}"
    return data, count

@app.get("/api/producoes/pagina")
def pagina_producoes(db: Session = Depends(get_mysql_db), tipo: str | None = None, subtipo: str | None = None, ano: int | None = None, limit: int = 10, offset: int = 0):
    try:
        tipo_norm, subtipo_filtro = normalizar_tipo(tipo), (subtipo if subtipo and subtipo != "Todos" else None)
        
        params = {
            "limit": max(1, min(limit, 100)), 
            "offset": max(0, offset),
            **({"ano_filtro": ano} if isinstance(ano, int) else {}),
            **({"subtipo_filtro": subtipo_filtro} if subtipo_filtro else {})
        }

        where = "WHERE p.public = 1" + (" AND p.year = :ano_filtro" if isinstance(ano, int) else "")

        if tipo_norm in TIPO_TABELA:
            data_q, count_q = montar_query_bloco(*TIPO_TABELA[tipo_norm], where, subtipo_filtro)
            data_q += " ORDER BY p.year DESC LIMIT :limit OFFSET :offset"
        else:
            selects, counts = [], []
            for k, v in TIPO_TABELA.items():
                d_q, c_q = montar_query_bloco(*v, where, subtipo_filtro)
                selects.append(d_q)
                counts.append(f"({c_q})")
            # UNION ALL garantindo a paginação correta no modo "Todos"
            data_q = f"({' UNION ALL '.join(selects)}) ORDER BY year DESC LIMIT :limit OFFSET :offset"
            count_q = f"SELECT {' + '.join(counts)}"

        res = db.execute(text(data_q), params).fetchall()
        total = db.execute(text(count_q), params).scalar() or 0
        return {"items": [{"id": r[0], "titulo": r[1], "autores": r[2], "ano": r[3], "tipo": r[4], "subtipo": r[5]} for r in res], "total": int(total)}
    except Exception:
        traceback.print_exc()
        return {"items": [], "total": 0}

@app.get("/api/producoes/lista")
def listar_producoes(db: Session = Depends(get_mysql_db), tipo: str | None = None, ano: int | None = None):
    try:
        tipo_norm = normalizar_tipo(tipo)
        if tipo_norm not in TIPO_TABELA: return []
        params = {"ano_filtro": ano} if isinstance(ano, int) else {}
        where = "WHERE public = 1" + (" AND year = :ano_filtro" if isinstance(ano, int) else "")
        res = db.execute(text(f"SELECT id, description, year FROM {TIPO_TABELA[tipo_norm][0]} {where}"), params).fetchall()
        return [{"id": r[0], "titulo": r[1], "ano": r[2]} for r in res]
    except Exception: return []

@app.get("/api/producoes/totais")
def totais_producoes(db: Session = Depends(get_mysql_db)):
    try:
        t = {k: int(db.execute(text(f"SELECT COUNT(*) FROM {v[0]}")).scalar() or 0) for k, v in TIPO_TABELA.items()}
        return {"total_producoes": sum(t.values()), "bibliographic": t.get("bibliografica", 0), "technical": t.get("tecnica/inovacao", 0), "projects_with_funding": t.get("financiamento", 0)}
    except Exception: return {"total_producoes": 0, "bibliographic": 0, "technical": 0, "projects_with_funding": 0}

@app.get("/api/producoes/subtipos")
def obter_subtipos(db: Session = Depends(get_mysql_db), tipo: str | None = None):
    try:
        tipo_norm = normalizar_tipo(tipo)
        chaves = TIPO_TABELA.keys() if tipo_norm == "todos" else ([tipo_norm] if tipo_norm in TIPO_TABELA else [])
        subtipos = []
        for k in chaves:
            res = db.execute(text(f"SELECT DISTINCT name FROM {TIPO_TABELA[k][3]} WHERE name IS NOT NULL")).fetchall()
            subtipos.extend([r[0] for r in res])
        return {"subtipos": sorted(list(set(subtipos)))}
    except Exception:
        traceback.print_exc()
        return {"subtipos": []}

@app.get("/api/health")
def health_check(db: Session = Depends(get_mysql_db)):
    try: return {"status": "healthy", "mysql": "connected", "result": db.execute(text("SELECT 1")).scalar()}
    except Exception as e: return {"status": "unhealthy", "mysql": "disconnected", "error": str(e)}
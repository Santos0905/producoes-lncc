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

TIPO_TABELA = {
    "bibliografica": ("project_bibliographic_production", "Bibliografica"),
    "tecnica/inovacao": ("project_technical_innovation", "Tecnica/Inovacao"),
    "financiamento": ("project_funding", "Projetos com Aporte"),
}

def normalizar_tipo(tipo):
    t = (tipo or "").strip().lower()
    t = t.replace("tecnica", "tecnica").replace("inovacao", "inovacao")
    t = t.replace("ç", "c").replace("á", "a").replace("é", "e")
    
    if t in ["", "todos", "outros", "none", "null"]:
        return "todos"
    
    for key in TIPO_TABELA:
        key_norm = key.replace("ç", "c").replace("á", "a").replace("é", "e")
        if t == key_norm or t.startswith(key_norm.split("/")[0]):
            return key
    return "todos"

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
        subtipo_filtro = subtipo if subtipo and subtipo != "Todos" else None
        
        params = {}
        if ano_filtro:
            params["ano_filtro"] = ano_filtro
        if subtipo_filtro:
            params["subtipo_filtro"] = subtipo_filtro
        params["limit"] = limit
        params["offset"] = offset
        
        if tipo_norm != "todos" and tipo_norm in TIPO_TABELA:
            table, display_type = TIPO_TABELA[tipo_norm]
            where = "WHERE p.public = 1"
            if ano_filtro:
                where += " AND p.year = :ano_filtro"
            
            if tipo_norm == "bibliografica":
                data_query = f"""
                    SELECT 
                        p.id,
                        p.description,
                        p.description,
                        p.year,
                        '{display_type}' AS tipo,
                        COALESCE(bpt.name, 'Sem subtipo') AS subtipo
                    FROM {table} p
                    LEFT JOIN bibliographic_production_type bpt
                        ON p.bibliogragraphic_type_id = bpt.id
                    {where}
                """
                if subtipo_filtro:
                    data_query += " AND bpt.name = :subtipo_filtro"
                
                count_query = f"SELECT COUNT(*) FROM {table} p LEFT JOIN bibliographic_production_type bpt ON p.bibliogragraphic_type_id = bpt.id {where}"
                if subtipo_filtro:
                    count_query += " AND bpt.name = :subtipo_filtro"
                    
            elif tipo_norm == "tecnica/inovacao":
                data_query = f"""
                    SELECT 
                        p.id,
                        p.description,
                        p.description,
                        p.year,
                        '{display_type}' AS tipo,
                        COALESCE(tipt.name, 'Sem subtipo') AS subtipo
                    FROM {table} p
                    LEFT JOIN technical_innovation_production_type tipt
                        ON p.technical_innovation_type_id = tipt.id
                    {where}
                """
                if subtipo_filtro:
                    data_query += " AND tipt.name = :subtipo_filtro"
                
                count_query = f"SELECT COUNT(*) FROM {table} p LEFT JOIN technical_innovation_production_type tipt ON p.technical_innovation_type_id = tipt.id {where}"
                if subtipo_filtro:
                    count_query += " AND tipt.name = :subtipo_filtro"
            else:
                # Financiamento
                data_query = f"""
                    SELECT 
                        p.id,
                        p.description,
                        p.description,
                        p.year,
                        '{display_type}' AS tipo,
                        COALESCE(ft.name, '') AS subtipo
                    FROM {table} p
                    LEFT JOIN funding_type ft
                        ON p.funding_type_id = ft.id
                    {where}
                """
                if subtipo_filtro:
                    data_query += " AND ft.name = :subtipo_filtro"
                
                count_query = f"SELECT COUNT(*) FROM {table} p LEFT JOIN funding_type ft ON p.funding_type_id = ft.id {where}"
                if subtipo_filtro:
                    count_query += " AND ft.name = :subtipo_filtro"
            
            data_query += f" ORDER BY p.year DESC LIMIT :limit OFFSET :offset"
            
            result = db.execute(text(data_query), params).fetchall()
            total_row = db.execute(text(count_query), params).fetchone()
            total = total_row[0] if total_row else 0
            
            items = [{"id": r[0], "titulo": r[1], "autores": r[2], "ano": r[3], "tipo": r[4], "subtipo": r[5]} for r in result]
            return {"items": items, "total": int(total)}
        
        where_base = "WHERE p.public = 1"
        if ano_filtro:
            where_base += " AND p.year = :ano_filtro"
        
        bib_where = where_base
        if subtipo_filtro:
            bib_where += " AND bpt.name = :subtipo_filtro"
        
        tech_where = where_base
        if subtipo_filtro:
            tech_where += " AND tipt.name = :subtipo_filtro"
        
        fund_where = where_base
        if subtipo_filtro:
            fund_where += " AND ft.name = :subtipo_filtro"
        
        selects = [
            f"""
            SELECT 
                p.id,
                p.description,
                p.description,
                p.year,
                'Bibliografica' AS tipo,
                COALESCE(bpt.name, 'Sem subtipo') AS subtipo
            FROM project_bibliographic_production p
            LEFT JOIN bibliographic_production_type bpt
                ON p.bibliogragraphic_type_id = bpt.id
            {bib_where}
            """,
            f"""
            SELECT 
                p.id,
                p.description,
                p.description,
                p.year,
                'Tecnica/Inovacao' AS tipo,
                COALESCE(tipt.name, 'Sem subtipo') AS subtipo
            FROM project_technical_innovation p
            LEFT JOIN technical_innovation_production_type tipt
                ON p.technical_innovation_type_id = tipt.id
            {tech_where}
            """,
            f"""
            SELECT 
                p.id,
                p.description,
                p.description,
                p.year,
                'Projetos com Aporte' AS tipo,
                COALESCE(ft.name, '') AS subtipo
            FROM project_funding p
            LEFT JOIN funding_type ft
                ON p.funding_type_id = ft.id
            {fund_where}
            """
        ]
        
        union_query = " UNION ALL ".join(selects)
        data_query = f"({union_query}) ORDER BY year DESC LIMIT :limit OFFSET :offset"
        
        result = db.execute(text(data_query), params).fetchall()
        
        count_bib = "SELECT COUNT(*) FROM project_bibliographic_production p LEFT JOIN bibliographic_production_type bpt ON p.bibliogragraphic_type_id = bpt.id " + bib_where
        count_tech = "SELECT COUNT(*) FROM project_technical_innovation p LEFT JOIN technical_innovation_production_type tipt ON p.technical_innovation_type_id = tipt.id " + tech_where
        count_fund = "SELECT COUNT(*) FROM project_funding p LEFT JOIN funding_type ft ON p.funding_type_id = ft.id " + fund_where
        
        count_query = f"SELECT ({count_bib}) + ({count_tech}) + ({count_fund})"
        
        total_row = db.execute(text(count_query), params).fetchone()
        total = total_row[0] if total_row else 0
        
        items = [{"id": r[0], "titulo": r[1], "autores": r[2], "ano": r[3], "tipo": r[4], "subtipo": r[5]} for r in result]
        return {"items": items, "total": int(total)}
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return {"items": [], "total": 0}

@app.get("/api/producoes/lista")
def listar_producoes(db: Session = Depends(get_mysql_db), tipo: str | None = None, ano: int | None = None):
    try:
        tipo_norm = normalizar_tipo(tipo)
        ano_filtro = ano if isinstance(ano, int) else None
        
        params = {}
        if ano_filtro:
            params["ano_filtro"] = ano_filtro
        
        if tipo_norm in TIPO_TABELA:
            table, display_type = TIPO_TABELA[tipo_norm]
            where = "WHERE public = 1"
            if ano_filtro:
                where += " AND year = :ano_filtro"
            query = f"SELECT id, description, year FROM {table} {where}"
            result = db.execute(text(query), params).fetchall()
        else:
            result = []
        
        return [{"id": r[0], "titulo": r[1], "ano": r[2]} for r in result]
    except Exception as e:
        print(f"[ERROR] {e}")
        return []

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
            "bibliographic": totals.get("bibliografica", 0),
            "technical": totals.get("tecnica/inovacao", 0),
            "projects_with_funding": totals.get("financiamento", 0),
        }
    except Exception as e:
        print(f"[ERROR] {e}")
        return {"total_producoes": 0, "bibliographic": 0, "technical": 0, "projects_with_funding": 0}

@app.get("/api/producoes/subtipos")
def obter_subtipos(db: Session = Depends(get_mysql_db), tipo: str | None = None):
    try:
        tipo_norm = normalizar_tipo(tipo)
        subtipos = []
        
        if tipo_norm == "bibliografica":
            result = db.execute(text("""
                SELECT DISTINCT name FROM bibliographic_production_type
                WHERE name IS NOT NULL
                ORDER BY name
            """)).fetchall()
            subtipos = [r[0] for r in result]
        
        elif tipo_norm == "tecnica/inovacao":
            result = db.execute(text("""
                SELECT DISTINCT name FROM technical_innovation_production_type
                WHERE name IS NOT NULL
                ORDER BY name
            """)).fetchall()
            subtipos = [r[0] for r in result]
        
        elif tipo_norm == "financiamento":
            result = db.execute(text("""
                SELECT DISTINCT name FROM funding_type
                WHERE name IS NOT NULL
                ORDER BY name
            """)).fetchall()
            subtipos = [r[0] for r in result]
        
        elif tipo_norm == "todos":
            # Retorna todos os subtipos de todos os tipos
            bib_result = db.execute(text("""
                SELECT DISTINCT name FROM bibliographic_production_type
                WHERE name IS NOT NULL
            """)).fetchall()
            subtipos.extend([r[0] for r in bib_result])
            
            tech_result = db.execute(text("""
                SELECT DISTINCT name FROM technical_innovation_production_type
                WHERE name IS NOT NULL
            """)).fetchall()
            subtipos.extend([r[0] for r in tech_result])
            
            fund_result = db.execute(text("""
                SELECT DISTINCT name FROM funding_type
                WHERE name IS NOT NULL
            """)).fetchall()
            subtipos.extend([r[0] for r in fund_result])
            
            subtipos = sorted(list(set(subtipos)))
        
        return {"subtipos": subtipos}
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return {"subtipos": []}

@app.get("/api/health")
def health_check(db: Session = Depends(get_mysql_db)):
    try:
        result = db.execute(text("SELECT 1")).scalar()
        return {"status": "healthy", "mysql": "connected", "result": result}
    except Exception as e:
        return {"status": "unhealthy", "mysql": "disconnected", "error": str(e)}

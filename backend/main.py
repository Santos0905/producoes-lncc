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

@app.get("/api/producoes/lista")
def listar_producoes(db: Session = Depends(get_mysql_db)):

    try:
        query = """
        SELECT 
            p.id,
            p.description as titulo,
            p.description as autores,
            p.year as ano,
            'Bibliográfica' as tipo
        FROM project_bibliographic_production p
        WHERE p.public = 1
        UNION ALL
        SELECT 
            p.id,
            p.description as titulo,
            p.description as autores,
            p.year as ano,
            'Técnica/Inovação' as tipo
        FROM project_technical_innovation p
        WHERE p.public = 1
        ORDER BY ano DESC
        """
        
        result = db.execute(text(query)).fetchall()
        
        producoes = [
            {
                "id": row[0],
                "titulo": row[1][:100] + "..." if row[1] and len(row[1]) > 100 else row[1] if row[1] else "Título não informado",
                "autores": row[2][:80] + "..." if row[2] and len(row[2]) > 80 else row[2] if row[2] else "Autores não registrados",
                "ano": row[3] if row[3] else "N/A",
                "tipo": row[4] if row[4] else "Outros"
            }
            for row in result
        ]
        
        print(f"[DEBUG] Retornando {len(producoes)} produções do MySQL")
        return producoes
        
    except Exception as e:
        print(f"[ERROR] Erro ao buscar lista de produções: {e}")
        import traceback
        traceback.print_exc()
        return []

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

    try:
        # Card 1: Produções Bibliográficas
        bibliographic_result = db.execute(
            text("SELECT COUNT(*) as cnt FROM project_bibliographic_production")
        ).fetchone()
        bibliographic_count = bibliographic_result[0] if bibliographic_result and bibliographic_result[0] else 0
        
        # Card 2: Produções Técnicas e Inovação
        technical_result = db.execute(
            text("SELECT COUNT(*) as cnt FROM project_technical_innovation")
        ).fetchone()
        technical_count = technical_result[0] if technical_result and technical_result[0] else 0
        
        # Card 3: Projetos com Aporte 
        projects_result = db.execute(
            text("SELECT COUNT(*) as cnt FROM project_funding")
        ).fetchone()
        projects_with_funding = projects_result[0] if projects_result and projects_result[0] else 0
        
        # Card 4: Total de todas as produções
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

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal, MySQLSessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configuração de Segurança para o Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependência para o Banco de Dados PostgreSQL
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependência para o Banco de Dados MySQL - SEMPRE retorna conexão fresca
def get_mysql_db():
    db = MySQLSessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/producoes/lista")
def listar_producoes(db: Session = Depends(get_db)):
    return {
        "artigos": db.query(models.Producao).filter(models.Producao.tipo == "Artigo").count(),
        "livros": db.query(models.Producao).filter(models.Producao.tipo == "Livro").count(),
        "patentes": db.query(models.Producao).filter(models.Producao.tipo == "Patente").count(),
        "softwares": db.query(models.Producao).filter(models.Producao.tipo == "Software").count(),
    }

@app.get("/api/producoes/resumo")
def resumo_producoes(db: Session = Depends(get_db)):
    return db.query(models.Producao).all()

@app.get("/api/health")
def health_check(db: Session = Depends(get_mysql_db)):
    """Verifica se o backend e MySQL estão saudáveis"""
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
    """
    Retorna os TOTAIS REAIS do MySQL:
    - Card 1: Produções Totais = 430
    - Card 2: Bibliográficas = 248
    - Card 3: Projetos com Aporte = 113
    - Card 4: Técnicas e Inovação = 69
    """
    
    try:
        # Card 2: Produções Bibliográficas - COUNT de project_bibliographic_production
        bibliographic_result = db.execute(
            text("SELECT COUNT(*) as cnt FROM project_bibliographic_production")
        ).fetchone()
        bibliographic_count = bibliographic_result[0] if bibliographic_result and bibliographic_result[0] else 0
        
        # Card 4: Produções Técnicas e Inovação - COUNT de project_technical_innovation
        technical_result = db.execute(
            text("SELECT COUNT(*) as cnt FROM project_technical_innovation")
        ).fetchone()
        technical_count = technical_result[0] if technical_result and technical_result[0] else 0
        
        # Card 3: Projetos com Aporte - COUNT de project_funding
        projects_result = db.execute(
            text("SELECT COUNT(*) as cnt FROM project_funding")
        ).fetchone()
        projects_with_funding = projects_result[0] if projects_result and projects_result[0] else 0
        
        # Card 1: Total de todas as produções
        total_producoes = bibliographic_count + technical_count + projects_with_funding
        
        print(f"[DEBUG] Bibliographic: {bibliographic_count}, Technical: {technical_count}, Funding: {projects_with_funding}, Total: {total_producoes}")
        
        return {
            "total_producoes": int(total_producoes),
            "bibliographic": int(bibliographic_count),
            "projects_with_funding": int(projects_with_funding),
            "technical": int(technical_count)
        }
    except Exception as e:
        print(f"[ERROR] Erro ao buscar dados do MySQL: {e}")
        import traceback
        traceback.print_exc()
        return {
            "total_producoes": 0,
            "bibliographic": 0,
            "projects_with_funding": 0,
            "technical": 0,
            "error": str(e)
        }

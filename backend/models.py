from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Producao(Base):
    __tablename__ = "producoes"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String)
    autores = Column(String)
    ano = Column(Integer)
    tipo = Column(String) 
    subtipo = Column(String, nullable=True)  # Novo campo
    local_publicacao = Column(String, nullable=True)  # Novo campo


class ProjectBibliographicProduction(Base):
    __tablename__ = "project_bibliographic_production"
    id = Column(Integer, primary_key=True, index=True)


class ProjectTechnicalInnovation(Base):
    __tablename__ = "project_technical_innovation"
    id = Column(Integer, primary_key=True, index=True)


class ProjectFunding(Base):
    __tablename__ = "project_funding"
    id = Column(Integer, primary_key=True, index=True)


from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Producao(Base):
    __tablename__ = "producoes"
    id, titulo, autores, ano, tipo = Column(Integer, primary_key=True, index=True), Column(String), Column(String), Column(Integer), Column(String)

class ProjectBibliographicProduction(Base):
    __tablename__ = "project_bibliographic_production"
    id = Column(Integer, primary_key=True, index=True)

class ProjectTechnicalInnovation(Base):
    __tablename__ = "project_technical_innovation"
    id = Column(Integer, primary_key=True, index=True)

class ProjectFunding(Base):
    __tablename__ = "project_funding"
    id = Column(Integer, primary_key=True, index=True)




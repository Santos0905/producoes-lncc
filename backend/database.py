import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user_producao:password_producao@db_clone:5432/producao_intelectual")
MYSQL_DATABASE_URL = os.getenv("MYSQL_DATABASE_URL", "mysql+pymysql://myuser:mypassword@host.docker.internal:3306/mydb")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

mysql_engine = create_engine(
    MYSQL_DATABASE_URL, pool_pre_ping=True, pool_recycle=3600, pool_size=5, max_overflow=10, connect_args={"charset": "utf8mb4"}
)
MySQLSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=mysql_engine)

Base = declarative_base()
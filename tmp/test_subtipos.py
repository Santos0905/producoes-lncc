import sys
sys.path.insert(0, '/backend')

from database import MySQLSessionLocal
from sqlalchemy import text

db = MySQLSessionLocal()

print('=== TESTANDO Bibliografica ===')
result = db.execute(text("""
    SELECT DISTINCT name FROM bibliographic_production_type
    WHERE name IS NOT NULL
    ORDER BY name
""")).fetchall()
subtipos = [r[0] for r in result]
print(f"Subtipos encontrados: {subtipos}")
print(f"Total: {len(subtipos)}")

print('\n=== TESTANDO Tecnica/Inovacao ===')
result = db.execute(text("""
    SELECT DISTINCT name FROM technical_innovation_production_type
    WHERE name IS NOT NULL
    ORDER BY name
""")).fetchall()
subtipos = [r[0] for r in result]
print(f"Subtipos encontrados: {subtipos}")
print(f"Total: {len(subtipos)}")

db.close()

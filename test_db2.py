from sqlalchemy import create_engine, text

# Conecta ao MySQL
engine = create_engine('mysql+pymysql://myuser:mypassword@host.docker.internal:3306/mydb')

with engine.connect() as conn:
    # Procura por N/P
    print("=== Buscando registros com 'N/P' ===")
    result = conn.execute(text("""
        SELECT p.id, p.description, p.funding_type_id, ft.id, ft.name
        FROM project_funding p
        LEFT JOIN funding_type ft ON p.funding_type_id = ft.id
        WHERE p.description LIKE '%N/P%'
        LIMIT 5
    """))
    for row in result:
        print(row)
    
    # Verifica qual é a coluna que retorna "N/P"
    print("\n=== Buscando o que retorna como 'N/P' ===")
    result = conn.execute(text("""
        SELECT p.id, p.description, p.funding_type_id, ft.name
        FROM project_funding p
        LEFT JOIN funding_type ft ON p.funding_type_id = ft.id
        WHERE p.public = 1
        LIMIT 10
    """))
    for row in result:
        print(f"ID: {row[0]}, funding_type_id: {row[2]}, ft.name: {row[3]}")

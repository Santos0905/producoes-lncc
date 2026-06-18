from sqlalchemy import create_engine, text

# Conecta ao MySQL
engine = create_engine('mysql+pymysql://myuser:mypassword@host.docker.internal:3306/mydb')

with engine.connect() as conn:
    # Mostra colunas da tabela project_funding
    result = conn.execute(text("DESCRIBE project_funding"))
    print("=== Colunas de project_funding ===")
    for row in result:
        print(row)
    
    # Mostra algumas linhas
    print("\n=== Primeiras 5 linhas de project_funding ===")
    result = conn.execute(text("SELECT id, description, funding_type_id, public FROM project_funding LIMIT 5"))
    for row in result:
        print(row)
    
    # Mostra funding_type
    print("\n=== Dados de funding_type ===")
    result = conn.execute(text("SELECT id, name FROM funding_type LIMIT 10"))
    for row in result:
        print(row)

    # Test JOIN
    print("\n=== TEST JOIN ===")
    result = conn.execute(text("""
        SELECT 
            p.id,
            p.description,
            p.funding_type_id,
            COALESCE(ft.name, 'VAZIO') AS subtipo
        FROM project_funding p
        LEFT JOIN funding_type ft ON p.funding_type_id = ft.id
        WHERE p.public = 1
        LIMIT 5
    """))
    for row in result:
        print(row)

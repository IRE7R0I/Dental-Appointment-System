from backend.database import engine, Base
from backend.models import Paciente, Doctor, Turno, Pago, HistoriaClinica

def init_db():
    print("🔨 Conectando con PostgreSQL...")
    try:
        # Esta es la línea mágica que crea todo
        Base.metadata.create_all(bind=engine)
        print("✅ ¡Tablas creadas con éxito en 'odontogest'!")
    except Exception as e:
        print(f"❌ Error al crear las tablas: {e}")

if __name__ == "__main__":
    init_db()
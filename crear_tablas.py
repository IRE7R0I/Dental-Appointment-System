from backend.database import engine, Base, SessionLocal
from backend.models import Paciente, Doctor, Turno, Pago, HistoriaClinica
from sqlalchemy import text


def init_db():
    print("🔨 Conectando...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ ¡Tablas creadas!")

        # ── Migración: agregar columna dni_paciente a pagos si no existe ──
        db = SessionLocal()
        try:
            db.execute(text("ALTER TABLE pagos ADD COLUMN dni_paciente VARCHAR(20)"))
            db.commit()
            print("✅ Columna dni_paciente agregada a tabla pagos")
        except Exception as e:
            db.rollback()
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️  Columna dni_paciente ya existe en pagos (se omite)")
            else:
                print(f"ℹ️  ALTER TABLE: {e}")
        finally:
            db.close()

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    init_db()
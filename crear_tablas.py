from backend.database import engine, Base, SessionLocal
from backend.models import (
    Paciente, Doctor, Turno, Pago, HistoriaClinica,
    TurnoTratamiento, CuentaCorriente, MovimientoCuenta, Usuario, ObraSocial,
    AlertaMedica, EvolucionClinica,
)
from backend.core.security import hash_password
from sqlalchemy import text


def init_db():
    print("Conectando...")
    try:
        # Crear tablas nuevas (las existentes se omiten)
        Base.metadata.create_all(bind=engine)
        print("Tablas creadas/verificadas.")

        db = SessionLocal()
        try:
            # ── Migraciones: columnas agregadas post-creación ──

            dni_pago_col = db.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='pagos' AND column_name='dni_paciente'"
            )).fetchone()
            if not dni_pago_col:
                db.execute(text("ALTER TABLE pagos ADD COLUMN dni_paciente VARCHAR(20)"))
                print("Columna dni_paciente agregada a pagos.")

            activo_col = db.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='doctores' AND column_name='activo'"
            )).fetchone()
            if not activo_col:
                db.execute(text("ALTER TABLE doctores ADD COLUMN activo BOOLEAN DEFAULT TRUE"))
                print("Columna activo agregada a doctores.")

            creado_por_col = db.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='turnos' AND column_name='creado_por_id'"
            )).fetchone()
            if not creado_por_col:
                db.execute(text("ALTER TABLE turnos ADD COLUMN creado_por_id INTEGER REFERENCES usuarios(id)"))
                db.execute(text("ALTER TABLE turnos ADD COLUMN actualizado_por_id INTEGER REFERENCES usuarios(id)"))
                print("Columnas creado_por_id/actualizado_por_id agregadas a turnos.")

            db.commit()

            # ── Seed: admin inicial ──
            admin = db.query(Usuario).filter(Usuario.username == "admin").first()
            if not admin:
                admin = Usuario(
                    username="admin",
                    hashed_password=hash_password("admin123"),
                    rol="admin",
                    activo=True,
                )
                db.add(admin)
                db.commit()
                print("Admin creado: admin / admin123")
            else:
                print("Admin ya existe.")

            # ── Seed: obras sociales ──
            obras_sociales = [
                "Particular", "OSDE", "Swiss Medical", "Galeno",
                "Medicus", "Sancor Salud", "OMINT",
            ]
            for nombre in obras_sociales:
                existe = db.query(ObraSocial).filter(ObraSocial.nombre == nombre).first()
                if not existe:
                    db.add(ObraSocial(nombre=nombre, activo=True))
            db.commit()
            print(f"Obras sociales seeded ({len(obras_sociales)})")

        except Exception as e:
            db.rollback()
            print(f"Info: {e}")
        finally:
            db.close()

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    init_db()

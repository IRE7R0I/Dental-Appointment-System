"""
Integration tests for C-17 agenda-vista-mensual-bulk (GET /turnos/slots/bulk).
Uses SQLite file-based database (real DB, no mocks).
"""
from datetime import date, time, datetime

import pytest

from backend import models
from backend.crud.horarios_doctor import seed_horarios_doctor


class TestSlotsBulk:
    """Tests for GET /turnos/slots/bulk — counts agregados por día."""

    def test_simple_week_range(self, db, client, headers_admin, sample_doctor, sample_paciente, admin_user):
        """Turno + bloqueo in a week → correct counts per day."""
        seed_horarios_doctor(db, sample_doctor.id)

        turno_dt = datetime.combine(date(2026, 8, 3), time(9, 0))
        db.add(models.Turno(
            fecha_hora=turno_dt,
            duracion_minutos=30,
            estado="Pendiente",
            dni_paciente=sample_paciente.dni,
            id_doctor=sample_doctor.id,
        ))
        db.add(models.SlotsBloqueado(
            fecha=date(2026, 8, 3),
            hora=time(9, 30),
            id_doctor=sample_doctor.id,
            motivo="Test",
            bloqueado_por_id=admin_user.id,
        ))
        db.commit()

        resp = client.get(
            "/api/turnos/slots/bulk",
            params={"fecha_desde": "2026-08-03", "fecha_hasta": "2026-08-09", "id_doctor": str(sample_doctor.id)},
            headers=headers_admin,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["fecha_desde"] == "2026-08-03"
        assert data["fecha_hasta"] == "2026-08-09"
        assert data["doctores"] == [sample_doctor.id]

        dias = data["dias"]

        d03 = dias["2026-08-03"]
        assert d03["total"] == 16
        assert d03["ocupados"] == 1
        assert d03["bloqueados"] == 1
        assert d03["libres"] == 14
        assert d03["por_doctor"][str(sample_doctor.id)]["total"] == 16
        assert d03["por_doctor"][str(sample_doctor.id)]["ocupados"] == 1

        d06 = dias["2026-08-06"]
        assert d06["total"] == 0

        d09 = dias["2026-08-09"]
        assert d09["total"] == 0

        d05 = dias["2026-08-05"]
        assert d05["total"] == 16
        assert d05["libres"] == 16
        assert d05["ocupados"] == 0
        assert d05["bloqueados"] == 0

    def test_month_with_exceptions(self, db, client, headers_admin, sample_doctor):
        """DiaNoLaborableDoctor marks a day as total=0."""
        seed_horarios_doctor(db, sample_doctor.id)

        db.add(models.DiaNoLaborableDoctor(
            id_doctor=sample_doctor.id,
            fecha=date(2026, 8, 7),
            motivo="Feriado",
        ))
        db.commit()

        resp = client.get(
            "/api/turnos/slots/bulk",
            params={"fecha_desde": "2026-08-01", "fecha_hasta": "2026-08-15", "id_doctor": str(sample_doctor.id)},
            headers=headers_admin,
        )
        assert resp.status_code == 200
        data = resp.json()
        dias = data["dias"]

        d07 = dias["2026-08-07"]
        assert d07["total"] == 0
        assert d07["por_doctor"][str(sample_doctor.id)]["total"] == 0
        assert d07["por_doctor"][str(sample_doctor.id)]["libres"] == 0

        d04 = dias["2026-08-04"]
        assert d04["total"] == 16

    def test_range_crossing_two_months(self, db, client, headers_admin, sample_doctor):
        """Range crossing July → August works correctly."""
        seed_horarios_doctor(db, sample_doctor.id)

        resp = client.get(
            "/api/turnos/slots/bulk",
            params={"fecha_desde": "2026-07-27", "fecha_hasta": "2026-08-02", "id_doctor": str(sample_doctor.id)},
            headers=headers_admin,
        )
        assert resp.status_code == 200
        data = resp.json()
        dias = data["dias"]

        assert len(dias) == 7
        assert dias["2026-07-30"]["total"] == 0
        assert dias["2026-08-01"]["total"] == 8

    def test_doctor_without_turnos_or_blocked(self, db, client, headers_admin, sample_doctor):
        """No turnos, no bloqueos → all slots free."""
        seed_horarios_doctor(db, sample_doctor.id)

        resp = client.get(
            "/api/turnos/slots/bulk",
            params={"fecha_desde": "2026-08-03", "fecha_hasta": "2026-08-09", "id_doctor": str(sample_doctor.id)},
            headers=headers_admin,
        )
        assert resp.status_code == 200
        data = resp.json()

        d03 = data["dias"]["2026-08-03"]
        assert d03["total"] == 16
        assert d03["libres"] == 16
        assert d03["ocupados"] == 0
        assert d03["bloqueados"] == 0

    def test_turno_60_min_occupies_2_slots(self, db, client, headers_admin, sample_doctor, sample_paciente):
        """60-min turno occupies slots 09:00 and 09:30."""
        seed_horarios_doctor(db, sample_doctor.id)

        turno_dt = datetime.combine(date(2026, 8, 3), time(9, 0))
        db.add(models.Turno(
            fecha_hora=turno_dt,
            duracion_minutos=60,
            estado="Pendiente",
            dni_paciente=sample_paciente.dni,
            id_doctor=sample_doctor.id,
        ))
        db.commit()

        resp = client.get(
            "/api/turnos/slots/bulk",
            params={"fecha_desde": "2026-08-03", "fecha_hasta": "2026-08-03", "id_doctor": str(sample_doctor.id)},
            headers=headers_admin,
        )
        assert resp.status_code == 200
        data = resp.json()
        d03 = data["dias"]["2026-08-03"]
        assert d03["total"] == 16
        assert d03["ocupados"] == 2
        assert d03["libres"] == 14

    def test_invalid_date_range(self, db, client, headers_admin):
        """fecha_desde > fecha_hasta → 400."""
        resp = client.get(
            "/api/turnos/slots/bulk",
            params={"fecha_desde": "2026-08-15", "fecha_hasta": "2026-08-01"},
            headers=headers_admin,
        )
        assert resp.status_code == 400

    def test_no_id_doctor_uses_active(self, db, client, headers_admin, sample_doctor):
        """Omitting id_doctor → all active doctors included."""
        seed_horarios_doctor(db, sample_doctor.id)

        doctor2 = models.Doctor(nombre="Dr. Gomez", color_agenda="#FF0000", activo=True)
        db.add(doctor2)
        db.commit()
        seed_horarios_doctor(db, doctor2.id)

        doctor3 = models.Doctor(nombre="Dr. Inactivo", color_agenda="#00FF00", activo=False)
        db.add(doctor3)
        db.commit()
        seed_horarios_doctor(db, doctor3.id)

        resp = client.get(
            "/api/turnos/slots/bulk",
            params={"fecha_desde": "2026-08-03", "fecha_hasta": "2026-08-09"},
            headers=headers_admin,
        )
        assert resp.status_code == 200
        data = resp.json()

        assert len(data["doctores"]) == 2
        assert sample_doctor.id in data["doctores"]
        assert doctor2.id in data["doctores"]
        assert doctor3.id not in data["doctores"]

        d03 = data["dias"]["2026-08-03"]
        assert d03["total"] == 32
        assert d03["libres"] == 32

    def test_doctor_with_custom_pattern_not_fallback(self, db, client, headers_admin, sample_doctor):
        """Doctor WITH HorarioDoctor rows uses custom pattern, NOT HORARIOS_DEFAULT.
        
        Oracle: seed_horarios_doctor then edit Monday to 08:00-10:00 (4 slots).
        If fallback were used, total would be 20 (HORARIOS_DEFAULT morning+afternoon).
        Asserting 4 proves the configured row is loaded, not the default fallback.
        """
        seed_horarios_doctor(db, sample_doctor.id)

        h_row = db.query(models.HorarioDoctor).filter(
            models.HorarioDoctor.id_doctor == sample_doctor.id,
            models.HorarioDoctor.dia_semana == 0,
        ).first()
        h_row.manana_inicio = time(8, 0)
        h_row.manana_fin = time(10, 0)
        h_row.tarde_inicio = None
        h_row.tarde_fin = None
        db.commit()

        resp = client.get(
            "/api/turnos/slots/bulk",
            params={"fecha_desde": "2026-08-03", "fecha_hasta": "2026-08-03", "id_doctor": str(sample_doctor.id)},
            headers=headers_admin,
        )
        assert resp.status_code == 200
        data = resp.json()
        d03 = data["dias"]["2026-08-03"]
        assert d03["total"] == 4, f"Expected 4 (08:00-10:00), got {d03['total']}. Fallback would give 20."
        assert d03["por_doctor"][str(sample_doctor.id)]["total"] == 4
        assert d03["libres"] == 4

    def test_two_doctors_with_different_patterns(self, db, client, headers_admin, sample_doctor):
        """Doctor 1 works Wed, Doctor 2 has Wed closed → combined 16."""
        seed_horarios_doctor(db, sample_doctor.id)

        doctor2 = models.Doctor(nombre="Dr. Gomez", color_agenda="#FF0000", activo=True)
        db.add(doctor2)
        db.commit()
        seed_horarios_doctor(db, doctor2.id)

        h_row = db.query(models.HorarioDoctor).filter(
            models.HorarioDoctor.id_doctor == doctor2.id,
            models.HorarioDoctor.dia_semana == 2,
        ).first()
        h_row.manana_inicio = None
        h_row.manana_fin = None
        h_row.tarde_inicio = None
        h_row.tarde_fin = None
        db.commit()

        resp = client.get(
            "/api/turnos/slots/bulk",
            params={
                "fecha_desde": "2026-08-03",
                "fecha_hasta": "2026-08-05",
                "id_doctor": f"{sample_doctor.id},{doctor2.id}",
            },
            headers=headers_admin,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["doctores"] == [sample_doctor.id, doctor2.id]

        d05 = data["dias"]["2026-08-05"]
        assert d05["total"] == 16
        assert d05["por_doctor"][str(sample_doctor.id)]["total"] == 16
        assert d05["por_doctor"][str(doctor2.id)]["total"] == 0

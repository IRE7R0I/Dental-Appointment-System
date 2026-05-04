INFO:     Will watch for changes in these directories: ['D:\\____PROYECTOS\\SISTEMA TURNOS ODONTOLOGIA\\Dental-Appointment-System']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [9464] using WatchFiles
INFO:     Started server process [19608]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     127.0.0.1:60203 - "GET /turnos/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:60202 - "GET /finanzas/caja/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:60209 - "GET /finanzas/caja/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:60208 - "GET /turnos/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:65448 - "GET /pacientes/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:58361 - "GET /pacientes/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:53591 - "GET /turnos/?paciente_dni=cristina HTTP/1.1" 200 OK
INFO:     127.0.0.1:53590 - "GET /pacientes/cristina/cuenta HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
    ~~~~~~~~~~~~~~~~~~~~~~~^
        cursor, str_statement, effective_parameters, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\default.py", line 952, in do_execute   
    cursor.execute(statement, parameters)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
psycopg2.errors.UndefinedTable: no existe la relación «cuentas_corrientes»
LINE 3: FROM cuentas_corrientes
             ^


The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 416, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        self.scope, self.receive, self.send
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\uvicorn\middleware\proxy_headers.py", line 60, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\applications.py", line 1159, in __call__
    await super().__call__(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\applications.py", line 90, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\errors.py", line 186, in __call__   
    raise exc
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\errors.py", line 164, in __call__   
    await self.app(scope, receive, _send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\cors.py", line 88, in __call__      
    await self.app(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\exceptions.py", line 63, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 18, in __call__
    await self.app(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\routing.py", line 660, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\routing.py", line 680, in app
    await route.handle(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\routing.py", line 276, in handle
    await self.app(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 134, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 120, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 674, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 330, in run_endpoint_function  
    return await run_in_threadpool(dependant.call, **values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\concurrency.py", line 32, in run_in_threadpool 
    return await anyio.to_thread.run_sync(func)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\anyio\to_thread.py", line 63, in run_sync
    return await get_async_backend().run_sync_in_worker_thread(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        func, args, abandon_on_cancel=abandon_on_cancel, limiter=limiter
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\anyio\_backends\_asyncio.py", line 2518, in run_sync_in_worker_thread
    return await future
           ^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\anyio\_backends\_asyncio.py", line 1002, in run
    result = context.run(func, *args)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\backend\routers\pacientes.py", line 67, in obtener_cuenta_paciente
    cuenta = obtener_o_crear_cuenta(db, dni)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\backend\crud\pacientes.py", line 38, in obtener_o_crear_cuenta
    ).filter(models.CuentaCorriente.dni_paciente == dni).first()
                                                         ~~~~~^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\query.py", line 2759, in first
    return self.limit(1)._iter().first()  # type: ignore
           ~~~~~~~~~~~~~~~~~~~^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\query.py", line 2857, in _iter
    result: Union[ScalarResult[_T], Result[_T]] = self.session.execute(
                                                  ~~~~~~~~~~~~~~~~~~~~^
        statement,
        ^^^^^^^^^^
        params,
        ^^^^^^^
        execution_options={"_sa_orm_load_options": self.load_options},
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\session.py", line 2351, in execute        
    return self._execute_internal(
           ~~~~~~~~~~~~~~~~~~~~~~^
        statement,
        ^^^^^^^^^^
    ...<4 lines>...
        _add_event=_add_event,
        ^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\session.py", line 2249, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(
                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        self,
        ^^^^^
    ...<4 lines>...
        conn,
        ^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\context.py", line 306, in orm_execute_statement
    result = conn.execute(
        statement, params or {}, execution_options=execution_options
    )
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1419, in execute        
    return meth(
        self,
        distilled_parameters,
        execution_options or NO_OPTIONS,
    )
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\sql\elements.py", line 527, in _execute_on_connection
    return connection._execute_clauseelement(
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        self, distilled_params, execution_options
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1641, in _execute_clauseelement
    ret = self._execute_context(
        dialect,
    ...<8 lines>...
        cache_hit=cache_hit,
    )
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1846, in _execute_context
    return self._exec_single_context(
           ~~~~~~~~~~~~~~~~~~~~~~~~~^
        dialect, context, statement, parameters
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1986, in _exec_single_context
    self._handle_dbapi_exception(
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        e, str_statement, effective_parameters, cursor, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 2363, in _handle_dbapi_exception
    raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
    ~~~~~~~~~~~~~~~~~~~~~~~^
        cursor, str_statement, effective_parameters, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\default.py", line 952, in do_execute   
    cursor.execute(statement, parameters)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedTable) no existe la relación «cuentas_corrientes»
LINE 3: FROM cuentas_corrientes
             ^

[SQL: SELECT anon_1.cuentas_corrientes_id AS anon_1_cuentas_corrientes_id, anon_1.cuentas_corrientes_dni_paciente AS anon_1_cuentas_corrientes_dni_paciente, anon_1.cuentas_corrientes_saldo_ars AS anon_1_cuentas_corrientes_saldo_ars, anon_1.cuentas_corrientes_saldo_usd AS anon_1_cuentas_corrientes_saldo_usd, anon_1.cuentas_corrientes_ultima_actualizacion AS anon_1_cuentas_corrientes_ultima_actualizacion, movimientos_cuenta_1.id AS movimientos_cuenta_1_id, movimientos_cuenta_1.id_cuenta AS movimientos_cuenta_1_id_cuenta, movimientos_cuenta_1.tipo AS movimientos_cuenta_1_tipo, movimientos_cuenta_1.monto AS movimientos_cuenta_1_monto, movimientos_cuenta_1.moneda AS movimientos_cuenta_1_moneda, movimientos_cuenta_1.descripcion AS movimientos_cuenta_1_descripcion, movimientos_cuenta_1.fecha AS movimientos_cuenta_1_fecha
FROM (SELECT cuentas_corrientes.id AS cuentas_corrientes_id, cuentas_corrientes.dni_paciente AS cuentas_corrientes_dni_paciente, cuentas_corrientes.saldo_ars AS cuentas_corrientes_saldo_ars, cuentas_corrientes.saldo_usd AS cuentas_corrientes_saldo_usd, cuentas_corrientes.ultima_actualizacion AS cuentas_corrientes_ultima_actualizacion
FROM cuentas_corrientes
WHERE cuentas_corrientes.dni_paciente = %(dni_paciente_1)s
 LIMIT %(param_1)s) AS anon_1 LEFT OUTER JOIN movimientos_cuenta AS movimientos_cuenta_1 ON anon_1.cuentas_corrientes_id = movimientos_cuenta_1.id_cuenta ORDER BY movimientos_cuenta_1.fecha DESC]
[parameters: {'dni_paciente_1': 'cristina', 'param_1': 1}]
(Background on this error at: https://sqlalche.me/e/20/f405)
INFO:     127.0.0.1:49598 - "GET /turnos/?fecha=2026-04-28 HTTP/1.1" 200 OK
INFO:     127.0.0.1:49597 - "GET /doctores/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:64691 - "GET /turnos/?fecha=2026-04-28 HTTP/1.1" 200 OK
INFO:     127.0.0.1:64693 - "GET /doctores/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:65284 - "GET /pacientes/43638399 HTTP/1.1" 404 Not Found
INFO:     127.0.0.1:57604 - "GET /finanzas/caja/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:57605 - "GET /pacientes/deudores HTTP/1.1" 404 Not Found
INFO:     127.0.0.1:52462 - "GET /finanzas/caja/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:52464 - "GET /pacientes/deudores HTTP/1.1" 404 Not Found
INFO:     127.0.0.1:57607 - "GET /turnos/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:63378 - "GET /turnos/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:55314 - "GET /pacientes/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:65365 - "GET /pacientes/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:57121 - "POST /pacientes/ HTTP/1.1" 201 Created
INFO:     127.0.0.1:60423 - "GET /turnos/?paciente_dni=43638399 HTTP/1.1" 200 OK
INFO:     127.0.0.1:60422 - "GET /pacientes/43638399/cuenta HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
    ~~~~~~~~~~~~~~~~~~~~~~~^
        cursor, str_statement, effective_parameters, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\default.py", line 952, in do_execute   
    cursor.execute(statement, parameters)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
psycopg2.errors.UndefinedTable: no existe la relación «cuentas_corrientes»
LINE 3: FROM cuentas_corrientes
             ^


The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 416, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        self.scope, self.receive, self.send
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\uvicorn\middleware\proxy_headers.py", line 60, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\applications.py", line 1159, in __call__
    await super().__call__(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\applications.py", line 90, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\errors.py", line 186, in __call__   
    raise exc
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\errors.py", line 164, in __call__   
    await self.app(scope, receive, _send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\cors.py", line 88, in __call__      
    await self.app(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\exceptions.py", line 63, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 18, in __call__
    await self.app(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\routing.py", line 660, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\routing.py", line 680, in app
    await route.handle(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\routing.py", line 276, in handle
    await self.app(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 134, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 120, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 674, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 330, in run_endpoint_function  
    return await run_in_threadpool(dependant.call, **values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\concurrency.py", line 32, in run_in_threadpool 
    return await anyio.to_thread.run_sync(func)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\anyio\to_thread.py", line 63, in run_sync
    return await get_async_backend().run_sync_in_worker_thread(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        func, args, abandon_on_cancel=abandon_on_cancel, limiter=limiter
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\anyio\_backends\_asyncio.py", line 2518, in run_sync_in_worker_thread
    return await future
           ^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\anyio\_backends\_asyncio.py", line 1002, in run
    result = context.run(func, *args)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\backend\routers\pacientes.py", line 67, in obtener_cuenta_paciente
    cuenta = obtener_o_crear_cuenta(db, dni)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\backend\crud\pacientes.py", line 38, in obtener_o_crear_cuenta
    ).filter(models.CuentaCorriente.dni_paciente == dni).first()
                                                         ~~~~~^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\query.py", line 2759, in first
    return self.limit(1)._iter().first()  # type: ignore
           ~~~~~~~~~~~~~~~~~~~^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\query.py", line 2857, in _iter
    result: Union[ScalarResult[_T], Result[_T]] = self.session.execute(
                                                  ~~~~~~~~~~~~~~~~~~~~^
        statement,
        ^^^^^^^^^^
        params,
        ^^^^^^^
        execution_options={"_sa_orm_load_options": self.load_options},
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\session.py", line 2351, in execute        
    return self._execute_internal(
           ~~~~~~~~~~~~~~~~~~~~~~^
        statement,
        ^^^^^^^^^^
    ...<4 lines>...
        _add_event=_add_event,
        ^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\session.py", line 2249, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(
                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        self,
        ^^^^^
    ...<4 lines>...
        conn,
        ^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\context.py", line 306, in orm_execute_statement
    result = conn.execute(
        statement, params or {}, execution_options=execution_options
    )
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1419, in execute        
    return meth(
        self,
        distilled_parameters,
        execution_options or NO_OPTIONS,
    )
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\sql\elements.py", line 527, in _execute_on_connection
    return connection._execute_clauseelement(
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        self, distilled_params, execution_options
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1641, in _execute_clauseelement
    ret = self._execute_context(
        dialect,
    ...<8 lines>...
        cache_hit=cache_hit,
    )
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1846, in _execute_context
    return self._exec_single_context(
           ~~~~~~~~~~~~~~~~~~~~~~~~~^
        dialect, context, statement, parameters
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1986, in _exec_single_context
    self._handle_dbapi_exception(
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        e, str_statement, effective_parameters, cursor, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 2363, in _handle_dbapi_exception
    raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
    ~~~~~~~~~~~~~~~~~~~~~~~^
        cursor, str_statement, effective_parameters, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\default.py", line 952, in do_execute   
    cursor.execute(statement, parameters)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedTable) no existe la relación «cuentas_corrientes»
LINE 3: FROM cuentas_corrientes
             ^

[SQL: SELECT anon_1.cuentas_corrientes_id AS anon_1_cuentas_corrientes_id, anon_1.cuentas_corrientes_dni_paciente AS anon_1_cuentas_corrientes_dni_paciente, anon_1.cuentas_corrientes_saldo_ars AS anon_1_cuentas_corrientes_saldo_ars, anon_1.cuentas_corrientes_saldo_usd AS anon_1_cuentas_corrientes_saldo_usd, anon_1.cuentas_corrientes_ultima_actualizacion AS anon_1_cuentas_corrientes_ultima_actualizacion, movimientos_cuenta_1.id AS movimientos_cuenta_1_id, movimientos_cuenta_1.id_cuenta AS movimientos_cuenta_1_id_cuenta, movimientos_cuenta_1.tipo AS movimientos_cuenta_1_tipo, movimientos_cuenta_1.monto AS movimientos_cuenta_1_monto, movimientos_cuenta_1.moneda AS movimientos_cuenta_1_moneda, movimientos_cuenta_1.descripcion AS movimientos_cuenta_1_descripcion, movimientos_cuenta_1.fecha AS movimientos_cuenta_1_fecha
FROM (SELECT cuentas_corrientes.id AS cuentas_corrientes_id, cuentas_corrientes.dni_paciente AS cuentas_corrientes_dni_paciente, cuentas_corrientes.saldo_ars AS cuentas_corrientes_saldo_ars, cuentas_corrientes.saldo_usd AS cuentas_corrientes_saldo_usd, cuentas_corrientes.ultima_actualizacion AS cuentas_corrientes_ultima_actualizacion
FROM cuentas_corrientes
WHERE cuentas_corrientes.dni_paciente = %(dni_paciente_1)s
 LIMIT %(param_1)s) AS anon_1 LEFT OUTER JOIN movimientos_cuenta AS movimientos_cuenta_1 ON anon_1.cuentas_corrientes_id = movimientos_cuenta_1.id_cuenta ORDER BY movimientos_cuenta_1.fecha DESC]
[parameters: {'dni_paciente_1': '43638399', 'param_1': 1}]
(Background on this error at: https://sqlalche.me/e/20/f405)
INFO:     127.0.0.1:55664 - "GET /turnos/?fecha=2026-04-28 HTTP/1.1" 200 OK
INFO:     127.0.0.1:55662 - "GET /doctores/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:52579 - "GET /doctores/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:52578 - "GET /turnos/?fecha=2026-04-28 HTTP/1.1" 200 OK
INFO:     127.0.0.1:54737 - "GET /turnos/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:54736 - "GET /finanzas/caja/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:50698 - "GET /turnos/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:50700 - "GET /finanzas/caja/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:63697 - "GET /pacientes/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:55441 - "GET /pacientes/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:52679 - "GET /finanzas/caja/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:52680 - "GET /turnos/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:57150 - "GET /finanzas/caja/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:57152 - "GET /turnos/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:56537 - "GET /turnos/?fecha=2026-04-28 HTTP/1.1" 200 OK
INFO:     127.0.0.1:56535 - "GET /doctores/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:54458 - "GET /turnos/?fecha=2026-04-28 HTTP/1.1" 200 OK
INFO:     127.0.0.1:54460 - "GET /doctores/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:49308 - "GET /finanzas/caja/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:49309 - "GET /turnos/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:65245 - "GET /finanzas/caja/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:65247 - "GET /turnos/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:62143 - "GET /doctores/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:62145 - "GET /turnos/?fecha=2026-04-28 HTTP/1.1" 200 OK
INFO:     127.0.0.1:52220 - "GET /doctores/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:52222 - "GET /turnos/?fecha=2026-04-28 HTTP/1.1" 200 OK
INFO:     127.0.0.1:57664 - "GET /pacientes/43638399 HTTP/1.1" 200 OK
INFO:     127.0.0.1:64022 - "POST /turnos/ HTTP/1.1" 201 Created
INFO:     127.0.0.1:49843 - "GET /turnos/?fecha=2026-04-28 HTTP/1.1" 200 OK
INFO:     127.0.0.1:59703 - "GET /finanzas/caja/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:59704 - "GET /turnos/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:57305 - "GET /finanzas/caja/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:57307 - "GET /turnos/hoy HTTP/1.1" 200 OK
INFO:     127.0.0.1:60702 - "GET /pacientes/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:62134 - "GET /pacientes/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:51975 - "GET /turnos/?paciente_dni=43638399 HTTP/1.1" 200 OK
INFO:     127.0.0.1:51973 - "GET /pacientes/43638399/cuenta HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
    ~~~~~~~~~~~~~~~~~~~~~~~^
        cursor, str_statement, effective_parameters, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\default.py", line 952, in do_execute   
    cursor.execute(statement, parameters)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
psycopg2.errors.UndefinedTable: no existe la relación «cuentas_corrientes»
LINE 3: FROM cuentas_corrientes
             ^


The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 416, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        self.scope, self.receive, self.send
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\uvicorn\middleware\proxy_headers.py", line 60, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\applications.py", line 1159, in __call__
    await super().__call__(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\applications.py", line 90, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\errors.py", line 186, in __call__   
    raise exc
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\errors.py", line 164, in __call__   
    await self.app(scope, receive, _send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\cors.py", line 88, in __call__      
    await self.app(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\exceptions.py", line 63, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 18, in __call__
    await self.app(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\routing.py", line 660, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\routing.py", line 680, in app
    await route.handle(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\routing.py", line 276, in handle
    await self.app(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 134, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 120, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 674, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 330, in run_endpoint_function  
    return await run_in_threadpool(dependant.call, **values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\concurrency.py", line 32, in run_in_threadpool 
    return await anyio.to_thread.run_sync(func)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\anyio\to_thread.py", line 63, in run_sync
    return await get_async_backend().run_sync_in_worker_thread(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        func, args, abandon_on_cancel=abandon_on_cancel, limiter=limiter
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\anyio\_backends\_asyncio.py", line 2518, in run_sync_in_worker_thread
    return await future
           ^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\anyio\_backends\_asyncio.py", line 1002, in run
    result = context.run(func, *args)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\backend\routers\pacientes.py", line 67, in obtener_cuenta_paciente
    cuenta = obtener_o_crear_cuenta(db, dni)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\backend\crud\pacientes.py", line 38, in obtener_o_crear_cuenta
    ).filter(models.CuentaCorriente.dni_paciente == dni).first()
                                                         ~~~~~^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\query.py", line 2759, in first
    return self.limit(1)._iter().first()  # type: ignore
           ~~~~~~~~~~~~~~~~~~~^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\query.py", line 2857, in _iter
    result: Union[ScalarResult[_T], Result[_T]] = self.session.execute(
                                                  ~~~~~~~~~~~~~~~~~~~~^
        statement,
        ^^^^^^^^^^
        params,
        ^^^^^^^
        execution_options={"_sa_orm_load_options": self.load_options},
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\session.py", line 2351, in execute        
    return self._execute_internal(
           ~~~~~~~~~~~~~~~~~~~~~~^
        statement,
        ^^^^^^^^^^
    ...<4 lines>...
        _add_event=_add_event,
        ^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\session.py", line 2249, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(
                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        self,
        ^^^^^
    ...<4 lines>...
        conn,
        ^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\context.py", line 306, in orm_execute_statement
    result = conn.execute(
        statement, params or {}, execution_options=execution_options
    )
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1419, in execute        
    return meth(
        self,
        distilled_parameters,
        execution_options or NO_OPTIONS,
    )
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\sql\elements.py", line 527, in _execute_on_connection
    return connection._execute_clauseelement(
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        self, distilled_params, execution_options
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1641, in _execute_clauseelement
    ret = self._execute_context(
        dialect,
    ...<8 lines>...
        cache_hit=cache_hit,
    )
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1846, in _execute_context
    return self._exec_single_context(
           ~~~~~~~~~~~~~~~~~~~~~~~~~^
        dialect, context, statement, parameters
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1986, in _exec_single_context
    self._handle_dbapi_exception(
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        e, str_statement, effective_parameters, cursor, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 2363, in _handle_dbapi_exception
    raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
    ~~~~~~~~~~~~~~~~~~~~~~~^
        cursor, str_statement, effective_parameters, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\default.py", line 952, in do_execute   
    cursor.execute(statement, parameters)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedTable) no existe la relación «cuentas_corrientes»
LINE 3: FROM cuentas_corrientes
             ^

[SQL: SELECT anon_1.cuentas_corrientes_id AS anon_1_cuentas_corrientes_id, anon_1.cuentas_corrientes_dni_paciente AS anon_1_cuentas_corrientes_dni_paciente, anon_1.cuentas_corrientes_saldo_ars AS anon_1_cuentas_corrientes_saldo_ars, anon_1.cuentas_corrientes_saldo_usd AS anon_1_cuentas_corrientes_saldo_usd, anon_1.cuentas_corrientes_ultima_actualizacion AS anon_1_cuentas_corrientes_ultima_actualizacion, movimientos_cuenta_1.id AS movimientos_cuenta_1_id, movimientos_cuenta_1.id_cuenta AS movimientos_cuenta_1_id_cuenta, movimientos_cuenta_1.tipo AS movimientos_cuenta_1_tipo, movimientos_cuenta_1.monto AS movimientos_cuenta_1_monto, movimientos_cuenta_1.moneda AS movimientos_cuenta_1_moneda, movimientos_cuenta_1.descripcion AS movimientos_cuenta_1_descripcion, movimientos_cuenta_1.fecha AS movimientos_cuenta_1_fecha
FROM (SELECT cuentas_corrientes.id AS cuentas_corrientes_id, cuentas_corrientes.dni_paciente AS cuentas_corrientes_dni_paciente, cuentas_corrientes.saldo_ars AS cuentas_corrientes_saldo_ars, cuentas_corrientes.saldo_usd AS cuentas_corrientes_saldo_usd, cuentas_corrientes.ultima_actualizacion AS cuentas_corrientes_ultima_actualizacion
FROM cuentas_corrientes
WHERE cuentas_corrientes.dni_paciente = %(dni_paciente_1)s
 LIMIT %(param_1)s) AS anon_1 LEFT OUTER JOIN movimientos_cuenta AS movimientos_cuenta_1 ON anon_1.cuentas_corrientes_id = movimientos_cuenta_1.id_cuenta ORDER BY movimientos_cuenta_1.fecha DESC]
[parameters: {'dni_paciente_1': '43638399', 'param_1': 1}]
(Background on this error at: https://sqlalche.me/e/20/f405)
INFO:     127.0.0.1:54201 - "GET /pacientes/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:54203 - "GET /pacientes/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:59414 - "GET /turnos/?paciente_dni=43638399 HTTP/1.1" 200 OK
INFO:     127.0.0.1:59413 - "GET /pacientes/43638399/cuenta HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
    ~~~~~~~~~~~~~~~~~~~~~~~^
        cursor, str_statement, effective_parameters, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\default.py", line 952, in do_execute   
    cursor.execute(statement, parameters)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
psycopg2.errors.UndefinedTable: no existe la relación «cuentas_corrientes»
LINE 3: FROM cuentas_corrientes
             ^


The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 416, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        self.scope, self.receive, self.send
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\uvicorn\middleware\proxy_headers.py", line 60, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\applications.py", line 1159, in __call__
    await super().__call__(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\applications.py", line 90, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\errors.py", line 186, in __call__   
    raise exc
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\errors.py", line 164, in __call__   
    await self.app(scope, receive, _send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\cors.py", line 88, in __call__      
    await self.app(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\middleware\exceptions.py", line 63, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 18, in __call__
    await self.app(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\routing.py", line 660, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\routing.py", line 680, in app
    await route.handle(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\routing.py", line 276, in handle
    await self.app(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 134, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 120, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 674, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\fastapi\routing.py", line 330, in run_endpoint_function  
    return await run_in_threadpool(dependant.call, **values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\starlette\concurrency.py", line 32, in run_in_threadpool 
    return await anyio.to_thread.run_sync(func)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\anyio\to_thread.py", line 63, in run_sync
    return await get_async_backend().run_sync_in_worker_thread(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        func, args, abandon_on_cancel=abandon_on_cancel, limiter=limiter
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\anyio\_backends\_asyncio.py", line 2518, in run_sync_in_worker_thread
    return await future
           ^^^^^^^^^^^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\anyio\_backends\_asyncio.py", line 1002, in run
    result = context.run(func, *args)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\backend\routers\pacientes.py", line 67, in obtener_cuenta_paciente
    cuenta = obtener_o_crear_cuenta(db, dni)
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\backend\crud\pacientes.py", line 38, in obtener_o_crear_cuenta
    ).filter(models.CuentaCorriente.dni_paciente == dni).first()
                                                         ~~~~~^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\query.py", line 2759, in first
    return self.limit(1)._iter().first()  # type: ignore
           ~~~~~~~~~~~~~~~~~~~^^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\query.py", line 2857, in _iter
    result: Union[ScalarResult[_T], Result[_T]] = self.session.execute(
                                                  ~~~~~~~~~~~~~~~~~~~~^
        statement,
        ^^^^^^^^^^
        params,
        ^^^^^^^
        execution_options={"_sa_orm_load_options": self.load_options},
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\session.py", line 2351, in execute        
    return self._execute_internal(
           ~~~~~~~~~~~~~~~~~~~~~~^
        statement,
        ^^^^^^^^^^
    ...<4 lines>...
        _add_event=_add_event,
        ^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\session.py", line 2249, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(
                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        self,
        ^^^^^
    ...<4 lines>...
        conn,
        ^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\orm\context.py", line 306, in orm_execute_statement
    result = conn.execute(
        statement, params or {}, execution_options=execution_options
    )
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1419, in execute        
    return meth(
        self,
        distilled_parameters,
        execution_options or NO_OPTIONS,
    )
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\sql\elements.py", line 527, in _execute_on_connection
    return connection._execute_clauseelement(
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        self, distilled_params, execution_options
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1641, in _execute_clauseelement
    ret = self._execute_context(
        dialect,
    ...<8 lines>...
        cache_hit=cache_hit,
    )
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1846, in _execute_context
    return self._exec_single_context(
           ~~~~~~~~~~~~~~~~~~~~~~~~~^
        dialect, context, statement, parameters
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1986, in _exec_single_context
    self._handle_dbapi_exception(
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
        e, str_statement, effective_parameters, cursor, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 2363, in _handle_dbapi_exception
    raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
    ~~~~~~~~~~~~~~~~~~~~~~~^
        cursor, str_statement, effective_parameters, context
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\____PROYECTOS\SISTEMA TURNOS ODONTOLOGIA\Dental-Appointment-System\venv\Lib\site-packages\sqlalchemy\engine\default.py", line 952, in do_execute   
    cursor.execute(statement, parameters)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedTable) no existe la relación «cuentas_corrientes»
LINE 3: FROM cuentas_corrientes
             ^

[SQL: SELECT anon_1.cuentas_corrientes_id AS anon_1_cuentas_corrientes_id, anon_1.cuentas_corrientes_dni_paciente AS anon_1_cuentas_corrientes_dni_paciente, anon_1.cuentas_corrientes_saldo_ars AS anon_1_cuentas_corrientes_saldo_ars, anon_1.cuentas_corrientes_saldo_usd AS anon_1_cuentas_corrientes_saldo_usd, anon_1.cuentas_corrientes_ultima_actualizacion AS anon_1_cuentas_corrientes_ultima_actualizacion, movimientos_cuenta_1.id AS movimientos_cuenta_1_id, movimientos_cuenta_1.id_cuenta AS movimientos_cuenta_1_id_cuenta, movimientos_cuenta_1.tipo AS movimientos_cuenta_1_tipo, movimientos_cuenta_1.monto AS movimientos_cuenta_1_monto, movimientos_cuenta_1.moneda AS movimientos_cuenta_1_moneda, movimientos_cuenta_1.descripcion AS movimientos_cuenta_1_descripcion, movimientos_cuenta_1.fecha AS movimientos_cuenta_1_fecha
FROM (SELECT cuentas_corrientes.id AS cuentas_corrientes_id, cuentas_corrientes.dni_paciente AS cuentas_corrientes_dni_paciente, cuentas_corrientes.saldo_ars AS cuentas_corrientes_saldo_ars, cuentas_corrientes.saldo_usd AS cuentas_corrientes_saldo_usd, cuentas_corrientes.ultima_actualizacion AS cuentas_corrientes_ultima_actualizacion
FROM cuentas_corrientes
WHERE cuentas_corrientes.dni_paciente = %(dni_paciente_1)s
 LIMIT %(param_1)s) AS anon_1 LEFT OUTER JOIN movimientos_cuenta AS movimientos_cuenta_1 ON anon_1.cuentas_corrientes_id = movimientos_cuenta_1.id_cuenta ORDER BY movimientos_cuenta_1.fecha DESC]
[parameters: {'dni_paciente_1': '43638399', 'param_1': 1}]
(Background on this error at: https://sqlalche.me/e/20/f405)
INFO:     127.0.0.1:53796 - "GET /doctores/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:53797 - "GET /turnos/?fecha=2026-04-28 HTTP/1.1" 200 OK
INFO:     127.0.0.1:54750 - "GET /doctores/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:54752 - "GET /turnos/?fecha=2026-04-28 HTTP/1.1" 200 OK
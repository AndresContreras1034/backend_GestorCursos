# Backend Gestor de Cursos

API REST para la plataforma de gestión de cursos, estudiantes y docentes. El backend usa Node.js y Express, organiza la lógica por capas y persiste los datos en SQLite.

## Tecnologías

- Node.js y Express 5.
- SQLite mediante `better-sqlite3`.
- Migraciones SQL aplicadas automáticamente al iniciar la conexión.
- Swagger UI para consultar la especificación de la API.

## Requisitos

- Node.js LTS compatible con `better-sqlite3` 13 y npm.
- En Windows, herramientas compatibles con la instalación de módulos nativos de Node.js si no hay un binario precompilado disponible.

## Instalación y ejecución

Desde la carpeta del backend:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Para iniciar el servidor sin modo de desarrollo:

```powershell
npm start
```

El servidor escucha en el puerto `3000` de forma predeterminada. Puedes definir `PORT` para cambiarlo. La documentación interactiva está en `http://localhost:3000/api-docs`.

La integración con DeepSeek es opcional. Si se usa, configura `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` y `DEEPSEEK_API_URL` en `.env`; no guardes credenciales en el repositorio.

## Base de datos

Por defecto, SQLite crea `database.sqlite` en la raíz del backend. Se puede cambiar la ubicación con `DB_PATH`. Al iniciar, el backend ejecuta las migraciones `.sql` de `src/database/migrations` que todavía no estén registradas. WAL, claves foráneas y espera ante bloqueos se configuran en la conexión.

Conserva una copia de seguridad antes de reemplazar o migrar una base de datos con información real.

## API y organización del código

Las rutas se publican bajo `/api`, incluyendo autenticación, usuarios, cursos, inscripciones, recursos, evaluaciones y formularios. La documentación OpenAPI generada se sirve en `/api-docs`.

- `src/routes`: endpoints HTTP y documentación Swagger.
- `src/controllers`: adaptación de solicitudes y respuestas.
- `src/services`: reglas de negocio.
- `src/repository`: consultas y operaciones de persistencia.
- `src/database`: conexión y migraciones SQLite.

La aplicación Android usa `http://10.0.2.2:3000/api/` en el emulador para conectarse al backend local. Consulta el [README del frontend](https://github.com/AndresContreras1034/Front-End-Gestor-Cursos) para configurar otros dispositivos.

## Pruebas

Hay ejemplos de solicitudes manuales en `docs/`. El plan `availability-test.jmx` de Apache JMeter 5.6.3 prueba `GET /api/cursos` (espera HTTP 200) y un inicio de sesión con cuerpo vacío (espera HTTP 401). Ejecuta el backend local antes de correrlo:

```powershell
jmeter -n -t availability-test.jmx -Jthreads=100 -Jramp=60 -l resultados.jtl
```

Este plan mide respuestas de dos rutas en una instancia local; no demuestra autenticación exitosa, alta disponibilidad ni recuperación ante fallos. El script `npm test` todavía es un marcador de posición y no ejecuta una suite automatizada.


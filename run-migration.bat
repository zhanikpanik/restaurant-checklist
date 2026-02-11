@echo off
echo Running database migration...
echo.

REM Add PostgreSQL to PATH
set PATH=%PATH%;C:\Program Files\PostgreSQL\18\bin

REM Run the migration using Railway
railway connect Postgres-gk3Q

pause

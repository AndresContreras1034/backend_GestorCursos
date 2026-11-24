@echo off
setlocal
title Pruebas cURL progresivas - reinicio y ejecución
cd /d "%~dp0"

echo ============================================================
echo Reiniciando database.sqlite
echo Ejecutando endpoints paso a paso
echo ============================================================

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0docs\pruebas-curl-progresivas.ps1"
if errorlevel 1 (
    echo.
    echo Se produjo un error. Revisa el detalle anterior.
    pause
    exit /b 1
)

echo.
echo Prueba finalizada. Reporte:
echo "%~dp0docs\pruebas-curl-progresivas.txt"
pause

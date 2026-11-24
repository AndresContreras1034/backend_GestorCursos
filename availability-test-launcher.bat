@echo off
setlocal
title JMeter - Laboratorio de disponibilidad

set "PLAN=%~dp0availability-test.jmx"
set "JMETER_BAT=C:\Users\toonk\Downloads\apache-jmeter-5.6.3\bin\jmeter.bat"

if not exist "%JMETER_BAT%" (
    echo ERROR: No se encontro JMeter en:
    echo "%JMETER_BAT%"
    goto failed
)

if not exist "%PLAN%" (
    echo ERROR: No se encontro el plan:
    echo "%PLAN%"
    goto failed
)

curl.exe -fsS --max-time 3 -o NUL http://127.0.0.1:3000/api/cursos
if errorlevel 1 (
    echo ERROR: El servidor no responde en http://127.0.0.1:3000.
    echo Inicia el backend antes de ejecutar las pruebas.
    goto failed
)

for /f "delims=" %%I in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "RUN_ID=%%I"
if not defined RUN_ID (
    echo ERROR: No se pudo crear el identificador de esta ejecucion.
    goto failed
)

set "RESULTS=%~dp0resultados\%RUN_ID%"
if exist "%RESULTS%" (
    echo ERROR: La carpeta de resultados ya existe:
    echo "%RESULTS%"
    goto failed
)
mkdir "%RESULTS%"
if errorlevel 1 (
    echo ERROR: No se pudo crear la carpeta de resultados.
    goto failed
)

echo.
echo JMeter ejecutara las 9 iteraciones del laboratorio.
echo Plan: %PLAN%
echo Resultados: %RESULTS%
echo.

call :run t1_r1 1 1 || goto failed
call :run t10_r1 10 1 || goto failed
call :run t100_r1 100 1 || goto failed
call :run t100_r30 100 30 || goto failed
call :run t100_r60 100 60 || goto failed
call :run t100_r100 100 100 || goto failed
call :run t500_r30 500 30 || goto failed
call :run t500_r60 500 60 || goto failed
call :run t1000_r60 1000 60 || goto failed

echo.
echo Todas las iteraciones finalizaron.
echo Archivos JTL y logs guardados en:
echo "%RESULTS%"
pause
exit /b 0

:run
echo.
echo ============================================================
echo Ejecutando %~1: %~2 hilos, ramp-up %~3 s
echo ============================================================
call "%JMETER_BAT%" -n -t "%PLAN%" "-Jthreads=%~2" "-Jramp=%~3" -l "%RESULTS%\%~1.jtl" -j "%RESULTS%\%~1.log"
if errorlevel 1 (
    echo ERROR: JMeter fallo en la iteracion %~1.
    exit /b 1
)
exit /b 0

:failed
echo.
echo La ejecucion se detuvo. Revisa el mensaje anterior y los logs disponibles.
pause
exit /b 1

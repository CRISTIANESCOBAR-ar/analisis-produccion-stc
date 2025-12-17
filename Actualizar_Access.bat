@echo off
title Actualizando Base de Datos Access (STC)...
color 1F

echo ========================================================
echo      SISTEMA DE EXPORTACION A ACCESS (LEGACY)
echo ========================================================
echo.
echo Iniciando proceso de actualizacion...
echo Por favor espere, esto puede tomar unos minutos.
echo.

powershell.exe -ExecutionPolicy Bypass -File "c:\analisis-produccion-stc\scripts\export-all-to-access.ps1"

if %ERRORLEVEL% EQU 0 (
    color 2F
    echo.
    echo ========================================================
    echo      PROCESO COMPLETADO EXITOSAMENTE
    echo ========================================================
) else (
    color 4F
    echo.
    echo ========================================================
    echo      OCURRIO UN ERROR
    echo ========================================================
)

echo.
pause

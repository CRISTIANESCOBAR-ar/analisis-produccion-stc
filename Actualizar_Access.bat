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

rem Medir tiempo total desde el .BAT
powershell.exe -ExecutionPolicy Bypass -NoLogo -Command "^
    $start = Get-Date; ^
    & 'c:\analisis-produccion-stc\scripts\export-all-to-access.ps1'; ^
    $code = $LASTEXITCODE; ^
    $elapsed = (Get-Date) - $start; ^
    Write-Host ('`nTiempo total (BAT): {0:N2} minutos ({1:N2} segundos)' -f $elapsed.TotalMinutes, $elapsed.TotalSeconds) -ForegroundColor Yellow; ^
    exit $code ^
"

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

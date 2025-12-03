@echo off
REM Script para exportar Access usando Python 32-bit portable
echo Descargando Python 3.12 32-bit embeddable...
powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-win32.zip' -OutFile '%TEMP%\python32.zip'"

echo Extrayendo...
powershell -Command "Expand-Archive -Path '%TEMP%\python32.zip' -DestinationPath '%~dp0python32' -Force"

echo Descargando get-pip.py...
powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%~dp0python32\get-pip.py'"

echo Configurando pip...
cd /d "%~dp0python32"
python.exe get-pip.py

echo Instalando pyodbc...
python.exe -m pip install pyodbc

echo Ejecutando exportación...
python.exe "%~dp0export-access.py"

pause

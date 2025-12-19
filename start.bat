@echo off
echo ========================================
echo   Ajedrez P2P - Iniciando
echo ========================================
echo.

REM Verificar si node_modules existe
if not exist "node_modules\" (
    echo [!] Dependencias no encontradas
    echo [*] Instalando dependencias...
    echo     Este proceso puede tardar unos minutos...
    echo.
    call npm install
    echo.
    echo [OK] Dependencias instaladas correctamente
    echo.
)

echo [*] Iniciando servidor de desarrollo...
echo [i] Presiona Ctrl+C para detener el servidor
echo [i] El navegador se abrirá automáticamente
echo.

REM Esperar 3 segundos y abrir el navegador
timeout /t 3 /nobreak >nul
start http://localhost:5173

cmd /k npm start

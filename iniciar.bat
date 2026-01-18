@echo off
if not defined MINIMIZED set MINIMIZED=1 && start /min "" "%~dpnx0" && exit
title Servidor Local - Protocolo (NO CERRAR)
echo Servidor iniciado (minimizado)...
start http://localhost:8000/index.html
python -m http.server 8000
pause
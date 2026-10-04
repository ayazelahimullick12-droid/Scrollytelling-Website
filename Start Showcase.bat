@echo off
title Project Showcase - keep this window open while presenting
cd /d "%~dp0"
set PY=python
where python >nul 2>nul || set PY=py
echo.
echo   Serving the showcase at http://localhost:8080
echo   Keep this window open while presenting. Close it to stop.
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080/"
%PY% -m http.server 8080 --bind 127.0.0.1

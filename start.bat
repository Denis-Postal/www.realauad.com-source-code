@echo off
cd /d "%~dp0"


start chrome "http://localhost:1010"
python -m http.server 1010

pause

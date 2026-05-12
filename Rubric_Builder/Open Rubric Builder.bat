@echo off
setlocal
cd /d "%~dp0"
(for %%f in ("program\datasets\data*.js") do type "%%f") > "program\datasets\_all.js"
start "" "program\index.html"

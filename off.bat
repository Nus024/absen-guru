@echo off
title Stop Bot 2026

for /f "tokens=2" %%a in (
    'wmic process where "name='node.exe' and commandline like '%%index.js%%'" get processid /value ^| find "="'
) do (
    taskkill /F /PID %%a
)

echo Bot dihentikan.
timeout /t 2 >nul
exit
@echo off
color 0A
set "BOT_DIR=d:\NUS\AbsenNew\Bot 2026"

:: Cek apakah proses node.exe yang menjalankan index.js sedang aktif menggunakan PowerShell
powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process -Filter \"Name='node.exe' AND CommandLine LIKE '%%index.js%%'\"; if ($p) { exit 0 } else { exit 1 }"
if "%ERRORLEVEL%"=="0" goto turn_off
goto turn_on

:turn_off
echo =======================================
echo   SISTEM BOT WHATSAPP ABSENSI GURU
echo =======================================
echo.
echo Status Saat Ini : MENYALA [ON]
echo.
echo Mematikan Bot secara paksa...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe' AND CommandLine LIKE '%%index.js%%'\" | Invoke-CimMethod -MethodName Terminate" >nul 2>&1

:: Tutup juga jendela cmd lama jika masih ada yang tersangkut
taskkill /FI "WINDOWTITLE eq AbsensiBotSystem" /F >nul 2>&1

echo.
echo Bot Berhasil DIMATIKAN secara total!
echo Jendela ini akan tertutup otomatis dalam 10 detik...
ping 127.0.0.1 -n 11 >nul
exit

:turn_on
echo =======================================
echo   SISTEM BOT WHATSAPP ABSENSI GURU
echo =======================================
echo.
echo Status Saat Ini : MATI [OFF]
echo.
echo Menyalakan Bot di Latar Belakang (Tersembunyi)...

:: Menggunakan wscript ke file run-hidden.vbs yang sudah terbukti bekerja normal
wscript.exe "%BOT_DIR%\run-hidden.vbs"

echo.
echo Bot Berhasil DINYALAKAN secara rahasia di latar belakang komputer!
echo Jendela Info ini akan tertutup otomatis dalam 10 detik...
ping 127.0.0.1 -n 11 >nul
exit

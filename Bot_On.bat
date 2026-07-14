@echo off
title KONTROL BOT ABSENSI
color 0E
setlocal enabledelayedexpansion

:: Ambil parameter pertama
set "PARAM=%~1"
if not "%PARAM%"=="" (
    set "MODE=%PARAM%"
    goto process_param
)

:menu
cls
echo ===================================================
echo           KONTROL UTAMA BOT ABSENSI WA
echo ===================================================
echo(
:: Cek Status Bot A
powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process -Filter \"Name='node.exe' AND CommandLine LIKE '%%--botname=absen-2026%%'\"; if ($p) { exit 0 } else { exit 1 }"
if "%ERRORLEVEL%"=="0" (
    set "STATUS_A=AKTIF [ON]"
) else (
    set "STATUS_A=MATI [OFF]"
)

:: Cek Status Bot B
powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process -Filter \"Name='node.exe' AND CommandLine LIKE '%%--botname=bot-asatid%%'\"; if ($p) { exit 0 } else { exit 1 }"
if "%ERRORLEVEL%"=="0" (
    set "STATUS_B=AKTIF [ON]"
) else (
    set "STATUS_B=MATI [OFF]"
)

echo 1. Status Bot A (Siang - 2026)  : %STATUS_A%
echo 2. Status Bot B (Malam - Asatid) : %STATUS_B%
echo(
echo ===================================================
echo PILIH TINDAKAN:
echo ---------------------------------------------------
echo [1] Aktifkan Bot A (Siang) [Otomatis Matikan Bot B]
echo [2] Aktifkan Bot B (Malam) [Otomatis Matikan Bot A]
echo [3] Matikan Semua Bot (A dan B)
echo [4] Mode Otomatis (Aktifkan Berdasarkan Jam Komputer)
echo [5] Keluar
echo ===================================================
echo(
set /p "CHOICE=Masukkan pilihan Anda (1-5): "

if "%CHOICE%"=="1" goto run_siang
if "%CHOICE%"=="2" goto run_malam
if "%CHOICE%"=="3" goto run_off
if "%CHOICE%"=="4" goto run_auto
if "%CHOICE%"=="5" exit /b 0
goto menu

:process_param
if /i "%MODE%"=="siang" goto run_siang
if /i "%MODE%"=="malam" goto run_malam
if /i "%MODE%"=="off" goto run_off
if /i "%MODE%"=="auto" goto run_auto
echo [ERROR] Argumen tidak dikenal. Gunakan: siang, malam, off, atau auto.
exit /b 1

:run_auto
:: Dapatkan jam saat ini (format 24 jam)
set "HH=%time:~0,2%"
set "HH=%HH: =%"
echo [INFO] Jam komputer saat ini: %HH%:00
:: Batas Siang: Jam 10:00 (10) s.d Jam 15:00 (15)
if %HH% geq 10 (
    if %HH% lss 15 (
        goto run_siang
    )
)
goto run_malam

:run_siang
echo(
echo [INFO] Mengaktifkan Bot A (Siang) dan mematikan Bot B...
set "LOG_FILE=D:\NUS\AbsenNew\Bot 2026\start-bot.log"
if exist "%LOG_FILE%" del /f /q "%LOG_FILE%" >nul 2>&1
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe' AND CommandLine LIKE '%%--botname=bot-asatid%%'\" | Invoke-CimMethod -MethodName Terminate" >nul 2>&1
wscript.exe "D:\NUS\AbsenNew\Bot 2026\run-hidden.vbs"
goto wait_bot

:run_malam
echo(
echo [INFO] Mengaktifkan Bot B (Malam) dan mematikan Bot A...
set "LOG_FILE=D:\NUS\Bot Asatid\Bot\start-bot.log"
if exist "%LOG_FILE%" del /f /q "%LOG_FILE%" >nul 2>&1
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe' AND CommandLine LIKE '%%--botname=absen-2026%%'\" | Invoke-CimMethod -MethodName Terminate" >nul 2>&1
wscript.exe "D:\NUS\Bot Asatid\Bot\run-hidden.vbs"
goto wait_bot

:run_off
echo(
echo [INFO] Mematikan semua proses Bot Absensi...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe' AND (CommandLine LIKE '%%--botname=absen-2026%%' OR CommandLine LIKE '%%--botname=bot-asatid%%')\" | Invoke-CimMethod -MethodName Terminate" >nul 2>&1
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*session_data*' } | Invoke-CimMethod -MethodName Terminate" >nul 2>&1
echo(
echo ✅ Semua bot berhasil dimatikan secara total!
ping 127.0.0.1 -n 4 >nul
exit /b 0

:wait_bot
echo(
echo Menunggu bot menginisialisasi dan menghubungkan ke WhatsApp...
echo (Ini memerlukan waktu sekitar 10-15 detik)
echo(

:: Tunggu file log dibuat
:wait_file_loop
if not exist "%LOG_FILE%" (
    ping 127.0.0.1 -n 2 >nul
    goto wait_file_loop
)

:: Loop membaca isi log
:read_log_loop
findstr /c:"BOT WA AKTIF" "%LOG_FILE%" >nul
if "%ERRORLEVEL%"=="0" (
    echo(
    echo ===================================================
    echo           ✅ Bot Ust Aktif!
    echo ===================================================
    ping 127.0.0.1 -n 4 >nul
    goto end_action
)

:: Cek error fatal
findstr /c:"UnhandledRejection" "%LOG_FILE%" >nul
if "%ERRORLEVEL%"=="0" (
    echo(
    echo [ERROR] Terjadi kesalahan fatal [Unhandled Rejection]. Detail berkas log:
    type "%LOG_FILE%"
    echo(
    pause
    goto end_action
)

findstr /c:"Gagal Autentikasi" "%LOG_FILE%" >nul
if "%ERRORLEVEL%"=="0" (
    echo(
    echo [ERROR] Autentikasi WhatsApp gagal. Detail berkas log:
    type "%LOG_FILE%"
    echo(
    pause
    goto end_action
)

ping 127.0.0.1 -n 2 >nul
goto read_log_loop

:end_action
if "%PARAM%"=="" (
    echo(
    echo Jendela ini akan kembali ke menu utama dalam 3 detik...
    ping 127.0.0.1 -n 4 >nul
    goto menu
) else (
    exit /b 0
)

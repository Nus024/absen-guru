# WA_BOT_MASTER_SYSTEM.md

VERSION: 1.0

PRIORITASKAN MENGANILIS, VALIDASI, MEMASTIKAN IDE ATAU KEINGINAN SAYA SEBELUM MENULIS KODE 
STATUS: PRODUCTION

SYSTEM TYPE:
WhatsApp Teacher Attendance Management System

SOURCE OF TRUTH:
This document overrides assumptions.

AI must follow this document before:

* Analysis
* Refactoring
* Feature Development
* Bug Fixing
* Optimization

Failure to follow this document may corrupt attendance data.

---

# CORE DIRECTIVE

This is a mission-critical attendance system.

Attendance integrity is more important than:

* Performance
* New features
* Code elegance
* Refactoring

Never sacrifice attendance accuracy.

---

# SYSTEM PURPOSE

Primary Goal:

Manage teacher attendance through WhatsApp.

Secondary Goals:

* Broadcast announcements
* Attendance reminders
* Daily recap
* Monthly recap

The system exists primarily for attendance management.

---

# SYSTEM ARCHITECTURE

Layer 1

WhatsApp Interface

Technology:

whatsapp-web.js

Responsibilities:

* Receive commands
* Send messages
* Send media
* Broadcast messages
* Attendance interaction

Puppeteer Stability Rules:
* Do not use `--disable-accelerated-2d-canvas` or `--disable-gpu` to prevent `Target closed` crashes in modern WhatsApp Web.
* A minimum 5-second stabilization delay is required before attaching events in `Client.js` to prevent unhandled rejections during initial SPA loading.

---

Layer 2

Business Logic

Responsibilities:

* Attendance validation
* Schedule lookup
* Broadcast filtering
* Recap generation
* Alarm processing

---

Layer 3

Cache Layer

Global Objects:

cacheJadwal

cacheRekapSemua

Purpose:

Reduce Google Sheets requests.

Cache Refresh:

Every 5 minutes.

---

Layer 4

Data Layer

Technology:

Google Sheets

Sheets:

jadwal

rekap

Google Sheets is the database.

---

# CRITICAL FUNCTIONS

The following functions are protected.

AI must explain risks before modifying them.

Priority: CRITICAL

getSheetsClient()

refreshCache()

safeSendMessage()

handleAbsen()

simpanRekap()

ambilAbsensiHari()

prepareBroadcast()

executeBroadcast()

manualAlarmGuru()

---

# DATA MODEL

Sheet:

no_wa

Columns:

nama_guru
no_wa

Rules:

This sheet is used as the central contact book for WhatsApp numbers.

---

Sheet:

jadwal

Columns:

hari
jam
nama_guru
kelas
mapel

Rules:

No column names may be changed.

No column order may be changed.

No automatic migration allowed.

---

Sheet:

rekap

Columns:

tanggal
hari
jam
nama_guru
kelas
mapel
status

Rules:

No column names may be changed.

No column order may be changed.

No automatic migration allowed.

---

# ATTENDANCE RULES

Attendance codes (Status Mapping):

H = HADIR

I = IZIN

S = SAKIT

A = ALPHA

L = LIBUR

---

Attendance uniqueness rule:

A teacher may only have one attendance record for:

same date
+
same session

Duplicate attendance is forbidden.

---

Attendance must never overwrite existing records.

Existing attendance takes precedence.

---

# ATTENDANCE FLOW

Step 1

Operator requests schedule.

Example:

Jam 1

Step 2

System stores:

global.lastJadwal

Step 3

Operator sends:

1H 2I 3A

Step 4

System validates.

Step 5

System stores records.

Step 6

System sends recap.

---

AI MUST NOT modify this flow without approval.

---

# BROADCAST RULES

Broadcast is secondary.

Attendance is primary.

---

Broadcast Today

Trigger:

* message

Target:

Teachers scheduled today.

Filter:

Exclude:

IZIN

SAKIT

---

Broadcast All

Trigger:

** message

Target:

All teachers.

---

Broadcast Confirmation

Required.

Flow:

Prepare
→ Preview
→ Confirmation
→ Send

Removing confirmation is prohibited.

---

# SAFE MESSAGE POLICY

All outgoing messages must use:

safeSendMessage()

Never bypass safeSendMessage().

Reason:

Protect against:

Execution Context Destroyed

Protocol Errors

Temporary WhatsApp failures

---

# ALARM SYSTEM

Command:

Masuk

Purpose:

Remind teachers to enter class.

---

Alarm excludes:

IZIN

SAKIT

LIBUR

---

Alarm must never send duplicate notifications.

---

# BULK ACTION RULES

Commands:

Alpha1
Alpha2
Alpha3

Hadir1
Hadir2
Hadir3

---

Bulk Action affects only:

Teachers not yet recorded.

Existing attendance must never be overwritten.

---

# AUTO RECAP SYSTEM

Execution Time:

14:30 WIB

---

Allowed Days:

Senin
Selasa
Rabu
Kamis
Sabtu

---

Excluded Day:

Jumat

---

Auto recap may be disabled.

Commands:

On

Off

# MONTHLY RECAP SHEET SYSTEM

Fitur ini secara otomatis membuat dan menyinkronkan lembar rekap bulanan khusus (misalnya tab 'Juni') di dalam spreadsheet yang sama.

Struktur Kolom Grid:
1. Kolom Utama: NO, NAMA GURU, JTM 7 HARI, JADWAL.
2. Kolom Tanggal Harian: Tanggal 1 s.d. 31 (hari kerja). Setiap tanggal memiliki 3 sub-kolom yang merepresentasikan Jam 1, Jam 2, dan Jam 3.
3. Sel kosong pada jam yang mana guru TIDAK MEMILIKI JADWAL akan otomatis diwarnai abu-abu gelap (hitam) oleh sistem.
4. Kolom Rekapitulasi: HADIR, IZIN, SAKIT, LIBUR, ALPHA.

Pemicu Sinkronisasi (On-Demand):
1. Ketika admin memanggil perintah "Rekap [Bulan]" di WhatsApp
2. Ketika admin memanggil perintah "Kirim Rekap [Bulan]" di WhatsApp
3. Melalui menu kustom "Absensi Bot" -> "Sync Rekap..." langsung di Google Sheets

Catatan: Sinkronisasi tidak lagi dilakukan setiap kali ada absensi/koreksi untuk menghindari limitasi API (429 Too Many Requests).

Fitur Ekspor Berkas (PDF / Excel):
1. Pengawas memicu dengan perintah: `kirim rekap <bulan>` (contoh: `kirim rekap juni`)
2. Bot akan mengonfirmasi pilihan format berkas dengan menanyakan: *PDF atau Excel?*
3. Pengawas menjawab dengan mengetik *PDF* atau *Excel* (atau ketik *Batal*)
4. Bot mengunduh lembar sheet bulanan secara terotorisasi lewat API ekspor Google Drive/Sheets dan mengirimkannya langsung ke chat WhatsApp sebagai berkas media.

Aturan Desain Visual:
- Header Utama direntangkan (merge) melewati seluruh kolom.
- Header Tanggal direntangkan melewati ke-3 kolom Jam.
- Pengelompokan baris sel kosong jadwal menjadi kotak warna gelap untuk efisiensi API.
- Total di baris terbawah hanya menjumlahkan kolom rekapitulasi utama menggunakan rumus SUM dinamis.

---

# STATE MANAGEMENT

The bot uses memory-based state management to handle multi-step interactions cleanly without cluttering the database.

Global Objects:
* `global.sessionPanduan`: Used for Interactive Menu/Guide navigation.
* `global.pendingAction`: Used for step-by-step confirmation flows.

Supported `pendingAction` types:
* `BROADCAST`: Waits for "Ya" or "Tidak" before executing `executeBroadcast`.
* `KOREKSI`: Waits for confirmation before executing `executeCorrection`.
* `EKSPOR`: Waits for format selection ("PDF" or "Excel") before sending the recap file.

Rules:
* All pending actions must have an `expiredAt` timestamp.
* Sessions must be deleted if they expire or complete successfully.

---

# CACHE RULES

Cache is mandatory.

The system depends on cache.

---

Refresh Interval:

5 minutes

---

AI must not remove cache without explaining:

* performance impact
* API impact
* reliability impact

---

# SECURITY RULES

Only registered supervisors may:

* Broadcast
* Attendance input
* Bulk action
* Alarm trigger
* Recap request

Unauthorized users must not access administrative commands.

---

# PERFORMANCE RULES

Do not optimize prematurely.

Correctness is more important than speed.

---

Priority Order:

1. Data Integrity
2. Attendance Accuracy
3. Reliability
4. Stability
5. Performance
6. New Features

---

# CHANGE REQUEST PROTOCOL

Before any modification:

AI must provide:

Current Behavior

Proposed Behavior

Risk Analysis

Affected Functions

Affected Features

Rollback Strategy

Only then may code be written.

---

# BUG ANALYSIS FORMAT

Mandatory format.

Problem

Root Cause

Affected Area

Impact

Risk Level

Temporary Fix

Permanent Fix

Prevention

---

# FORBIDDEN ACTIONS

Do not:

* Remove attendance validation
* Remove duplicate protection
* Remove confirmation broadcasts
* Remove safeSendMessage()
* Remove cache layer
* Modify sheet structure
* Change attendance codes
* Refactor critical functions without approval

---

# FINAL RULE

If there is conflict between:

New Feature
vs
Attendance Integrity

Attendance Integrity wins.

Always.

---

# CLONING & MULTI-INSTANCE RUNNING GUIDE

This section explains how to clone/duplicate only the **WA Bot** component to run a separate instance with a different Google Sheet and Service Account credentials.

## Step-by-Step Cloning Protocol

To prevent errors, follow these steps precisely:

### Step 1: Directory Setup
1. Create a new directory at your target location (e.g., `D:\NUS\AbsenNew\Bot Kedua`).
2. Copy the files so that the new directory has this precise layout (do NOT copy `web` or `worker` folders):

```text
Nama Folder Proyek Baru/
├── index.js             (File kode utama WA Bot)
├── package.json         (Definisi dependency)
├── package-lock.json    (Lockfile dependency)
├── .env                 (Konfigurasi Sheet ID & Port)
├── service.json         (Credentials Service Account Google)
├── absen.bat            (Script toggle ON/OFF bot)
├── start-bot.bat        (Script internal starter)
└── run-hidden.vbs       (Script run background tanpa jendela cmd)
```

> [!WARNING]
> Do NOT copy the `./session_data` or `.wwebjs_cache` directories from the old bot. The clone must start without these folders so that a new WhatsApp Web session is generated upon scanning the new QR code.

### Step 2: Environment Configuration
In the new directory:
1. Open the copied `.env` file and replace the `GOOGLE_SHEET_ID` with the new target Sheet ID:
   ```env
   GOOGLE_SHEET_ID=YOUR_NEW_SPREADSHEET_ID
   ```
2. Replace the credentials in `service.json` with the new Google Service Account private key JSON.
   * If you name the file differently (e.g., `service-baru.json`), update `PRIVATE_KEY_PATH` in `.env`:
     ```env
     PRIVATE_KEY_PATH=./service-baru.json
     ```

### Step 3: Script Paths Update (If using Batch/VBS files)
If you copied the `.bat` and `.vbs` files, you **must** update the absolute directory paths inside them:
1. In `absen.bat`:
   * Change line 3: `set "BOT_DIR=d:\NUS\AbsenNew\Bot 2026"` to your new folder path (e.g., `set "BOT_DIR=d:\NUS\AbsenNew\Bot Kedua"`).
   * Change line 6: `cd /d "D:\NUS\AbsenNew\Bot 2026"` to your new folder path.
2. In `run-hidden.vbs`:
   * Change line 2: `D:\NUS\AbsenNew\Bot 2026\start-bot.bat` to your new path (e.g., `D:\NUS\AbsenNew\Bot Kedua\start-bot.bat`).

### Step 4: Installation & Execution
1. Open terminal/PowerShell in the new directory.
2. Run the dependency installer:
   ```bash
   npm install
   ```
3. Run the bot directly to scan the QR code:
   ```bash
   node index.js
   ```
4. Scan the QR code with the new WhatsApp account.
5. Once authenticated, if running as a service, you can close the process and run `absen.bat` to launch it silently in the background.

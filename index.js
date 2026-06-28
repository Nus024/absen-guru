/**
 * index.js
 * All-in-one WhatsApp Absensi Bot + Google Sheets integration.
 *
 * Versi: STABIL & ROBUST (Anti-Crash + Auto Retry)
 *
 * PERBAIKAN:
 * 1. safeSendMessage: Wrapper aman untuk mencegah crash 'Execution context destroyed'.
 * 2. Smart Delay: Jeda acak 2-5 detik saat broadcast (tidak 800ms statis).
 * 3. Error Handling: Menangkap error EBUSY dan getChat undefined.
 *
 * FITUR UTAMA:
 * 1. Jadwal & Absensi (H/I/S/A/L)
 * 2. Rekap Harian & Bulanan (JTM)
 * 3. Alarm Manual & Otomatis
 * 4. BROADCAST CANGGIH (Filter Izin/Sakit)
 * 5. TOGGLE REKAP OTOMATIS (On/Off)
 * 6. BULK ACTION (Alpha1, Hadir1, dll)
 */

/* =========================
   1) CONFIG & IMPORTS
   ========================= */
import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { google } from "googleapis";
import moment from "moment-timezone";
moment.tz.setDefault("Asia/Jakarta");

import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from "qrcode-terminal";



const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT_EMAIL || "";
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH || "./service.json";

// Basic safety check
if (!GOOGLE_SHEET_ID) {
  console.error("❌ Missing GOOGLE_SHEET_ID in .env — bot cannot start.");
  process.exit(1);
}
if (!fs.existsSync(path.resolve(process.cwd(), PRIVATE_KEY_PATH))) {
  console.error(
    `❌ Service account file not found at ${PRIVATE_KEY_PATH}. Please set PRIVATE_KEY_PATH in .env`
  );
  process.exit(1);
}

/* =========================
   2) GOOGLE SHEETS CLIENT + HELPERS
   ========================= */

let sheetsClient = null;

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  try {
    const credsRaw = fs.readFileSync(
      path.resolve(process.cwd(), PRIVATE_KEY_PATH),
      "utf8"
    );
    const creds = JSON.parse(credsRaw);

    const jwtClient = new google.auth.JWT(
      creds.client_email || SERVICE_ACCOUNT_EMAIL,
      null,
      creds.private_key,
      ["https://www.googleapis.com/auth/spreadsheets"]
    );
    await jwtClient.authorize();
    sheetsClient = google.sheets({ version: "v4", auth: jwtClient });
    console.log("✅ Google Sheets client siap.");
    return sheetsClient;
  } catch (err) {
    console.error(
      "❌ Gagal inisialisasi Google Sheets client:",
      err.message || err
    );
    throw err;
  }
}

// Read a range from a sheet (sheetName!A:Z), map header -> object, trim keys
async function ambilSheetRange(sheetName, range = "A:Z") {
  const client = await getSheetsClient();
  try {
    const res = await client.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${sheetName}!${range}`,
    });
    const rows = res.data.values || [];
    if (rows.length === 0) return [];
    const header = rows[0].map((h) =>
      String(h || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
    );
    const data = rows.slice(1).map((row) => {
      const obj = {};
      header.forEach((key, i) => {
        obj[key] = String(row[i] || "").trim();
      });
      return obj;
    });
    return data;
  } catch (err) {
    console.error(`⚠️ Gagal membaca sheet "${sheetName}":`, err.message || err);
    return [];
  }
}

// Normalisasi kecil untuk robustness
function normalisasiHari(h) {
  if (!h) return "";
  return String(h).trim().toLowerCase();
}
function normalisasiJam(j) {
  if (j === undefined || j === null) return "";
  return String(j).trim();
}

// Public helpers used by bot logic
export async function ambilJadwalHari(hari) {
  const data = global.cacheJadwal || [];
  const h = normalisasiHari(hari);
  return data.filter((r) => normalisasiHari(r.hari) === h);
}
export async function ambilJadwal(hari, jam) {
  const data = global.cacheJadwal || [];
  const h = normalisasiHari(hari);
  const j = normalisasiJam(jam);
  return data.filter(
    (r) => normalisasiHari(r.hari) === h && normalisasiJam(r.jam) === j
  );
}
export async function ambilAbsensiHari(tanggal) {
  const data = global.cacheRekapSemua || [];
  if (!tanggal) return data;
  return data.filter((r) => (r.tanggal || "").trim() === tanggal.trim());
}
export async function simpanRekap(row) {
  const client = await getSheetsClient();
  const values = [
    [
      row.tanggal || "",
      row.hari || "",
      row.jam || "",
      row.nama_guru || "",
      row.kelas || "",
      row.mapel || "",
      row.status || "",
    ],
  ];
  try {
    await client.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "rekap!A:G",
      valueInputOption: "RAW",
      resource: { values },
    });
    global.cacheRekapSemua.push({ ...row });
  } catch (err) {
    console.error("❌ Gagal menyimpan rekap:", err.message || err);
    throw err;
  }
}
export async function ambilRekapGuru(namaGuru, bulanYYYYMM = null) {
  const data = global.cacheRekapSemua || [];
  const n = String(namaGuru || "")
    .trim()
    .toLowerCase();
  return data.filter((r) => {
    if ((r.nama_guru || "").trim().toLowerCase() !== n) return false;
    if (bulanYYYYMM) return (r.tanggal || "").startsWith(bulanYYYYMM);
    return true;
  });
}
export async function ambilSemuaGuruUnik() {
  const data = global.cacheJadwal || [];
  const set = new Set();
  data.forEach((r) => {
    const nama = (r.nama_guru || "").trim();
    if (nama) set.add(nama);
  });
  return Array.from(set).sort();
}
export async function ambilTotalJadwal(nama) {
  const data = global.cacheJadwal || [];
  const n = (nama || "").trim().toLowerCase();
  return data.filter((r) => (r.nama_guru || "").trim().toLowerCase() === n)
    .length;
}

export async function syncBulananSheet(bulanIndoOrDate, tahun = null) {
  const client = await getSheetsClient();
  let monthName = "";
  let monthNum = "";
  let year = tahun || moment().format("YYYY");

  const monthMapRev = {
    "01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
    "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
    "09": "September", "10": "Oktober", "11": "November", "12": "Desember"
  };

  const INDO_MONTHS_MAP = {
    januari: "01", februari: "02", maret: "03", marel: "03", april: "04", mei: "05", juni: "06",
    juli: "07", agustus: "08", september: "09", oktober: "10", november: "11", desember: "12"
  };

  if (String(bulanIndoOrDate).includes("-")) {
    const parts = String(bulanIndoOrDate).split("-");
    year = parts[0];
    monthNum = parts[1];
    monthName = monthMapRev[monthNum];
  } else {
    const cleanMonth = String(bulanIndoOrDate).toLowerCase().trim();
    monthNum = INDO_MONTHS_MAP[cleanMonth];
    monthName = capitalize(cleanMonth);
    if (!monthNum) {
      console.error(`⚠️ Bulan tidak valid: ${bulanIndoOrDate}`);
      return;
    }
  }

  const bulanYYYYMM = `${year}-${monthNum}`;
  const sheetName = monthName;

  function colLetter(n) {
    let s = "";
    while (n >= 0) {
      s = String.fromCharCode((n % 26) + 65) + s;
      n = Math.floor(n / 26) - 1;
    }
    return s;
  }

  try {
    const allJadwal = global.cacheJadwal || [];
    const allRekap = global.cacheRekapSemua || [];
    const daftarGuru = await ambilSemuaGuruUnik();

    // Hitung hari kerja
    const yearInt = parseInt(year, 10);
    const monthInt = parseInt(monthNum, 10);
    const dayCounts = { ahad: 0, senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0 };
    const daysInMonth = new Date(yearInt, monthInt, 0).getDate();
    const dayNames = ['ahad', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

    const validDates = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(yearInt, monthInt - 1, i);
      const dayIdx = date.getDay();
      if (dayIdx === 5) continue; // Jumat Libur
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const hari = dayNames[dayIdx];
      validDates.push({ dateStr, hari, label: `${i}/${monthInt}/${year}` });
      dayCounts[hari]++;
    }

    // Group schedules by teacher and day
    const teacherDayLoad = {};
    allJadwal.forEach(j => {
      const nama = (j.nama_guru || "").trim();
      if (!nama) return;
      const hari = normalisasiHari(j.hari);

      if (!teacherDayLoad[nama]) teacherDayLoad[nama] = {};
      if (!teacherDayLoad[nama][hari]) teacherDayLoad[nama][hari] = 0;
      teacherDayLoad[nama][hari]++;
    });

    const dataRows = [];
    const blackCellsSet = new Set(); // store "row,col"

    daftarGuru.forEach((namaGuru, index) => {
      let totalJadwal = 0;
      let jtm7Hari = 0;
      if (teacherDayLoad[namaGuru]) {
        Object.keys(teacherDayLoad[namaGuru]).forEach(hari => {
          const countDay = dayCounts[hari] || 0;
          totalJadwal += (teacherDayLoad[namaGuru][hari] * countDay);
          jtm7Hari += teacherDayLoad[namaGuru][hari];
        });
      }

      const rekapGuruBulanIni = allRekap.filter(
        (r) =>
          (r.nama_guru || "").trim().toLowerCase() === namaGuru.toLowerCase() &&
          (r.tanggal || "").startsWith(bulanYYYYMM)
      );

      let H_total = 0, I_total = 0, S_total = 0, L_total = 0, A_total = 0;
      const rowData = [index + 1, namaGuru, jtm7Hari, totalJadwal];
      const rowIndex = 3 + index; // Baris data mulai index 3 (0-based)

      validDates.forEach((d, dateIndex) => {
        const jadwalHariIni = allJadwal.filter(j => (j.nama_guru || "").trim().toLowerCase() === namaGuru.toLowerCase() && normalisasiHari(j.hari) === d.hari);
        const rekapHariIni = rekapGuruBulanIni.filter(r => r.tanggal === d.dateStr);

        for (let jam = 1; jam <= 3; jam++) {
          const isJadwal = jadwalHariIni.some(j => String(j.jam).trim() === String(jam));
          const colIndex = 4 + (dateIndex * 3) + (jam - 1);

          if (!isJadwal) {
            rowData.push("");
            blackCellsSet.add(`${rowIndex},${colIndex}`);
          } else {
            const rekapJam = rekapHariIni.find(r => String(r.jam).trim() === String(jam));
            if (rekapJam) {
              const status = (rekapJam.status || "").toUpperCase();
              if (status === "HADIR") { rowData.push("H"); H_total++; }
              else if (status === "IZIN") { rowData.push("I"); I_total++; }
              else if (status === "SAKIT") { rowData.push("S"); S_total++; }
              else if (status === "ALPHA") { rowData.push("A"); A_total++; }
              else if (status === "LIBUR") { rowData.push("L"); L_total++; }
              else { rowData.push(""); }
            } else {
              rowData.push("");
            }
          }
        }
      });

      rowData.push(H_total, I_total, S_total, L_total, A_total);
      dataRows.push(rowData);
    });

    // 1. Get spreadsheet metadata
    const metadata = await client.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
    const sheets = metadata.data.sheets || [];
    let sheetExists = sheets.some(s => s.properties.title === sheetName);

    if (!sheetExists) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEET_ID,
        resource: { requests: [{ addSheet: { properties: { title: sheetName } } }] }
      });
      sheetExists = true;
    }

    // 2. Get sheetId
    const sheetMetadata = await client.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
    const targetSheet = sheetMetadata.data.sheets.find(s => s.properties.title === sheetName);
    const sheetId = targetSheet.properties.sheetId;

    // 3. Clear sheet
    await client.spreadsheets.values.clear({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${sheetName}!A:ZZ`
    });

    // 4. Update values
    const lastRow = 3 + dataRows.length;
    
    const headers1 = ["NO", "NAMA", "JTM 7 HARI", "JADWAL"];
    validDates.forEach(d => { headers1.push(d.label, "", ""); });
    headers1.push("HADIR", "IZIN", "SAKIT", "LIBUR", "ALPHA");

    const sumRow = ["", "TOTAL", `=SUM(C4:C${lastRow})`, `=SUM(D4:D${lastRow})`];
    for (let i = 0; i < validDates.length * 3; i++) {
       sumRow.push("");
    }
    for (let i = 0; i < 5; i++) {
       const cLetter = colLetter(4 + validDates.length * 3 + i);
       sumRow.push(`=SUM(${cLetter}4:${cLetter}${lastRow})`);
    }

    const values = [
      [`REKAPITULASI ABSENSI GURU - BULAN ${sheetName.toUpperCase()} ${year}`],
      [],
      headers1,
      ...dataRows,
      sumRow
    ];

    await client.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      resource: { values }
    });

    // 5. Apply styles
    const stylingRequests = [];
    const totalCols = 4 + validDates.length * 3 + 5;

    // Merge Main Title
    stylingRequests.push({
      mergeCells: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: totalCols },
        mergeType: "MERGE_ALL"
      }
    });

    // Title Style
    stylingRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: totalCols },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.11, green: 0.21, blue: 0.36 },
            textFormat: { foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 }, fontSize: 14, bold: true },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE"
          }
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
      }
    });
    stylingRequests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 40 },
        fields: "pixelSize"
      }
    });

    // Merge Headers for Dates
    validDates.forEach((d, i) => {
      const startCol = 4 + (i * 3);
      stylingRequests.push({
        mergeCells: {
          range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: startCol, endColumnIndex: startCol + 3 },
          mergeType: "MERGE_ALL"
        }
      });
    });

    // Header Styles
    stylingRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: totalCols },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.05, green: 0.65, blue: 0.35 }, // Hijau seperti di gambar
            textFormat: { foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 }, fontSize: 10, bold: true },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE"
          }
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
      }
    });
    stylingRequests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 2, endIndex: 3 },
        properties: { pixelSize: 28 },
        fields: "pixelSize"
      }
    });

    // Data rows style (font, alignment)
    const lastRowIndex = 3 + dataRows.length;
    stylingRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 3, endRowIndex: lastRowIndex, startColumnIndex: 0, endColumnIndex: totalCols },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 10 },
            verticalAlignment: "MIDDLE",
            horizontalAlignment: "CENTER"
          }
        },
        fields: "userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment)"
      }
    });

    // NAMA GURU column align left
    stylingRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 3, endRowIndex: lastRowIndex, startColumnIndex: 1, endColumnIndex: 2 },
        cell: { userEnteredFormat: { horizontalAlignment: "LEFT" } },
        fields: "userEnteredFormat(horizontalAlignment)"
      }
    });

    // Black Cells Formatting (Grouped by row)
    const blackRanges = [];
    daftarGuru.forEach((_, rIndex) => {
      const row = 3 + rIndex;
      let startCol = -1;
      const endLoopCol = 4 + validDates.length * 3;
      for (let c = 4; c <= endLoopCol; c++) {
        if (c < endLoopCol && blackCellsSet.has(`${row},${c}`)) {
          if (startCol === -1) startCol = c;
        } else {
          if (startCol !== -1) {
            blackRanges.push({ row, startCol, endCol: c });
            startCol = -1;
          }
        }
      }
    });

    blackRanges.forEach(range => {
      stylingRequests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: range.row, endRowIndex: range.row + 1, startColumnIndex: range.startCol, endColumnIndex: range.endCol },
          cell: { userEnteredFormat: { backgroundColor: { red: 0.2, green: 0.25, blue: 0.3 } } }, // Abu-abu gelap
          fields: "userEnteredFormat(backgroundColor)"
        }
      });
    });

    stylingRequests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 3, endIndex: lastRowIndex },
        properties: { pixelSize: 22 },
        fields: "pixelSize"
      }
    });

    // Sum row style
    stylingRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: lastRowIndex, endRowIndex: lastRowIndex + 1, startColumnIndex: 0, endColumnIndex: totalCols },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.92, green: 0.93, blue: 0.93 },
            textFormat: { bold: true, fontSize: 11 },
            verticalAlignment: "MIDDLE",
            horizontalAlignment: "CENTER"
          }
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment)"
      }
    });
    stylingRequests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: lastRowIndex, endIndex: lastRowIndex + 1 },
        properties: { pixelSize: 26 },
        fields: "pixelSize"
      }
    });

    // Borders
    const border = { style: "SOLID", color: { red: 0.8, green: 0.8, blue: 0.8 } };
    stylingRequests.push({
      updateBorders: {
        range: { sheetId, startRowIndex: 2, endRowIndex: lastRowIndex + 1, startColumnIndex: 0, endColumnIndex: totalCols },
        top: border, bottom: border, left: border, right: border,
        innerHorizontal: border, innerVertical: border
      }
    });
    stylingRequests.push({
      updateBorders: {
        range: { sheetId, startRowIndex: lastRowIndex, endRowIndex: lastRowIndex + 1, startColumnIndex: 0, endColumnIndex: totalCols },
        bottom: { style: "DOUBLE", color: { red: 0.2, green: 0.2, blue: 0.2 } }
      }
    });

    // Column Widths
    stylingRequests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 40 },
        fields: "pixelSize"
      }
    });
    stylingRequests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 2 },
        properties: { pixelSize: 180 },
        fields: "pixelSize"
      }
    });
    stylingRequests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: 2, endIndex: 4 },
        properties: { pixelSize: 85 },
        fields: "pixelSize"
      }
    });
    
    // Dates columns width (make them smaller)
    const datesEndCol = 4 + validDates.length * 3;
    if (datesEndCol > 4) {
      stylingRequests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: 4, endIndex: datesEndCol },
          properties: { pixelSize: 25 },
          fields: "pixelSize"
        }
      });
    }

    // Recap columns width
    stylingRequests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: datesEndCol, endIndex: totalCols },
        properties: { pixelSize: 60 },
        fields: "pixelSize"
      }
    });

    await client.spreadsheets.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      resource: { requests: stylingRequests }
    });

    console.log(`✅ Sheet "${sheetName}" berhasil disinkronkan.`);
  } catch (err) {
    console.error(`❌ Gagal menyinkronkan sheet "${sheetName}":`, err.message || err);
  }
}

export async function downloadDanKirimRekap(msg, format, monthName, sheetId, year) {
  try {
    const client = await getSheetsClient();
    const auth = client.context._options.auth;
    const tokenHeaders = await auth.getRequestHeaders();

    let exportUrl = "";
    let mimeType = "";
    let fileExtension = "";

    if (format === "xlsx") {
      exportUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=xlsx&gid=${sheetId}`;
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      fileExtension = "xlsx";
    } else {
      exportUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=pdf&gid=${sheetId}` +
        `&size=A4&portrait=true&fitw=true&gridlines=true`;
      mimeType = "application/pdf";
      fileExtension = "pdf";
    }

    console.log(`📥 Mengunduh file dari: ${exportUrl}`);

    const res = await fetch(exportUrl, {
      headers: tokenHeaders
    });

    if (!res.ok) {
      throw new Error(`Google API returned status ${res.status}: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new Error("Berkas yang diunduh kosong.");
    }

    const base64Data = buffer.toString("base64");
    const filename = `Rekap_${monthName}_${year}.${fileExtension}`;
    const media = new MessageMedia(mimeType, base64Data, filename);

    await msg.reply(media);
    console.log(`✅ Berhasil mengirim berkas rekap ${monthName}.${fileExtension}`);
  } catch (err) {
    console.error("❌ Gagal mengirim berkas:", err);
    await msg.reply(`⚠️ Gagal mengirim berkas: ${err.message || err}`);
  }
}



/* =========================
   3) UTILITY HELPERS
   ========================= */

const validHari = [
  "senin",
  "selasa",
  "rabu",
  "kamis",
  "jumat",
  "sabtu",
  "ahad",
];

function hariIndonesiaFromMoment(m) {
  const map = {
    Sunday: "ahad",
    Monday: "senin",
    Tuesday: "selasa",
    Wednesday: "rabu",
    Thursday: "kamis",
    Friday: "jumat",
    Saturday: "sabtu",
  };
  return map[m.format("dddd")];
}
function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function tanggalNow() {
  return moment().format("YYYY-MM-DD");
}
function jamNow() {
  return moment().format("HH:mm");
}

function emojiForStatus(status) {
  if (!status) return "⚠️";
  const s = status.toUpperCase();
  if (s === "BELUM") return "⚠️";
  if (s === "ALPHA") return "🅰️";
  if (s === "IZIN") return "ℹ️";
  if (s === "SAKIT") return "🤒";
  if (s === "LIBUR") return "✨";
  if (s === "HADIR") return "✅";
  return "⚠️";
}

function getNomorWa(namaGuru) {
  if (!namaGuru) return "";
  if (!global.cacheNoWa) return "";
  const entry = global.cacheNoWa.find(r => (r.nama_guru || "").trim().toLowerCase() === namaGuru.toLowerCase());
  return entry ? (entry.no_wa || entry.nomor_wa || "").replace(/\D/g, "") : "";
}

function panduanMenuUtama() {
  return `
📘 *PANDUAN BOT ABSENSI GURU*
━━━━━━━━━━━━━━
Ketik angka untuk melihat panduan detail:

1️⃣ Jadwal & Absensi
2️⃣ Cek & Koreksi
3️⃣ Aksi Cepat
4️⃣ Broadcast
5️⃣ Data & Rekap
6️⃣ Pengaturan & Alarm

_Menu ini akan tertutup otomatis dalam 5 menit._
`.trim();
}

function panduanSubMenu(angka) {
  const menus = {
    "1": `🕐 *Jadwal & Absensi*\n• \`Jam X\` → Jadwal Jam X (contoh: \`Jam 1\`)\n• \`[Hari]\` → Jadwal hari tertentu (contoh: \`Senin\`)\n• Format Absen: \`1H 2I 3A 4S 5L\``,
    "2": `🔄 *Cek & Koreksi*\n• \`Cek\` → Guru yang belum diabsen\n• \`Cek 1\` → Status absensi Jam 1\n• \`Cek123\` → Rekap semua jam hari ini\n• \`Koreksi 1H\` → Koreksi absen (*Wajib panggil Jadwal Jam X dulu*)`,
    "3": `⚡ *Aksi Cepat*\n• \`AlphaX\` → Alpha massal guru yang belum diabsen\n• \`HadirX\` → Hadir massal guru yang belum diabsen\n(Contoh: \`Alpha1\`, \`Hadir2\`)`,
    "4": `📢 *Broadcast*\n• \`* Pesan\` → Guru yang mengajar hari ini\n• \`** Pesan\` → Seluruh guru\nContoh: \`* Info Rapat\` (Tunggu konfirmasi Ya/Tidak)`,
    "5": `📊 *Data & Rekap*\n• \`Data\` → Daftar seluruh guru\n• \`Data No\` → Rekap guru (contoh: \`Data 2\`)\n• \`Data No Bulan\` → Rekap bulan tertentu (contoh: \`Data 2 Oktober\`)\n• \`Rekap Bulan\` → Rekap seluruh guru (contoh: \`Rekap Oktober\`)\n• \`Kirim Rekap Bulan\` → Unduh file PDF/Excel (contoh: \`Kirim Rekap Oktober\`)`,
    "6": `🔔 *Pengaturan & Alarm*\n• \`Masuk\` → Alarm pengingat KBM\n• \`On\` → Aktifkan Auto Rekap Harian\n• \`Off\` → Nonaktifkan Auto Rekap Harian`
  };
  return menus[angka] || "⚠️ Pilihan tidak tersedia.";
}

// === NEW: SAFE SEND MESSAGE (Anti-Crash) ===
async function safeSendMessage(chatId, content, options = {}) {
  // Cek koneksi dasar
  if (!client.info) {
    console.warn(`⚠️ Client not ready. Skip send to ${chatId}`);
    return false;
  }

  try {
    await client.sendMessage(chatId, content, options);
    return true;
  } catch (err) {
    const msg = err.message ? err.message.toLowerCase() : "";

    // Handle error spesifik "Execution context destroyed" atau "getChat"
    if (
      msg.includes("execution context") ||
      msg.includes("destroyed") ||
      msg.includes("getchat") ||
      msg.includes("protocol error")
    ) {
      console.log(
        `⚠️ Jaringan sibuk/Crash sesaat. Mencoba kirim ulang ke ${chatId} dalam 3 detik...`
      );

      // Tunggu 3 detik lalu coba sekali lagi
      await new Promise((r) => setTimeout(r, 3000));
      try {
        await client.sendMessage(chatId, content, options);
        console.log(`✅ Sukses kirim ulang ke ${chatId}`);
        return true;
      } catch (retryErr) {
        console.error(
          `❌ Gagal permanen ke ${chatId} setelah retry:`,
          retryErr.message
        );
        return false;
      }
    }

    console.error(`❌ Gagal kirim ke ${chatId}:`, err.message);
    return false;
  }
}

/* =========================
   4) BOT LOGIC (HANDLERS)
   ========================= */

function getStatusFromCode(kode) {
  const k = (kode || "").toString().toUpperCase();
  if (k === "H") return "HADIR";
  if (k === "I") return "IZIN";
  if (k === "S") return "SAKIT";
  if (k === "L") return "LIBUR";
  return "ALPHA";
}

function buildDaftarJadwalText(hari, jam, jadwal) {
  let teks = `📋 *Daftar Guru${jam ? " Jam " + jam : ""} (${capitalize(
    hari
  )})*\n\n`;
  jadwal.forEach((r, i) => {
    const nama = r.nama_guru || "";
    const kelas = r.kelas || "";
    const mapel = r.mapel || "";
    teks += `${i + 1}. ${nama} | ${kelas} | ${mapel}\n`;
  });
  teks += `\nSilakan absen dengan format: nomor+kode (H/I/A/S/L)\nContoh: 1H 2I 3A 4S 5L`;
  return teks;
}

async function buatRekapPerJamText(tanggal, jam) {
  const absensi = await ambilAbsensiHari(tanggal);
  const rowsJam = (absensi || []).filter(
    (r) => String(r.jam).trim() === String(jam).trim()
  );
  const hariMoment = moment(tanggal, "YYYY-MM-DD");
  const hari = hariIndonesiaFromMoment(hariMoment);
  const jadwalHari = await ambilJadwalHari(hari);

  const mapStatus = {};
  rowsJam.forEach((r) => {
    const nama = (r.nama_guru || "").trim().toLowerCase();
    if (nama) mapStatus[nama] = (r.status || "BELUM").toUpperCase();
  });

  const lines = [];
  const seen = new Set();

  for (const g of jadwalHari.filter(
    (x) => String(x.jam).trim() === String(jam).trim()
  )) {
    const nama = (g.nama_guru || "").trim();
    if (!nama || seen.has(nama.toLowerCase())) continue;
    seen.add(nama.toLowerCase());
    const status = mapStatus[nama.toLowerCase()] || "BELUM";
    lines.push(`${emojiForStatus(status)} ${nama} → ${status}`);
  }

  for (const r of rowsJam) {
    const nama = (r.nama_guru || "").trim();
    if (!nama || seen.has(nama.toLowerCase())) continue;
    seen.add(nama.toLowerCase());
    const st = (r.status || "BELUM").toUpperCase();
    lines.push(`${emojiForStatus(st)} ${nama} → ${st}`);
  }

  const header = `📋 *Rekap Absen Jam ${jam} (${tanggal})*\n\n`;
  return (
    header +
    (lines.length ? lines.join("\n") : "(Tidak ada data rekap untuk jam ini)")
  );
}

// --- NEW FEATURE: BULK STATUS (Alpha/Hadir Massal) ---
async function handleBulkStatus(msg, typeStatus, jam) {
  try {
    const targetStatus =
      typeStatus.toUpperCase() === "HADIR" ? "HADIR" : "ALPHA";
    const hari = hariIndonesiaFromMoment(moment());
    const tanggal = tanggalNow();

    // Ambil jadwal jam tersebut
    const jadwalJam = await ambilJadwal(hari, jam);
    if (!jadwalJam || jadwalJam.length === 0) {
      await msg.reply(
        `⚠️ Tidak ada jadwal pada Jam ${jam} hari ini (${capitalize(hari)}).`
      );
      return;
    }

    // Ambil yang sudah absen
    const absensi = await ambilAbsensiHari(tanggal);
    const sudahAbsenSet = new Set(
      (absensi || []).map(
        (r) =>
          (r.nama_guru || "").trim().toLowerCase() +
          "|||" +
          String(r.jam || "").trim()
      )
    );

    // Filter guru yang BELUM absen
    const targetGuru = [];
    const seen = new Set();

    for (const g of jadwalJam) {
      const nama = (g.nama_guru || "").trim();
      const key = nama.toLowerCase() + "|||" + String(jam).trim();

      if (!nama || sudahAbsenSet.has(key) || seen.has(key)) continue;

      seen.add(key);
      targetGuru.push(g);
    }

    if (targetGuru.length === 0) {
      await msg.reply(
        `✅ Semua guru Jam ${jam} sudah diabsen. Tidak ada yang diproses.`
      );
      return;
    }

    let processedNames = [];

    // Proses Insert
    for (const guru of targetGuru) {
      await simpanRekap({
        tanggal,
        hari,
        jam,
        nama_guru: guru.nama_guru,
        kelas: guru.kelas || "",
        mapel: guru.mapel || "",
        status: targetStatus,
      });
      processedNames.push(guru.nama_guru);
    }
    
    await msg.reply(
      `✅ *SUKSES BULK ${targetStatus} JAM ${jam}*\n\n` +
      `Berhasil menandai ${targetStatus} untuk ${processedNames.length} guru:\n` +
      processedNames.map((n, i) => `${i + 1}. ${n}`).join("\n")
    );
  } catch (err) {
    console.error("Error Bulk Status:", err);
    await msg.reply("⚠️ Gagal melakukan update massal.");
  }
}

// === NEW: LOGIKA KOREKSI ABSENSI ===
async function handleKoreksi(msg, nomor, kode) {
  try {
    const lj = global.lastJadwal || {};
    if (!lj.jadwal || !lj.jam) {
      await msg.reply("⚠️ Panggil jadwal dengan *Jam X* dulu sebelum melakukan koreksi.");
      return;
    }

    const guru = lj.jadwal[nomor - 1];
    if (!guru) {
      await msg.reply(`⚠️ Guru nomor ${nomor} tidak ditemukan pada jadwal saat ini.`);
      return;
    }

    const teacherName = (guru.nama_guru || "").trim();
    const newStatus = getStatusFromCode(kode);
    const tanggal = tanggalNow();

    // Cari data absen hari ini, untuk guru ini, dan jam ini di cacheRekapSemua
    const recordIndex = global.cacheRekapSemua.findIndex(r =>
      (r.tanggal || "").trim() === tanggal &&
      (r.nama_guru || "").trim().toLowerCase() === teacherName.toLowerCase() &&
      String(r.jam || "").trim() === String(lj.jam).trim()
    );

    if (recordIndex === -1) {
      await msg.reply(`⚠️ Data absensi untuk ${teacherName} pada Jam ${lj.jam} hari ini belum diinput.`);
      return;
    }

    const oldStatus = (global.cacheRekapSemua[recordIndex].status || "BELUM").toUpperCase();

    // Simpan ke state pending per-sender
    const from = msg.author || msg.from;
    global.pendingAction[from] = {
      type: 'KOREKSI',
      data: {
        recordIndex: recordIndex,
        teacherName: teacherName,
        oldStatus: oldStatus,
        newStatus: newStatus,
        tanggal: tanggal,
        jam: lj.jam,
        guru: guru,
      },
      expiredAt: Date.now() + 5 * 60 * 1000
    };

    // Tampilkan konfirmasi
    await msg.reply(
      `⚠️ *KONFIRMASI KOREKSI*\n\n` +
      `Guru:\n${teacherName}\n\n` +
      `Status Lama:\n${oldStatus}\n\n` +
      `Status Baru:\n${newStatus}\n\n` +
      `Ketik *YA* untuk melanjutkan.`
    );
  } catch (err) {
    console.error("Error handleKoreksi:", err);
    await msg.reply(`⚠️ Gagal memproses perintah koreksi: ${err.message}`);
  }
}

async function executeCorrection(msg) {
  try {
    const from = msg.author || msg.from;
    const session = global.pendingAction[from];
    if (!session || session.type !== 'KOREKSI') return;
    const data = session.data;

    const rowNumber = data.recordIndex + 2; // Index data 0 -> Baris 2 di Google Sheets
    const clientSheets = await getSheetsClient();

    // 1. Update status di Google Sheets
    await clientSheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `rekap!G${rowNumber}`,
      valueInputOption: "RAW",
      resource: {
        values: [[data.newStatus]]
      }
    });

    // 2. Update status di cache
    global.cacheRekapSemua[data.recordIndex].status = data.newStatus;

    // 3. Balas ke operator
    await msg.reply(
      `✅ *Koreksi berhasil*\n\n` +
      `${data.teacherName}\n\n` +
      `${data.oldStatus} → ${data.newStatus}`
    );

    // 4. Kirim notifikasi ke guru
    const nomorGuru = getNomorWa(data.guru.nama_guru || "");
    if (nomorGuru.length > 8) {
      const chatId = `${nomorGuru}@c.us`;
      const statusLama = data.oldStatus.toUpperCase();
      const statusBaru = data.newStatus.toUpperCase();

      if (["ALPHA", "IZIN", "SAKIT"].includes(statusLama) && statusBaru === "HADIR") {
        // Kirim Notifikasi Koreksi
        const lj = global.lastJadwal || {};
        const pesanKoreksi = `📋 *KOREKSI ABSENSI*
Assalamu’alaikum Wr. Wb. P. ${data.teacherName}
Pengawas memperbarui status absensi Anda:

❌ Sebelumnya : ${statusLama}
✅ Menjadi     : ${statusBaru}
* Jam   : ${data.jam}
* Kelas : ${data.guru.kelas || ""}
* Mapel : ${data.guru.mapel || ""}
* Hari  : ${capitalize(lj.hari || "")}
🕒 Diperbarui pada ${jamNow()} WIB.
-----------------------------------------

Terima kasih 🙏
Wassalamu’alaikum Wr. Wb.`;
        safeSendMessage(chatId, pesanKoreksi).catch((e) =>
          console.log("Gagal notif koreksi:", e.message)
        );
      } else if (statusLama === "HADIR" && ["ALPHA", "IZIN", "SAKIT"].includes(statusBaru)) {
        // Kirim Notifikasi Standar
        const lj = global.lastJadwal || {};
        const pesanStandar = `Assalamu’alaikum Wr. Wb P. ${data.teacherName}
Pengawas mencatat Anda: ${statusBaru}
* Jam : ${data.jam}
* Kelas: ${data.guru.kelas || ""}
* Mapel: ${data.guru.mapel || ""}
* Hari : ${capitalize(lj.hari || "")}.
🕒 Dicatat pada ${jamNow()} WIB.
-----------------------------------------

Terima kasih 🙏
Wassalamu’alaikum Wr. Wb`;
        safeSendMessage(chatId, pesanStandar).catch((e) =>
          console.log("Gagal notif standar koreksi:", e.message)
        );
      }
    }

    // Reset pending correction state
    delete global.pendingAction[from];
  } catch (err) {
    console.error("Error executeCorrection:", err);
    await msg.reply(`⚠️ Gagal menyimpan koreksi: ${err.message}`);
  }
}

/* =========================
   5) WhatsApp client setup
   ========================= */

const pengawasUtama = "6285183192465";
const pengawasCadangan = [
  "6282244954792",
  "6282244121247",
  "6285800490485",
  "6282330234300",
  "6282245613520",
  "6285141061017",
  "6282228485343",
];
const semuaPengawas = [pengawasUtama, ...pengawasCadangan];
const nomorRekapOtomatis = [
  "6285230812051",
  "6282244121247",
  "6282244954792",
  "6285854444052",
  "6285183192465",
  "6282333331551",
];

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "absen-bot",
    dataPath: "./session_data",
  }),
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "C:\\Users\\1\\.cache\\puppeteer\\chrome\\win64-121.0.6167.85\\chrome-win64\\chrome.exe",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // Mengurangi penggunaan memori shared
      "--no-first-run",
      "--no-zygote"
    ],
  }
});

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
// --- Heartbeat & Setting Helpers ---
async function updateSettingKeyValue(key, value) {
  try {
    const clientSheets = await getSheetsClient();
    const res = await clientSheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Setting!A1:B20",
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(row => String(row[0] || "").trim() === key);
    
    if (rowIndex !== -1) {
      await clientSheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `Setting!B${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [[value]]
        }
      });
    } else {
      await clientSheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: "Setting!A:B",
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [[key, value]]
        }
      });
    }
  } catch (err) {
    console.error(`❌ Gagal update setting ${key}:`, err.message || err);
  }
}

async function kirimHeartbeat() {
  const timestamp = new Date().toISOString();
  await updateSettingKeyValue("botLastSeen", timestamp);
}

let heartbeatInterval = null;

client.on("ready", () => {
  console.log("✅ BOT WA AKTIF (Google Sheets Edition)");
  kirimHeartbeat();
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(kirimHeartbeat, 30000);
});

client.on("disconnected", (reason) => {
  console.log("❌ WhatsApp Client Terputus:", reason);
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
});
client.on("authenticated", () => console.log("✅ WhatsApp Terautentikasi!"));
client.on("auth_failure", (msg) => console.error("❌ Gagal Autentikasi:", msg));
client.on("loading_screen", (percent, message) => {
  console.log(`⏳ Loading WhatsApp: ${percent}% - ${message}`);
});

// Global state
global.cacheJadwal = [];
global.cacheRekapSemua = [];
global.lastJadwal = null;
let isCacheReady = false;
global.autoRekapActive = true;

// Buffer Custom 2 Langkah (Legacy) - Dihapus karena konflik dengan Menu

// === NEW: SESSION UNTUK PANDUAN INTERAKTIF ===
global.sessionPanduan = {};

// === NEW: STATE MANAGEMENT PER-SENDER UNTUK KONFIRMASI ===
global.pendingAction = {}; // Struktur: { [from]: { type, data, expiredAt } }

process.on("unhandledRejection", (r) =>
  console.error("UnhandledRejection:", r)
);
process.on("uncaughtException", (e) => console.error("UncaughtException:", e));

/* ========== Handlers ========== */

// --- 1. JADWAL ---
async function handleJadwal(msg, pesan) {
  try {
    const input = (pesan || "").toLowerCase().trim();
    const hariInput = validHari.find((h) => input.includes(h));
    const jamMatch = input.match(/jam\s*(\d+)/i);
    const jamInput = jamMatch ? jamMatch[1] : null;
    const hari = hariInput || hariIndonesiaFromMoment(moment());

    let jadwal = [];
    if (jamInput) jadwal = await ambilJadwal(hari, jamInput);
    else if (hariInput) jadwal = await ambilJadwalHari(hari);
    else jadwal = await ambilJadwal(hari, jamInput);

    if (!jadwal || jadwal.length === 0) {
      await msg.reply(
        `❌ Tidak ada jadwal ditemukan untuk ${jamInput ? "Jam " + jamInput + " " : ""
        }(${capitalize(hari)}).`
      );
      return;
    }

    global.lastJadwal = { hari, jam: jamInput, jadwal };
    await msg.reply(buildDaftarJadwalText(hari, jamInput, jadwal));
  } catch (err) {
    console.error("Error Jadwal:", err);
    await msg.reply(`⚠️ Gagal mengambil jadwal.`);
  }
}

// --- 2. ABSEN ---
async function handleAbsen(msg, pesan) {
  try {
    const daftar = (pesan || "")
      .split(/[\/\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const lj = global.lastJadwal || {};
    if (!lj.jadwal || !lj.jam) {
      await msg.reply(
        "⚠️ Panggil jadwal dengan *Jam X* dulu sebelum absen.\n" + panduanMenuUtama()
      );
      return;
    }

    const tanggal = tanggalNow();
    const hasil = [];
    const existing = await ambilAbsensiHari(tanggal);
    const existingSet = new Set(
      (existing || []).map(
        (r) =>
          (r.nama_guru || "").trim().toLowerCase() +
          "|||" +
          String(r.jam).trim()
      )
    );

    for (const entry of daftar) {
      const nomorMatch = entry.match(/\d+/);
      const kodeMatch = entry.match(/[HIAhiaSLsl]/);
      if (!nomorMatch || !kodeMatch) {
        hasil.push(`⚠️ Format "${entry}" salah.`);
        continue;
      }

      const nomor = parseInt(nomorMatch[0], 10);
      const kode = kodeMatch[0].toUpperCase();
      const status = getStatusFromCode(kode);
      const guru = lj.jadwal[nomor - 1];

      if (!guru) {
        hasil.push(`⚠️ Guru no ${nomor} tidak ada.`);
        continue;
      }

      const namaGuru = (guru.nama_guru || "").trim();
      const key = namaGuru.toLowerCase() + "|||" + String(lj.jam).trim();
      if (existingSet.has(key)) {
        hasil.push(`✅ ${namaGuru} → Sudah ada`);
        continue;
      }

      await simpanRekap({
        tanggal,
        hari: lj.hari,
        jam: lj.jam,
        nama_guru: namaGuru,
        kelas: guru.kelas || "",
        mapel: guru.mapel || "",
        status,
      });
      existingSet.add(key);
      hasil.push(`${emojiForStatus(status)} ${namaGuru} → ${status}`);

      // Notifikasi Personal (Menggunakan safeSendMessage)
      if (status === "ALPHA" || status === "IZIN" || status === "SAKIT") {
        const nomorGuru = getNomorWa(namaGuru);
        if (nomorGuru.length > 8) {
          const chatId = `${nomorGuru}@c.us`;
          const pesanGuru = `Assalamu’alaikum Wr. Wb P. ${namaGuru}
Pengawas mencatat Anda: ${status}
* Jam : ${lj.jam}
* Kelas: ${guru.kelas || ""}
* Mapel: ${guru.mapel || ""}
* Hari : ${capitalize(lj.hari)}.
🕒 Dicatat pada ${jamNow()} WIB.
-----------------------------------------

Terima kasih 🙏
Wassalamu’alaikum Wr. Wb`;

          // Kirim di background tanpa await agar tidak memperlambat loop absen
          safeSendMessage(chatId, pesanGuru).catch((e) =>
            console.log("Gagal notif personal:", e.message)
          );
        }
      }
    }
    
    await msg.reply(`📋 *Rekap Absen (${tanggal})*\n\n${hasil.join("\n")}`);
  } catch (err) {
    console.error("Error Absen:", err);
    await msg.reply(`⚠️ Gagal absen: ${err.message}`);
  }
}

// --- 3. ALARM MANUAL ---
async function manualAlarmGuru(msg) {
  try {
    const now = moment().tz("Asia/Jakarta");
    const jamSchedule = [
      { jamMulai: "10:00", jamSelesai: "11:00", jamKe: "1" },
      { jamMulai: "11:00", jamSelesai: "12:00", jamKe: "2" },
      { jamMulai: "12:00", jamSelesai: "13:00", jamKe: "3" },
    ];
    const currentSlot = jamSchedule.find((j) => {
      const start = moment.tz(
        `${now.format("YYYY-MM-DD")} ${j.jamMulai}`,
        "YYYY-MM-DD HH:mm",
        "Asia/Jakarta"
      );
      const end = moment.tz(
        `${now.format("YYYY-MM-DD")} ${j.jamSelesai}`,
        "YYYY-MM-DD HH:mm",
        "Asia/Jakarta"
      );
      return now.isSameOrAfter(start) && now.isBefore(end);
    });
    if (!currentSlot) {
      await msg.reply("Belum waktunya jam sekolah/peringatan.");
      return;
    }

    const hari = hariIndonesiaFromMoment(now);
    const jamKe = currentSlot.jamKe;
    const jadwalHari = await ambilJadwalHari(hari);
    const guruSekarang = jadwalHari.filter(
      (g) => String(g.jam).trim() === String(jamKe).trim()
    );

    if (guruSekarang.length === 0) {
      await msg.reply("Tidak ada guru terjadwal saat ini.");
      return;
    }

    const tanggal = tanggalNow();
    const allRekapToday = await ambilAbsensiHari(tanggal);
    let kirimCount = 0;

    const sentNumbers = new Set();

    await msg.reply("⏳ Memproses alarm, mohon tunggu...");

    for (const guru of guruSekarang) {
      const nama = (guru.nama_guru || "").trim();
      const nomorGuru = getNomorWa(nama);

      if (!nomorGuru || sentNumbers.has(nomorGuru)) continue;

      const entry = allRekapToday.find(
        (r) =>
          (r.nama_guru || "").trim().toLowerCase() === nama.toLowerCase() &&
          String(r.jam || "").trim() === String(jamKe).trim()
      );
      const statusAbsen =
        entry &&
        String(entry.status || "")
          .trim()
          .toUpperCase();
      if (["IZIN", "SAKIT", "LIBUR"].includes(statusAbsen)) continue;

      if (nomorGuru.length > 8) {
        const chatId = `${nomorGuru}@c.us`;
        const pesanAlarm = `⏰ *Pemberitahuan* ⏰\nDemi kelancaran KBM, dimohon kepada Guru yang memiliki jam mengajar saat ini untuk segera memasuki kelas. 🙏 *#Semangat_abdi_Kiyai*`;

        const success = await safeSendMessage(chatId, pesanAlarm);
        if (success) {
          sentNumbers.add(nomorGuru);
          kirimCount++;
          // Jeda random 1-2 detik agar aman
          await new Promise((r) =>
            setTimeout(r, Math.floor(Math.random() * 1000) + 1000)
          );
        }
      }
    }
    await msg.reply(`✅ Alarm selesai. ${kirimCount} pesan terkirim.`);
  } catch (err) {
    console.error("Error Alarm:", err);
    await msg.reply("⚠️ Gagal mengirim alarm.");
  }
}

// --- 4. CEK ---
async function handleCek(msg, jamFilter = null) {
  try {
    const hari = hariIndonesiaFromMoment(moment());
    const tanggal = tanggalNow();
    const jadwalHari = await ambilJadwalHari(hari);
    const absensi = await ambilAbsensiHari(tanggal);
    const sudahSet = new Set(
      (absensi || []).map(
        (r) =>
          (r.nama_guru || "").trim().toLowerCase() +
          "|||" +
          String(r.jam || "").trim()
      )
    );
    const belumList = jadwalHari
      .filter(
        (r) => !jamFilter || String(r.jam).trim() === String(jamFilter).trim()
      )
      .filter(
        (r) =>
          !sudahSet.has(
            (r.nama_guru || "").trim().toLowerCase() +
            "|||" +
            String(r.jam).trim()
          )
      );

    if (belumList.length === 0) {
      await msg.reply(`✅ Semua guru aman.`);
      return;
    }

    let teks = `📋 *Belum Absen (${capitalize(hari)})*\n`;
    belumList.forEach((r, i) => {
      teks += `${i + 1}. ${r.nama_guru} (Jam ${r.jam})\n`;
    });
    await msg.reply(teks.trim());
  } catch (err) {
    await msg.reply("⚠️ Error Cek.");
  }
}

// --- 5. DATA (Fully Restored) ---
async function handleData(msg, parts) {
  try {
    const daftar = await ambilSemuaGuruUnik();
    if (!parts || parts.length === 0) {
      let teks = `👥 *Daftar Guru Terdaftar*\n\n`;
      daftar.forEach((n, i) => (teks += `${i + 1}. ${n}\n`));
      await msg.reply(teks.trim());
      return;
    }

    const idx = parseInt(parts[0], 10);
    if (isNaN(idx) || idx < 1 || idx > daftar.length) {
      await msg.reply("⚠️ Format salah. Contoh: Data 2 atau Data 3 Oktober");
      return;
    }
    const nama = daftar[idx - 1];
    const bulanParam = parts[1]?.toLowerCase();
    const bulanMap = {
      januari: "01",
      februari: "02",
      maret: "03",
      april: "04",
      mei: "05",
      juni: "06",
      juli: "07",
      agustus: "08",
      september: "09",
      oktober: "10",
      november: "11",
      desember: "12",
    };
    let bulanYYYYMM = null;
    if (bulanParam && bulanMap[bulanParam]) {
      const tahun = moment().format("YYYY");
      bulanYYYYMM = `${tahun}-${bulanMap[bulanParam]}`;
    }

    const rekap = await ambilRekapGuru(nama, bulanYYYYMM);
    const hadir = rekap.filter(
      (r) => (r.status || "").toUpperCase() === "HADIR"
    ).length;
    const izin = rekap.filter(
      (r) => (r.status || "").toUpperCase() === "IZIN"
    ).length;
    const sakit = rekap.filter(
      (r) => (r.status || "").toUpperCase() === "SAKIT"
    ).length;
    const libur = rekap.filter(
      (r) => (r.status || "").toUpperCase() === "LIBUR"
    ).length;
    const alpha = rekap.filter(
      (r) => (r.status || "").toUpperCase() === "ALPHA"
    ).length;
    const totalJadwal = await ambilTotalJadwal(nama);

    let teks = `📋 *Rekap ${nama}${bulanYYYYMM ? " (" + capitalize(bulanParam) + ")" : ""
      }*\n\n`;
    teks += `✅ ${hadir} HADIR | ℹ️ ${izin} IZIN | 🤒 ${sakit} SAKIT | ✨ ${libur} LIBUR | 🅰️ ${alpha} ALPHA | 📝 ${totalJadwal} 1/MINGGU`;
    if ((rekap || []).length === 0) teks += `\n\n⚠️ Belum ada data absensi.`;
    await msg.reply(teks.trim());
  } catch (err) {
    console.error("Gagal handleData:", err);
    await msg.reply("⚠️ Gagal memproses perintah Data.");
  }
}

// --- 6. REKAP BULANAN (Fully Restored) ---
async function handleRekapBulan(msg, bulanParam) {
  try {
    const bulanInput = (bulanParam || "").toLowerCase().trim();
    const bulanMap = {
      januari: "01",
      februari: "02",
      maret: "03",
      april: "04",
      mei: "05",
      juni: "06",
      juli: "07",
      agustus: "08",
      september: "09",
      oktober: "10",
      november: "11",
      desember: "12",
    };

    if (!bulanMap[bulanInput]) {
      await msg.reply("⚠️ Gunakan format: Rekap Oktober");
      return;
    }

    const tahun = moment().format("YYYY");
    const bulanYYYYMM = `${tahun}-${bulanMap[bulanInput]}`;
    const namaBulanCapitalized = capitalize(bulanInput);

    const daftarGuru = await ambilSemuaGuruUnik();
    const allJadwal = global.cacheJadwal || [];
    const allRekap = global.cacheRekapSemua || [];

    // Sync sheet bulanan
    await syncBulananSheet(bulanInput, tahun).catch((e) => console.error("Gagal sync sheet bulanan:", e));

    let teks = `📋 *Rekap Bulan ${namaBulanCapitalized}*\n\n`;
    const lines = [];

    daftarGuru.forEach((namaGuru, index) => {
      let totalJadwal = 0;
      const jadwalGuru = allJadwal.filter(
        (j) =>
          (j.nama_guru || "").trim().toLowerCase() === namaGuru.toLowerCase()
      );

      const jadwalDenganTanggal = jadwalGuru.filter((j) =>
        (j.tanggal || "").startsWith(bulanYYYYMM)
      );
      if (jadwalDenganTanggal.length > 0) {
        totalJadwal = jadwalDenganTanggal.length;
      } else {
        const WEEKS_IN_MONTH = 4;
        totalJadwal = jadwalGuru.length * WEEKS_IN_MONTH;
      }

      const rekapGuru = allRekap.filter(
        (r) =>
          (r.nama_guru || "").trim().toLowerCase() === namaGuru.toLowerCase() &&
          (r.tanggal || "").startsWith(bulanYYYYMM)
      );

      const A = rekapGuru.filter(
        (r) => r.status?.toUpperCase() === "ALPHA"
      ).length;
      const I = rekapGuru.filter(
        (r) => r.status?.toUpperCase() === "IZIN"
      ).length;
      const S = rekapGuru.filter(
        (r) => r.status?.toUpperCase() === "SAKIT"
      ).length;
      const L = rekapGuru.filter(
        (r) => r.status?.toUpperCase() === "LIBUR"
      ).length;

      const JTM = rekapGuru.filter((r) => r.status?.toUpperCase() === "HADIR").length;

      const nomor = (index + 1).toString().padStart(2, "0");
      lines.push(`${nomor} ${namaGuru}`);
      lines.push(`JTM: ${JTM} | A: ${A} | I: ${I} | S: ${S} | L: ${L}\n`);
    });

    teks += lines.join("\n");
    await msg.reply(teks);
  } catch (err) {
    console.error("Gagal handleRekapBulan:", err);
    await msg.reply("⚠️ Terjadi kesalahan saat membuat rekap bulanan.");
  }
}

// --- 7. KIRIM CUSTOM (Legacy) ---
async function handleKirimCustom(msg, indexesStr, pesanCustom) {
  try {
    const daftarGuru = await ambilSemuaGuruUnik();
    const allJadwal = global.cacheJadwal || [];

    const indexes = (indexesStr || "")
      .split(/\s+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    if (indexes.length === 0) {
      await msg.reply("⚠️ Format salah. Tidak ada nomor guru yang valid.");
      return;
    }

    const hasilKirim = [];
    const waNotFound = [];
    const sentTo = new Set();

    await msg.reply(`📨 Sedang mengirim ke ${indexes.length} nomor...`);

    for (const idx of indexes) {
      const namaGuru = daftarGuru[idx - 1];
      if (!namaGuru) continue;

      const guruJadwal = allJadwal.find(
        (j) =>
          (j.nama_guru || "").trim().toLowerCase() === namaGuru.toLowerCase()
      );
      const nomorWa = getNomorWa(namaGuru);

      if (nomorWa.length > 8) {
        if (sentTo.has(nomorWa)) continue;

        const chatId = `${nomorWa}@c.us`;

        // Gunakan safeSendMessage dengan delay
        const success = await safeSendMessage(chatId, pesanCustom);
        if (success) {
          hasilKirim.push(`${idx}. ${namaGuru}`);
          sentTo.add(nomorWa);
          // Delay random 1.5 - 3 detik
          await new Promise((r) =>
            setTimeout(r, Math.floor(Math.random() * 1500) + 1500)
          );
        } else {
          hasilKirim.push(`❌ ${namaGuru} (Gagal)`);
        }
      } else {
        waNotFound.push(`${idx}. ${namaGuru}`);
      }
    }

    let balasan = `✅ *Pesan Custom Selesai*\nDikirim ke: ${sentTo.size} guru.\n`;
    await msg.reply(balasan.trim());
  } catch (err) {
    console.error("Gagal handleKirimCustom:", err);
    await msg.reply("⚠️ Gagal memproses perintah Kirim.");
  }
}

// === FITUR BROADCAST DENGAN VALIDASI & DEDUPLIKASI ===

async function prepareBroadcast(msg, mode, pesanTeks, media, senderId) {
  try {
    const allJadwal = global.cacheJadwal || [];
    let targetList = []; // { nama, nomor }
    let deskripsi = "";

    const uniqueNumbers = new Set();

    if (mode === "ALL") {
      deskripsi = "SEMUA GURU (Database)";
      allJadwal.forEach((j) => {
        const nama = (j.nama_guru || "").trim();
        const rawNum = getNomorWa(nama);

        if (rawNum.length > 8) {
          if (!uniqueNumbers.has(rawNum)) {
            uniqueNumbers.add(rawNum);
            targetList.push({ nama, nomor: rawNum });
          }
        }
      });
    } else {
      const hari = hariIndonesiaFromMoment(moment());
      deskripsi = `GURU JADWAL HARI INI (${capitalize(hari)})`;

      const tanggal = tanggalNow();
      const absensiHariIni = await ambilAbsensiHari(tanggal);
      const guruAbsenNegatif = new Set();

      absensiHariIni.forEach((row) => {
        const status = (row.status || "").toUpperCase();
        const namaNorm = (row.nama_guru || "").trim().toLowerCase();
        if (status === "IZIN" || status === "SAKIT") {
          guruAbsenNegatif.add(namaNorm);
        }
      });

      const jadwalHari = await ambilJadwalHari(hari);

      jadwalHari.forEach((j) => {
        const nama = (j.nama_guru || "").trim();
        const rawNum = getNomorWa(nama);

        if (guruAbsenNegatif.has(nama.toLowerCase())) return;

        if (rawNum.length > 8) {
          if (!uniqueNumbers.has(rawNum)) {
            uniqueNumbers.add(rawNum);
            targetList.push({ nama, nomor: rawNum });
          }
        }
      });
    }

    if (targetList.length === 0) {
      await msg.reply(
        `⚠️ Tidak ada target valid (punya nomor WA & Tidak Izin/Sakit).`
      );
      return;
    }

    const from = senderId || (msg && msg.from) || "UNKNOWN";
    global.pendingAction[from] = {
      type: 'BROADCAST',
      data: {
        targets: targetList,
        message: pesanTeks,
        media: media,
        mode: mode,
      },
      expiredAt: Date.now() + 5 * 60 * 1000
    };

    const previewNames = targetList
      .slice(0, 15)
      .map((t) => t.nama)
      .join(", ");
    const sisa =
      targetList.length > 15 ? `...dan ${targetList.length - 15} lainnya.` : "";

    await msg.reply(
      `✋ *KONFIRMASI BROADCAST*\n\n` +
      `🎯 Target: ${deskripsi}\n` +
      `👥 Jumlah: ${targetList.length} Guru\n` +
      `📝 Pesan: "${pesanTeks
        ? pesanTeks.substring(0, 50) + (pesanTeks.length > 50 ? "..." : "")
        : "[Hanya Gambar]"
      }"\n\n` +
      `Penerima:\n${previewNames} ${sisa}\n\n` +
      `👉 Ketik *Ya* untuk mengirim.\n👉 Ketik *Tidak* untuk membatalkan.`
    );
  } catch (err) {
    console.error("Gagal prepare broadcast:", err);
    await msg.reply("⚠️ Error menyiapkan broadcast.");
  }
}

async function executeBroadcast(msg) {
  try {
    const from = msg.author || msg.from;
    const session = global.pendingAction[from];
    if (!session || session.type !== 'BROADCAST') return;
    const data = session.data;

    await msg.reply(`🚀 Mengirim pesan ke ${data.targets.length} guru...`);

    let sukses = 0;
    let gagal = 0;

    for (const t of data.targets) {
      const chatId = `${t.nomor}@c.us`;

      // Gunakan safeSendMessage
      let success = false;
      if (data.media) {
        success = await safeSendMessage(chatId, data.media, {
          caption: data.message,
        });
      } else {
        success = await safeSendMessage(chatId, data.message);
      }

      if (success) {
        sukses++;
      } else {
        gagal++;
      }
      // DELAY LEBIH LAMA & ACAK (2000ms - 4000ms) untuk menghindari crash (baik sukses maupun gagal)
      const delay = Math.floor(Math.random() * 2000) + 2000;
      await new Promise((r) => setTimeout(r, delay));
    }

    await msg.reply(
      `✅ Broadcast Selesai!\n🎯 Target: ${data.mode}\n✅ Sukses: ${sukses}\n❌ Gagal: ${gagal}`
    );

    // Reset state
    delete global.pendingAction[from];
  } catch (err) {
    console.error("Execute error:", err);
    await msg.reply("⚠️ Gagal mengeksekusi broadcast.");
  }
}

/* ========== Rekap Otomatis ========== */
setInterval(async () => {
  try {
    const now = moment().tz("Asia/Jakarta");
    if (now.format("HH:mm") !== "14:30") return;

    // Baca status autoRekapActive dari sheet Setting
    let isAutoRekapActive = true;
    try {
      const settingsData = await ambilSheetRange("Setting", "A1:B10");
      const row = settingsData.find(r => String(r[0] || "").trim() === 'autoRekapActive');
      if (row && String(row[1]).toUpperCase() === 'FALSE') {
        isAutoRekapActive = false;
      }
    } catch (e) {
      console.warn("⚠️ Gagal membaca autoRekapActive dari sheets:", e.message);
      isAutoRekapActive = global.autoRekapActive; // fallback
    }

    if (!isAutoRekapActive) return;

    const hariSekarang = hariIndonesiaFromMoment(now);
    if (hariSekarang === "jumat") return;
    const tanggal = tanggalNow();
    const absensi = await ambilAbsensiHari(tanggal);
    if (!absensi || absensi.length === 0) return;

    let teks = `📊 *Rekap Otomatis ${tanggal}*\n\n`;
    for (const jam of ["1", "2", "3"]) {
      const part = await buatRekapPerJamText(tanggal, jam);
      teks += part + "\n\n";
    }
    
    // Tambahkan pesan bantuan ekspor PDF/Excel
    teks += `_💡 Tulis *"Kirim rekap [sebut bulan]"* (contoh: Kirim rekap Juni) untuk menerima rekap bulanan dalam format Excel/PDF._`;

    for (const nomor of nomorRekapOtomatis) {
      const chatId = nomor.replace(/\D/g, "") + "@c.us";
      await safeSendMessage(chatId, teks.trim()); // Gunakan safeSendMessage
      await new Promise((r) => setTimeout(r, 2000)); // Delay antar admin
    }
    console.log(`📤 Rekap otomatis per jam terkirim (${tanggal})`);
  } catch (err) {
    console.error("Gagal kirim rekap otomatis per jam:", err);
  }
}, 60000);

/* ========== Event Message ========== */
client.on("message_create", async (msg) => {
  try {
    // Abaikan jika pesan berasal dari bot sendiri
    if (msg.fromMe) {
      return;
    }

    // Abaikan jika pesan berasal dari atau ditujukan ke status WhatsApp (story)
    if (msg.from === "status@broadcast" || msg.to === "status@broadcast") {
      return;
    }

    if (!isCacheReady) {
      await msg.reply("⏳ Tunggu sebentar, memuat data...");
      return;
    }

    // Ambil nomor pengirim (baik dari chat pribadi atau grup)
    const senderJid = msg.author || msg.from;
    let senderNumber = senderJid.split('@')[0]; // Mengambil angka saja

    console.log(`📩 Pesan masuk dari ${senderNumber}: ${msg.body}`);

    // Periksa apakah terdaftar sebagai pengawas (dengan toleransi LID JID)
    let isPengawas = semuaPengawas.includes(senderNumber);
    if (!isPengawas) {
      try {
        const contact = await msg.getContact();
        if (contact && contact.id && contact.id.user) {
          const resolvedNumber = contact.id.user;
          if (semuaPengawas.includes(resolvedNumber)) {
            console.log(`ℹ️ Nomor JID ${senderNumber} diterjemahkan ke nomor HP pengawas: ${resolvedNumber}`);
            senderNumber = resolvedNumber;
            isPengawas = true;
          }
        }
      } catch (err) {
        console.error("⚠️ Gagal mendapatkan nomor asli via Contact:", err.message);
      }
    }

    if (!isPengawas) {
      console.log(`🚫 Nomor ${senderNumber} tidak terdaftar sebagai pengawas. Mengabaikan.`);
      return;
    }

    const from = senderNumber; // Gunakan nomor telepon asli (PN) sebagai identitas pengirim

    const pesan = (msg.body || "").trim();
    const input = pesan.toLowerCase().trim();

    let media = null;
    if (msg.hasMedia) {
      try {
        media = await msg.downloadMedia();
      } catch (e) { }
    }

    // 1. CEK KONFIRMASI (BROADCAST / KOREKSI / EKSPOR)
    const session = global.pendingAction[from];
    if (session) {
      if (Date.now() > session.expiredAt) {
        delete global.pendingAction[from];
        await msg.reply('⏰ Sesi konfirmasi kedaluwarsa. Silakan ulangi perintah.');
        return;
      }

      if (session.type === 'KOREKSI') {
        if (input === "ya") {
          await executeCorrection(msg);
          return;
        } else if (input === "tidak") {
          delete global.pendingAction[from];
          await msg.reply("❌ Koreksi dibatalkan.");
          return;
        }
        await msg.reply("⚠️ Ada koreksi tertunda. Ketik *Ya* untuk melanjutkan atau *Tidak* untuk batal.");
        return;
      }

      if (session.type === 'EKSPOR') {
        if (input === "pdf" || input === "excel") {
          const format = input === "pdf" ? "pdf" : "xlsx";
          const { monthName, sheetId, year } = session.data;
          delete global.pendingAction[from];

          await msg.reply(`⏳ Sedang menyiapkan berkas rekap ${monthName} (${format.toUpperCase()})...`);
          await downloadDanKirimRekap(msg, format, monthName, sheetId, year);
          return;
        } else if (input === "batal") {
          delete global.pendingAction[from];
          await msg.reply("❌ Permintaan ekspor berkas dibatalkan.");
          return;
        }
        await msg.reply(`⚠️ Format salah. Silakan balas dengan *PDF* atau *Excel* untuk mengunduh rekap ${session.data.monthName}, atau ketik *Batal* untuk membatalkan.`);
        return;
      }

      if (session.type === 'BROADCAST') {
        if (input === "ya") {
          await executeBroadcast(msg);
          return;
        } else if (input === "tidak") {
          delete global.pendingAction[from];
          await msg.reply("❌ Broadcast dibatalkan.");
          return;
        }
        await msg.reply("⚠️ Ada broadcast tertunda. Ketik *Ya* untuk kirim atau *Tidak* untuk batal.");
        return;
      }
    }

    // Toggle Off
    if (input === "off") {
      global.autoRekapActive = false;
      await msg.reply("🔕 Auto-Rekap Harian (14:30) telah DIMATIKAN.");
      return;
    }
    // Toggle On
    if (input === "on") {
      global.autoRekapActive = true;
      await msg.reply("🔔 Auto-Rekap Harian (14:30) telah DIAKTIFKAN.");
      return;
    }
    // Bulk Action (Alpha1, Alpha2, Hadir3, dll)
    const bulkMatch = input.match(/^(alpha|hadir)([1-3])$/i);
    if (bulkMatch) {
      const typeStatus = bulkMatch[1]; // alpha atau hadir
      const jam = bulkMatch[2]; // 1, 2, atau 3
      await handleBulkStatus(msg, typeStatus, jam);
      return;
    }

    // Koreksi Absensi (Koreksi 1H, Koreksi 2I, dll)
    const koreksiMatch = pesan.match(/^koreksi\s+(\d+)([HIAhiaSLsl])$/i);
    if (koreksiMatch) {
      const nomor = parseInt(koreksiMatch[1], 10);
      const kode = koreksiMatch[2].toUpperCase();
      await handleKoreksi(msg, nomor, kode);
      return;
    }

    // 2. BROADCAST TRIGGER
    if (/^\*{2}\s+/.test(pesan)) {
      // Semua Guru
      const konten = pesan.replace(/^\*{2}\s+/, "").trim();
      if (!konten && !media) {
        await msg.reply("Isi pesan setelah **");
        return;
      }
      await prepareBroadcast(msg, "ALL", konten, media, from);
      return;
    }
    if (/^\*\s+/.test(pesan)) {
      // Guru Hari Ini
      const konten = pesan.replace(/^\*\s+/, "").trim();
      if (!konten && !media) {
        await msg.reply("Isi pesan setelah *");
        return;
      }
      await prepareBroadcast(msg, "TODAY", konten, media, from);
      return;
    }

    // 3. FITUR LAIN



    // Fitur Legacy "Kirim No Pesan"
    const kirimCustomMatch = pesan.match(/^kirim\s+([\d\s]+?)\s+(.+)$/i);
    if (kirimCustomMatch) {
      const indexesStr = kirimCustomMatch[1];
      const pesanCustom = kirimCustomMatch[2];
      await handleKirimCustom(msg, indexesStr, pesanCustom);
      return;
    }

    // Data command
    if (/^data(\s+.*)?$/i.test(input)) {
      const parts = input.split(/\s+/).slice(1);
      await handleData(msg, parts);
      return;
    }

    // Ekspor File Rekap Bulanan (PDF / Excel)
    const kirimRekapMatch = input.match(
      /^kirim\s+rekap\s+(?:bulan\s+)?(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)$/i
    );
    if (kirimRekapMatch) {
      const monthInput = kirimRekapMatch[1];
      const monthName = capitalize(monthInput.toLowerCase());
      const client = await getSheetsClient();
      const metadata = await client.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
      const sheets = metadata.data.sheets || [];
      let targetSheet = sheets.find(s => s.properties.title.toLowerCase() === monthName.toLowerCase());

      await msg.reply(`⏳ Menyinkronkan data rekap untuk bulan ${monthName} terlebih dahulu...`);
      const tahun = moment().format("YYYY");
      await syncBulananSheet(monthName, tahun);

      // Ambil ulang metadata untuk mendapat sheetId
      const newMetadata = await client.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
      targetSheet = (newMetadata.data.sheets || []).find(s => s.properties.title.toLowerCase() === monthName.toLowerCase());
      if (!targetSheet) {
        await msg.reply(`❌ Gagal menyinkronkan sheet rekap untuk bulan ${monthName}.`);
        return;
      }

      const sheetId = targetSheet.properties.sheetId;
      const year = moment().format("YYYY");

      global.pendingAction[from] = {
        type: 'EKSPOR',
        data: {
          monthName: monthName,
          year: year,
          sheetId: sheetId
        },
        expiredAt: Date.now() + 5 * 60 * 1000
      };

      await msg.reply(
        `📋 *PILIH FORMAT REKAP BULAN ${monthName.toUpperCase()}*\n\n` +
        `Silakan balas dengan:\n` +
        `👉 *PDF* (format berkas dokumen PDF siap cetak)\n` +
        `👉 *Excel* (format berkas spreadsheet .xlsx)\n\n` +
        `Atau balas dengan *Batal* untuk membatalkan.`
      );
      return;
    }

    // Rekap Bulanan
    const rekapBulanMatch = input.match(
      /^rekap\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)$/i
    );
    if (rekapBulanMatch) {
      const bulan = rekapBulanMatch[1];
      await handleRekapBulan(msg, bulan);
      return;
    }

    // Cek
    const cekJamMatch =
      input.match(/^cek\s*([1-3])$/i) || input.match(/^cek([1-3])$/i);
    if (cekJamMatch) {
      const jam = cekJamMatch[1];
      const teks = await buatRekapPerJamText(tanggalNow(), jam);
      await msg.reply(teks);
      return;
    }
    if (/^cek\s*123$/i.test(input) || /^cek123$/i.test(input)) {
      const tanggal = tanggalNow();
      let gab = "";
      for (const jam of ["1", "2", "3"]) {
        const part = await buatRekapPerJamText(tanggal, jam);
        gab += part + "\n\n";
      }
      await msg.reply(gab.trim());
      return;
    }
    if (/^cek$/i.test(input)) {
      await handleCek(msg);
      return;
    }

    // Cek Kontak WA (Uji Coba)
    if (/^cek\s*kontak$/i.test(input)) {
      if (!global.cacheNoWa || global.cacheNoWa.length === 0) {
        await msg.reply("⚠️ Data kontak belum tersedia atau sheet no_wa kosong.");
        return;
      }
      let teks = "📋 *Daftar Kontak Guru (Sheet no_wa)*\n\n";
      global.cacheNoWa.forEach((row, idx) => {
        const nama = (row.nama_guru || "").trim();
        const nomor = (row.no_wa || row.nomor_wa || "").replace(/\D/g, "");
        teks += `${idx + 1}. ${nama}\n   📱 ${nomor || "Kosong"}\n`;
      });
      teks += "\n_💡 Pastikan format penulisan nomor berisi kode negara (misal: 628...)_";
      await msg.reply(teks);
      return;
    }

    // Alarm Manual
    if (/^masuk$/i.test(input)) {
      await msg.reply("🔔 Permintaan masuk diterima...");
      await manualAlarmGuru(msg);
      return;
    }

    // Absen & Jadwal
    if (
      /^jam\s*\d+$/i.test(input) ||
      /^(senin|selasa|rabu|kamis|jumat|sabtu|ahad)$/i.test(input)
    ) {
      await handleJadwal(msg, pesan);
      return;
    }
    if (/^(\d+[HIAhiaSLsl])/.test(input)) {
      await handleAbsen(msg, pesan);
      return;
    }

    // Menu Interaktif & Default Fallback
    const lastSession = global.sessionPanduan[from];
    const isSessionActive = lastSession && (Date.now() - lastSession <= 5 * 60 * 1000);

    // Jika user mengetik angka 1-6 dan sedang dalam sesi aktif
    if (isSessionActive && /^[1-6]$/.test(input)) {
      await msg.reply(panduanSubMenu(input));
      // Hapus sesi agar mereka tidak tak sengaja menekan angka lagi nantinya
      delete global.sessionPanduan[from];
      return;
    }

    // Default Fallback (Perintah tidak sah) -> Tampilkan Menu
    global.sessionPanduan[from] = Date.now();
    await msg.reply(panduanMenuUtama());
  } catch (err) {
    // Tambahkan log detail untuk debugging
    console.error("❌ Error di handler pesan:", err.message, err.stack);
  }
});

// Refresh Cache Logic
async function refreshCache() {
  if (!sheetsClient) {
    console.log("...menunggu sheets client siap");
    await getSheetsClient();
  }

  try {
    const dataJadwal = await ambilSheetRange("jadwal");
    global.cacheJadwal = dataJadwal;

    const dataRekap = await ambilSheetRange("rekap");
    global.cacheRekapSemua = dataRekap;

    try {
      const dataNoWa = await ambilSheetRange("no_wa");
      global.cacheNoWa = dataNoWa;
    } catch (e) {
      console.warn("⚠️ Sheet no_wa belum tersedia atau kosong.");
      global.cacheNoWa = [];
    }

    if (!isCacheReady) {
      console.log(
        `✅ Cache awal siap: ${dataJadwal.length} jadwal, ${dataRekap.length} total rekap.`
      );
    } else {
      console.log(
        `♻️ Cache di-refresh: ${dataJadwal.length} jadwal, ${dataRekap.length} total rekap.`
      );
    }
    isCacheReady = true;
  } catch (err) {
    console.error("❌ Gagal me-refresh cache:", err.message || err);
    isCacheReady = false; // Set false agar dicoba lagi
  }
}

async function startBot() {
  try {
    console.log("🔄 Menginisialisasi Google Sheets client...");
    await getSheetsClient();

    console.log("📡 Menjalankan WhatsApp Web...");
    client.initialize();

    console.log("⏳ Mengambil data cache awal...");
    await refreshCache();

    setInterval(refreshCache, 5 * 60 * 1000);

    console.log("🌐 Memulai Task Queue Polling...");
    initTaskQueuePolling();
  } catch (err) {
    console.error(
      "❌ Gagal total saat startup (Google Sheets atau WA):",
      err.message || err
    );
    process.exit(1);
  }
}

startBot();
/* =========================
   TASK QUEUE POLLING (AUTOMATION WORKER)
   ========================= */
let isPollingTask = false;

async function initTaskQueuePolling() {
  console.log("🔄 Automation Worker siap membaca Task_Queue...");
  
  // Create sheet if not exist
  try {
    const client = await getSheetsClient();
    const metadata = await client.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
    const sheets = metadata.data.sheets || [];
    let sheetExists = sheets.some(s => s.properties.title === 'Task_Queue');
    if (!sheetExists) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEET_ID,
        resource: { requests: [{ addSheet: { properties: { title: 'Task_Queue' } } }] }
      });
      // Add Headers
      await client.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `Task_Queue!A1`,
        valueInputOption: "USER_ENTERED",
        resource: { values: [["ID", "Task_Type", "Payload", "Status", "Timestamp", "Result_Log"]] }
      });
      console.log("✅ Sheet Task_Queue berhasil dibuat.");
    }
  } catch (e) {
    console.log("⚠️ Gagal mengecek/membuat Task_Queue:", e.message);
  }

  setInterval(async () => {
    if (isPollingTask) return;
    isPollingTask = true;
    try {
      const tasks = await ambilSheetRange("Task_Queue", "A:F");
      if (!tasks || tasks.length === 0) return;
      
      const clientSheets = await getSheetsClient();
      
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (String(task.status).toUpperCase() === 'PENDING') {
          const rowIndex = i + 2; // +1 header, +1 for 0-index
          
          // Mark as PROCESSING
          await clientSheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `Task_Queue!D${rowIndex}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [["PROCESSING"]] }
          });
          
          try {
            const tType = String(task.task_type).toUpperCase();
            if (tType === 'SEND_WHATSAPP') {
              const payload = JSON.parse(task.payload);
              const target = payload.target || payload.targetMode;
              const msg = payload.message;
              
              if (target && msg) {
                const mockMsg = createMockMsg("WORKER");
                const mode = target.toLowerCase() === 'semua' ? 'SEMUA' : target.toUpperCase();
                await prepareBroadcast(mockMsg, mode, msg, null, "WORKER");
                await executeBroadcast(mockMsg);
              }
            } else if (tType === 'ALARM') {
              const mockMsg = createMockMsg("WORKER");
              await manualAlarmGuru(mockMsg);
            } else if (tType === 'EKSPOR_BULANAN') {
              const payload = JSON.parse(task.payload);
              const format = payload.format;
              const monthName = payload.monthName;
              const year = payload.year;
              const phone = payload.phone;

              if (format && monthName && year && phone) {
                console.log(`[WORKER] Menyinkronkan sheet rekap bulanan ${monthName}...`);
                await syncBulananSheet(monthName, year);

                const client = await getSheetsClient();
                const metadata = await client.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
                const sheets = metadata.data.sheets || [];
                const targetSheet = sheets.find(s => s.properties.title.toLowerCase() === monthName.toLowerCase());
                if (!targetSheet) {
                  throw new Error(`Sheet rekap untuk bulan ${monthName} tidak ditemukan.`);
                }
                const sheetId = targetSheet.properties.sheetId;

                const chatId = phone.replace(/\D/g, "") + "@c.us";
                const mockMsg = {
                  from: "WORKER",
                  reply: async (mediaOrText) => {
                    await safeSendMessage(chatId, mediaOrText);
                  }
                };

                console.log(`[WORKER] Mengirim berkas rekap ${monthName} (${format}) ke ${chatId}...`);
                await downloadDanKirimRekap(mockMsg, format, monthName, sheetId, year);
              }
            }
            
            // Mark as DONE
            await clientSheets.spreadsheets.values.update({
              spreadsheetId: GOOGLE_SHEET_ID,
              range: `Task_Queue!D${rowIndex}:F${rowIndex}`,
              valueInputOption: "USER_ENTERED",
              requestBody: { values: [["DONE", new Date().toISOString(), "Berhasil dieksekusi"]] }
            });
            console.log(`✅ Task ${task.id} (${tType}) selesai.`);
            
          } catch (execErr) {
            console.error(`❌ Gagal mengeksekusi task ID: ${task.id}`, execErr.message);
            // Mark as FAILED
            await clientSheets.spreadsheets.values.update({
              spreadsheetId: GOOGLE_SHEET_ID,
              range: `Task_Queue!D${rowIndex}:F${rowIndex}`,
              valueInputOption: "USER_ENTERED",
              requestBody: { values: [["FAILED", new Date().toISOString(), execErr.message || "Gagal dieksekusi"]] }
            });
          }
        }
      }
    } catch (e) {
      console.error("⚠️ Error saat polling Task_Queue:", e.message);
    } finally {
      isPollingTask = false;
    }
  }, 10000); // Polling every 10s
}

function createMockMsg(senderId) {
  let responseText = "";
  return {
    from: senderId,
    body: "",
    reply: async (text) => {
      console.log(`[REPLY to ${senderId}]: ${text}`);
      responseText += text + "\n";
    },
    getResponseText: () => responseText.trim(),
    getChat: async () => ({
      sendMessage: async (txt) => {
        console.log(`[CHAT_SEND to ${senderId}]: ${txt}`);
        responseText += txt + "\n";
      }
    })
  };
}

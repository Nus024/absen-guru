import { GoogleSheetsHelper } from "./sheets.js";
import { 
  verifyPassword, 
  generateToken, 
  verifyToken,
  normalizePhoneNumber, 
  createResponse, 
  createErrorResponse 
} from "./auth.js";

async function authenticate(request, env) {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Missing or invalid token");
	}
	const token = authHeader.split(" ")[1];
	const payload = await verifyToken(token, env.JWT_SECRET);
	return payload;
}

function getIndoDayName(dateStr) {
	const d = new Date(dateStr);
	const days = ["ahad", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
	return days[d.getUTCDay()];
}

function getWeekdayCount(year, month) {
	const counts = { ahad: 0, senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0 };
	const daysInMonth = new Date(year, month, 0).getDate();
	const dayNames = ['ahad', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']; 
	for (let i = 1; i <= daysInMonth; i++) {
		const date = new Date(year, month - 1, i);
		const dayIdx = date.getDay(); 
		if (dayIdx === 5) continue; // Jumat Libur
		counts[dayNames[dayIdx]]++;
	}
	return counts;
}

async function syncBulananOnline(sheets, monthName, year) {
	const INDO_MONTHS_MAP = {
		januari: "01", februari: "02", maret: "03", april: "04", mei: "05", juni: "06",
		juli: "07", agustus: "08", september: "09", oktober: "10", november: "11", desember: "12"
	};

	const cleanMonth = String(monthName).toLowerCase().trim();
	const monthNum = INDO_MONTHS_MAP[cleanMonth];
	const targetSheetName = monthName.trim();

	if (!monthNum) {
		throw new Error(`Bulan tidak valid: ${monthName}`);
	}

	const bulanYYYYMM = `${year}-${monthNum}`;

	const [jadwalData, rekapData] = await Promise.all([
		sheets.readData('Jadwal!A:E'),
		sheets.readData('rekap!A:G')
	]);

	const jRows = jadwalData.slice(1);
	const lRows = rekapData.slice(1);

	const jHeader = (jadwalData[0] || []).map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));
	const idxNama = jHeader.indexOf('nama_guru') !== -1 ? jHeader.indexOf('nama_guru') : jHeader.indexOf('nama');
	const idxHari = jHeader.indexOf('hari');
	const idxJam = jHeader.indexOf('jam');

	if (idxNama === -1 || idxHari === -1 || idxJam === -1) {
		throw new Error("Kolom Jadwal tidak lengkap (wajib ada nama_guru, hari, jam)");
	}

	const rHeader = (rekapData[0] || []).map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));
	const idxTanggal = rHeader.indexOf('tanggal');
	const idxNamaRekap = rHeader.indexOf('nama_guru') !== -1 ? rHeader.indexOf('nama_guru') : rHeader.indexOf('nama');
	const idxStatus = rHeader.indexOf('status');
	const idxJamRekap = rHeader.indexOf('jam');

	if (idxTanggal === -1 || idxNamaRekap === -1 || idxStatus === -1 || idxJamRekap === -1) {
		throw new Error("Kolom rekap tidak lengkap (wajib ada tanggal, nama_guru, jam, status)");
	}

	// Ambil semua guru unik dari Jadwal
	const setGuru = new Set();
	jRows.forEach(row => {
		const nama = String(row[idxNama] || "").trim();
		if (nama) setGuru.add(nama);
	});
	const daftarGuru = Array.from(setGuru).sort();

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

	const normalisasiHari = (h) => {
		if (!h) return "";
		const clean = String(h).trim().toLowerCase();
		if (clean === "senin" || clean === "mon") return "senin";
		if (clean === "selasa" || clean === "tue") return "selasa";
		if (clean === "rabu" || clean === "wed") return "rabu";
		if (clean === "kamis" || clean === "thu") return "kamis";
		if (clean === "jumat" || clean === "fri") return "jumat";
		if (clean === "sabtu" || clean === "sat") return "sabtu";
		if (clean === "ahad" || clean === "minggu" || clean === "sun") return "ahad";
		return clean;
	};

	// Group schedules
	const teacherDayLoad = {};
	jRows.forEach(row => {
		const nama = String(row[idxNama] || "").trim();
		if (!nama) return;
		const hari = normalisasiHari(row[idxHari]);
		if (!teacherDayLoad[nama]) teacherDayLoad[nama] = {};
		if (!teacherDayLoad[nama][hari]) teacherDayLoad[nama][hari] = 0;
		teacherDayLoad[nama][hari]++;
	});

	const dataRows = [];

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

		const rekapGuruBulanIni = lRows.filter(r => 
			String(r[idxNamaRekap] || "").trim().toLowerCase() === namaGuru.toLowerCase() &&
			String(r[idxTanggal] || "").startsWith(bulanYYYYMM)
		);

		let H_total = 0, I_total = 0, S_total = 0, L_total = 0, A_total = 0;
		const rowData = [index + 1, namaGuru, jtm7Hari, totalJadwal];

		validDates.forEach((d) => {
			const jadwalHariIni = jRows.filter(j => 
				String(j[idxNama] || "").trim().toLowerCase() === namaGuru.toLowerCase() && 
				normalisasiHari(j[idxHari]) === d.hari
			);
			const rekapHariIni = rekapGuruBulanIni.filter(r => String(r[idxTanggal] || "").trim() === d.dateStr);

			for (let jam = 1; jam <= 3; jam++) {
				const isJadwal = jadwalHariIni.some(j => String(j[idxJam] || "").trim() === String(jam));

				if (!isJadwal) {
					rowData.push("");
				} else {
					const rekapJam = rekapHariIni.find(r => String(r[idxJamRekap] || "").trim() === String(jam));
					if (rekapJam) {
						const status = String(rekapJam[idxStatus] || "").toUpperCase();
						if (status === "HADIR") { rowData.push("H"); H_total++; }
						else if (status === "IZIN") { rowData.push("I"); I_total++; }
						else if (status === "SAKIT") { rowData.push("S"); S_total++; }
						else if (status === "ALPHA" || status === "ALPA") { rowData.push("A"); A_total++; }
						else if (status === "LIBUR") { rowData.push("L"); L_total++; }
						else { rowData.push(""); }
					} else {
						rowData.push("");
					}
				}
			}
		});

		const rekapTotal = totalJadwal - (I_total + S_total + L_total + A_total);
		rowData.push(H_total, I_total, S_total, L_total, A_total, rekapTotal);
		dataRows.push(rowData);
	});

	// Create/Clear sheet
	const sheetList = await sheets.getSheetsList();
	let sheetExists = sheetList.some(s => s.properties.title.toLowerCase() === targetSheetName.toLowerCase());
	if (!sheetExists) {
		await sheets.createSheet(targetSheetName);
	}

	try {
		await sheets.clearData(`${targetSheetName}!A:ZZ`);
	} catch (clearErr) {
		console.warn("Gagal mengosongkan sheet:", clearErr.message);
	}

	// Buat values
	const headers1 = ["NO", "NAMA", "JTM 7 HARI", "JADWAL"];
	validDates.forEach(d => { headers1.push(d.label, "", ""); });
	headers1.push("HADIR", "IZIN", "SAKIT", "LIBUR", "ALPHA", "REKAP");

	let totalJTM = 0;
	let totalJadwalAll = 0;
	let totalHadirAll = 0;
	let totalIzinAll = 0;
	let totalSakitAll = 0;
	let totalLiburAll = 0;
	let totalAlphaAll = 0;
	let totalRekapAll = 0;

	dataRows.forEach(row => {
		totalJTM += row[2] || 0;
		totalJadwalAll += row[3] || 0;
		const len = row.length;
		totalHadirAll += row[len - 6] || 0;
		totalIzinAll += row[len - 5] || 0;
		totalSakitAll += row[len - 4] || 0;
		totalLiburAll += row[len - 3] || 0;
		totalAlphaAll += row[len - 2] || 0;
		totalRekapAll += row[len - 1] || 0;
	});

	const sumRow = ["", "TOTAL", totalJTM, totalJadwalAll];
	for (let i = 0; i < validDates.length * 3; i++) {
		sumRow.push("");
	}
	sumRow.push(
		totalHadirAll, totalIzinAll, totalSakitAll, totalLiburAll, totalAlphaAll, totalRekapAll
	);

	const values = [
		[`REKAPITULASI ABSENSI GURU - BULAN ${targetSheetName.toUpperCase()} ${year}`],
		[],
		headers1,
		...dataRows,
		sumRow
	];

	const headers = await sheets.getHeaders();
	const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheets.sheetId}/values/${encodeURIComponent(targetSheetName + '!A1')}?valueInputOption=RAW`;
	
	const response = await fetch(updateUrl, {
		method: "PUT",
		headers,
		body: JSON.stringify({ values }),
	});

	if (!response.ok) {
		throw new Error(`Gagal menulis data rekap ke Google Sheets: ${await response.text()}`);
	}
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
			});
		}

		const corsHeaders = { "Access-Control-Allow-Origin": "*" };

		const handleRequest = async () => {
			
			// 1. ENDPOINT STATUS & LOGIN (No Auth)
			if (url.pathname === '/api/status' && request.method === 'GET') {
				const sheets = new GoogleSheetsHelper(env);
				let botReady = false;
				let autoRekapActive = true;
				let queue = { pending: 0, processing: 0, failed: 0 };

				// 1. Baca Setting sheet
				try {
					const data = await sheets.readData('Setting!A1:B20');
					if (data && data.length > 0) {
						const rowActive = data.find(r => String(r[0] || "").trim() === 'autoRekapActive');
						if (rowActive && String(rowActive[1]).toUpperCase() === 'FALSE') {
							autoRekapActive = false;
						}
						
						const rowLastSeen = data.find(r => String(r[0] || "").trim() === 'botLastSeen');
						if (rowLastSeen) {
							const lastSeenTime = new Date(rowLastSeen[1]).getTime();
							if (!isNaN(lastSeenTime) && Date.now() - lastSeenTime < 60000) {
								botReady = true;
							}
						}
					}
				} catch (e) {
					console.error("Error reading settings for status check:", e.message);
				}

				// 2. Baca Task Queue sheet
				try {
					const queueData = await sheets.readData('Task_Queue!A:F');
					if (queueData && queueData.length > 1) {
						const rows = queueData.slice(1);
						rows.forEach(r => {
							const status = String(r[3] || "").trim().toUpperCase();
							if (status === 'PENDING') queue.pending++;
							else if (status === 'PROCESSING') queue.processing++;
							else if (status === 'FAILED') queue.failed++;
						});
					}
				} catch (e) {
					console.error("Error reading task queue for status check:", e.message);
				}

				return createResponse({
					botReady,
					autoRekapActive,
					queue
				});
			}

			if (url.pathname === '/api/login' && request.method === 'POST') {
				try {
					const body = await request.json();
					const { phone, password } = body;
					if (!phone || !password) return createErrorResponse("Nomor WhatsApp dan Password wajib diisi", 422);

					const normalizedPhone = normalizePhoneNumber(phone);
					const sheets = new GoogleSheetsHelper(env);
					
					let data = [];
					try { data = await sheets.readData('Guru!A:Z'); }
					catch (e) { data = await sheets.readData('no_wa!A:Z'); }

					if (data.length === 0) return createErrorResponse("Koneksi database kosong", 500);

					const header = data[0].map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));
					const rows = data.slice(1);

					const idxName = header.indexOf('nama_guru') !== -1 ? header.indexOf('nama_guru') : header.indexOf('nama');
					const idxPhone = header.indexOf('no_wa') !== -1 ? header.indexOf('no_wa') : header.indexOf('nomor_wa');
					const idxHash = header.indexOf('password_hash');
					const idxRole = header.indexOf('role');

					if (idxPhone === -1) return createErrorResponse("Kolom nomor WhatsApp tidak ditemukan di sheet Guru/no_wa", 500);

					const userRow = rows.find(row => normalizePhoneNumber(row[idxPhone]) === normalizedPhone);
					if (!userRow) return createErrorResponse("Nomor WhatsApp tidak terdaftar", 401);

					const namaGuru = idxName !== -1 ? (userRow[idxName] || "Guru") : "Guru";
					const passwordHash = idxHash !== -1 ? (userRow[idxHash] || "") : "";
					const role = idxRole !== -1 ? (userRow[idxRole] || "USER") : "USER";

					if (!passwordHash) return createErrorResponse("Akun belum memiliki password terkonfigurasi. Silakan hubungi admin.", 401);

					const isValid = await verifyPassword(password, passwordHash);
					if (!isValid) return createErrorResponse("Password salah", 401);

					const payload = { phone: normalizedPhone, name: namaGuru, role };
					const token = await generateToken(payload, env.JWT_SECRET);
					return createResponse({ status: "success", message: "Login berhasil", data: { token, user: payload } });
				} catch (error) {
					console.error("[Login Error]", error.message);
					return createErrorResponse("Terjadi kesalahan sistem: " + error.message, 500);
				}
			}

			// ==========================================
			// PROTECTED ENDPOINTS
			// ==========================================
			let user;
			try {
				user = await authenticate(request, env);
			} catch (err) {
				return createErrorResponse("Sesi login berakhir atau tidak valid", 401);
			}

			const sheets = new GoogleSheetsHelper(env);

			// ================= BATCH 1 ==================
			if (url.pathname === '/api/jadwal' && request.method === 'GET') {
				try {
					const reqHari = url.searchParams.get('hari')?.toLowerCase();
					if (!reqHari) return createErrorResponse("Parameter hari wajib diisi", 400);

					const data = await sheets.readData('Jadwal!A:Z');
					if (data.length === 0) return createResponse({ meta: { day: reqHari, count: 0 }, data: [] });

					const header = data[0].map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));
					const rows = data.slice(1);

					const idxHari = header.indexOf('hari');
					const idxJam = header.indexOf('jam');
					const idxNama = header.indexOf('nama_guru');
					const idxKelas = header.indexOf('kelas');
					const idxMapel = header.indexOf('mapel');

					if (idxHari === -1) return createErrorResponse("Kolom 'hari' tidak ditemukan di sheet Jadwal", 500);

					const result = [];
					for (const r of rows) {
						if ((r[idxHari] || "").trim().toLowerCase() === reqHari) {
							result.push({
								hari: r[idxHari] || "",
								jam: r[idxJam] || "",
								nama_guru: r[idxNama] || "",
								kelas: r[idxKelas] || "",
								mapel: r[idxMapel] || ""
							});
						}
					}
					
					return createResponse({ meta: { day: reqHari, count: result.length }, data: result });
				} catch (error) {
					return createErrorResponse("Gagal mengambil jadwal: " + error.message, 500);
				}
			}

			if (url.pathname === '/api/kontak' && request.method === 'GET') {
				try {
					let data = [];
					try { data = await sheets.readData('Guru!A:Z'); }
					catch (e) { data = await sheets.readData('no_wa!A:Z'); }

					if (data.length === 0) return createResponse([]);

					const header = data[0].map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));
					const rows = data.slice(1);

					const idxName = header.indexOf('nama_guru') !== -1 ? header.indexOf('nama_guru') : header.indexOf('nama');
					const idxPhone = header.indexOf('no_wa') !== -1 ? header.indexOf('no_wa') : header.indexOf('nomor_wa');

					const result = rows.map(r => ({
						nama_guru: idxName !== -1 ? (r[idxName] || "") : "",
						nomor_wa: idxPhone !== -1 ? (r[idxPhone] || "") : ""
					}));
					return createResponse(result);
				} catch (error) {
					return createErrorResponse("Gagal mengambil kontak: " + error.message, 500);
				}
			}

			if (url.pathname === '/api/rekap' && request.method === 'GET') {
				try {
					const reqTanggal = url.searchParams.get('tanggal');
					const data = await sheets.readData('rekap!A:G');
					const rows = data.slice(1);

					let result = rows.map(r => ({
						tanggal: r[0], hari: r[1], jam: r[2], nama_guru: r[3], kelas: r[4], mapel: r[5], status: r[6]
					}));

					if (reqTanggal) {
						result = result.filter(r => r.tanggal === reqTanggal);
					}
					return createResponse({ meta: { count: result.length }, data: result });
				} catch (error) {
					return createErrorResponse("Gagal mengambil rekap: " + error.message, 500);
				}
			}

			// ================= BATCH 2 ==================
			
			// 1. POST /api/absen
			if (url.pathname === '/api/absen' && request.method === 'POST') {
				try {
					const body = await request.json();
					const { jam, tanggal, data: submitData } = body;
					if (!jam || !tanggal || !Array.isArray(submitData)) {
						return createErrorResponse("Payload tidak lengkap", 400);
					}
					const hari = getIndoDayName(tanggal);
					const valuesToAppend = submitData.map(item => [
						tanggal, hari, jam, item.nama_guru, item.kelas, item.mapel, item.status
					]);

					await sheets.appendData('rekap!A:G', valuesToAppend);
					return createResponse({ status: "success", message: `${valuesToAppend.length} data absensi disimpan` });
				} catch (error) {
					return createErrorResponse("Gagal menyimpan absen: " + error.message, 500);
				}
			}

			// 2. POST /api/koreksi
			if (url.pathname === '/api/koreksi' && request.method === 'POST') {
				try {
					const { nama_guru, jam, tanggal, status_baru } = await request.json();
					if (!nama_guru || !jam || !tanggal || !status_baru) {
						return createErrorResponse("Payload koreksi tidak lengkap", 400);
					}

					// Baca semua rekap untuk mencari baris
					const data = await sheets.readData('rekap!A:G');
					
					// Cari baris yang sesuai (1-based index)
					let rowIndex = -1;
					for (let i = 1; i < data.length; i++) {
						const r = data[i];
						if (r[0] === tanggal && String(r[2]).trim() === String(jam).trim() && (r[3] || "").trim().toLowerCase() === nama_guru.toLowerCase()) {
							rowIndex = i + 1; // Array = 0-based, Header = row 1, Data = i+1
							break;
						}
					}

					if (rowIndex === -1) {
						return createErrorResponse("Data absensi tidak ditemukan untuk dikoreksi", 404);
					}

					// Update baris kolom G (status)
					await sheets.updateData(`rekap!G${rowIndex}:G${rowIndex}`, [[status_baru]]);
					
					return createResponse({ status: "success", message: "Koreksi berhasil" });
				} catch (error) {
					return createErrorResponse("Gagal mengoreksi absen: " + error.message, 500);
				}
			}

			// 3. GET /api/rekap-bulanan
			if (url.pathname === '/api/rekap-bulanan' && request.method === 'GET') {
				try {
					const reqMonth = parseInt(url.searchParams.get('month') || (new Date().getMonth() + 1), 10);
					const reqYear = parseInt(url.searchParams.get('year') || new Date().getFullYear(), 10);

					const [jadwalData, rekapData] = await Promise.all([
						sheets.readData('Jadwal!A:E'),
						sheets.readData('rekap!A:G')
					]);

					const jRows = jadwalData.slice(1);
					const lRows = rekapData.slice(1);

					const jHeader = (jadwalData[0] || []).map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));
					const idxHari = jHeader.indexOf('hari');
					const idxNama = jHeader.indexOf('nama_guru') !== -1 ? jHeader.indexOf('nama_guru') : jHeader.indexOf('nama');

					if (idxHari === -1 || idxNama === -1) {
						return createErrorResponse("Kolom 'hari' atau 'nama_guru' tidak ditemukan di sheet Jadwal", 500);
					}

					// A. Hitung Beban Jadwal Guru per Hari
					const teacherDayLoad = {};
					jRows.forEach(row => {
						const hari = (row[idxHari] || "").trim().toLowerCase();
						const nama = (row[idxNama] || "").trim();
						if (!nama || hari === "hari") return;

						if (!teacherDayLoad[nama]) teacherDayLoad[nama] = {};
						if (!teacherDayLoad[nama][hari]) teacherDayLoad[nama][hari] = 0;
						teacherDayLoad[nama][hari]++;
					});

					// B. Init tableData
					const tableData = {};
					Object.keys(teacherDayLoad).forEach(nama => {
						tableData[nama] = {
							nama_guru: nama,
							hadir: 0, izin: 0, sakit: 0, libur: 0, alpha: 0,
							total_wajib: 0
						};
					});

					// C. Hitung Total Wajib (Jumat Libur)
					const dayCounts = getWeekdayCount(reqYear, reqMonth);
					Object.keys(teacherDayLoad).forEach(nama => {
						let total = 0;
						Object.keys(teacherDayLoad[nama]).forEach(hari => {
							const countDay = dayCounts[hari] || 0;
							total += (teacherDayLoad[nama][hari] * countDay);
						});
						if (tableData[nama]) tableData[nama].total_wajib = total;
					});

					const rHeader = (rekapData[0] || []).map(h => String(h || "").trim().toLowerCase().replace(/\s+/g, "_"));
					const idxTanggal = rHeader.indexOf('tanggal');
					const idxNamaRekap = rHeader.indexOf('nama_guru') !== -1 ? rHeader.indexOf('nama_guru') : rHeader.indexOf('nama');
					const idxStatus = rHeader.indexOf('status');

					if (idxTanggal === -1 || idxNamaRekap === -1 || idxStatus === -1) {
						return createErrorResponse("Kolom rekap tidak lengkap di sheet rekap", 500);
					}

					// D. Proses Rekap (Log Absensi)
					lRows.forEach(row => {
						const rawDate = row[idxTanggal];
						if (!rawDate || rawDate.toLowerCase() === 'tanggal') return;
						const d = new Date(rawDate);
						if (isNaN(d.getTime())) return;
						if (d.getFullYear() !== reqYear || (d.getMonth() + 1) !== reqMonth) return;

						const nama = String(row[idxNamaRekap]).trim();
						let status = String(row[idxStatus]).trim().toLowerCase();
						if (status === 'alpa') status = 'alpha';

						if (tableData[nama]) {
							if (['izin', 'sakit', 'libur', 'alpha'].includes(status)) {
								tableData[nama][status]++;
							}
						}
					});

					// E. Finalisasi Hadir
					Object.values(tableData).forEach(t => {
						const absen = t.izin + t.sakit + t.libur + t.alpha;
						t.hadir = Math.max(0, t.total_wajib - absen);
					});

					return createResponse({
						meta: { year: reqYear, month: reqMonth },
						data: Object.values(tableData)
					});
				} catch (error) {
					return createErrorResponse("Gagal mengambil rekap bulanan: " + error.message, 500);
				}
			}

			if (url.pathname === '/api/sync-bulanan' && request.method === 'POST') {
				try {
					const body = await request.json();
					const { monthName, year } = body;
					if (!monthName) return createErrorResponse("Bulan wajib diisi", 400);

					const sheetsHelper = new GoogleSheetsHelper(env);
					await syncBulananOnline(sheetsHelper, monthName, year || new Date().getFullYear().toString());

					return createResponse({ message: "Sinkronisasi rekap bulanan berhasil diperbarui secara langsung!" });
				} catch (error) {
					return createErrorResponse("Gagal sinkronisasi bulanan: " + error.message, 500);
				}
			}

			if (url.pathname === '/api/ekspor-bulanan' && request.method === 'POST') {
				try {
					const body = await request.json();
					const { format, monthName, year } = body;
					if (!format || !monthName || !year) {
						return createErrorResponse("Format, nama bulan, dan tahun wajib diisi", 400);
					}

					const taskId = Date.now().toString();
					const payload = JSON.stringify({ format, monthName, year, phone: user.phone });
					
					await sheets.appendData('Task_Queue!A:F', [
						[taskId, 'EKSPOR_BULANAN', payload, 'PENDING', new Date().toISOString(), '']
					]);

					return createResponse({ message: "Ekspor laporan telah dijadwalkan ke Task Queue" });
				} catch (error) {
					return createErrorResponse("Gagal memproses ekspor laporan: " + error.message, 500);
				}
			}

			if (url.pathname === '/api/save-rekap-sheet' && request.method === 'POST') {
				try {
					const body = await request.json();
					const { monthName, year, values } = body;
					if (!monthName || !values || !Array.isArray(values)) {
						return createErrorResponse("Nama bulan dan values wajib diisi", 400);
					}

					const cleanMonth = monthName.trim();
					const sheetsHelper = new GoogleSheetsHelper(env);
					const sheetList = await sheetsHelper.getSheetsList();
					let sheetExists = sheetList.some(s => s.properties.title.toLowerCase() === cleanMonth.toLowerCase());

					if (!sheetExists) {
						await sheetsHelper.createSheet(cleanMonth);
					}

					try {
						await sheetsHelper.clearData(`${cleanMonth}!A:ZZ`);
					} catch (clearErr) {
						console.warn("Gagal mengosongkan sheet:", clearErr.message);
					}

					// Tulis data values secara RAW (angka murni)
					const headers = await sheetsHelper.getHeaders();
					const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsHelper.sheetId}/values/${encodeURIComponent(cleanMonth + '!A1')}?valueInputOption=RAW`;
					
					const response = await fetch(updateUrl, {
						method: "PUT",
						headers,
						body: JSON.stringify({ values }),
					});

					if (!response.ok) {
						throw new Error(`Gagal menulis data rekap ke Google Sheets: ${await response.text()}`);
					}

					return createResponse({ message: "Berhasil menyimpan rekap bulanan ke Google Sheets!" });
				} catch (error) {
					return createErrorResponse("Gagal menyimpan rekap: " + error.message, 500);
				}
			}

			if (url.pathname === '/api/download-rekap' && request.method === 'GET') {
				try {
					const format = url.searchParams.get('format');
					const monthName = url.searchParams.get('monthName');
					const year = url.searchParams.get('year') || new Date().getFullYear().toString();

					if (!format || !monthName) {
						return createErrorResponse("Format dan nama bulan wajib diisi", 400);
					}

					const cleanMonth = monthName.trim();
					const sheetsHelper = new GoogleSheetsHelper(env);

					// 1. Pemicu sinkronisasi data online real-time ke Google Sheets
					// Menggunakan angka murni agar PDF tidak memuat rumus yang rawan error
					try {
						await syncBulananOnline(sheetsHelper, cleanMonth, year);
					} catch (syncErr) {
						console.warn("Gagal melakukan pra-sinkronisasi bulanan online:", syncErr.message);
					}

					// 2. Ambil sheet metadata
					const sheetList = await sheetsHelper.getSheetsList();
					const targetSheet = sheetList.find(s => s.properties.title.toLowerCase() === cleanMonth.toLowerCase());
					
					if (!targetSheet) {
						return createErrorResponse(`Sheet rekap untuk bulan ${cleanMonth} tidak ditemukan.`, 404);
					}

					const sheetId = targetSheet.properties.sheetId;
					const sheetsHeaders = await sheetsHelper.getHeaders();

					let exportUrl = "";
					let contentType = "";
					let filename = `Rekap_Absensi_${cleanMonth}_${year}`;

					if (format === "xlsx") {
						exportUrl = `https://docs.google.com/spreadsheets/d/${env.GOOGLE_SHEET_ID}/export?format=xlsx&gid=${sheetId}`;
						contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
						filename += ".xlsx";
					} else {
						exportUrl = `https://docs.google.com/spreadsheets/d/${env.GOOGLE_SHEET_ID}/export?format=pdf&gid=${sheetId}` +
							`&size=A4&portrait=true&fitw=true&gridlines=true`;
						contentType = "application/pdf";
						filename += ".pdf";
					}

					const response = await fetch(exportUrl, {
						method: "GET",
						headers: {
							Authorization: sheetsHeaders.Authorization
						}
					});

					if (!response.ok) {
						throw new Error(`Gagal mengunduh file dari Google Sheets API: ${await response.text()}`);
					}

					const fileBuffer = await response.arrayBuffer();

					return new Response(fileBuffer, {
						headers: {
							...corsHeaders,
							"Content-Type": contentType,
							"Content-Disposition": `attachment; filename="${filename}"`,
							"Access-Control-Expose-Headers": "Content-Disposition"
						}
					});
				} catch (error) {
					return createErrorResponse("Gagal mengunduh berkas laporan: " + error.message, 500);
				}
			}

			// 4. GET & POST /api/settings
			if (url.pathname === '/api/settings') {
				try {
					if (request.method === 'GET') {
						let autoRekapActive = true;
						try {
							const data = await sheets.readData('Setting!A1:B20');
							const row = data.find(r => String(r[0] || "").trim() === 'autoRekapActive');
							if (row && String(row[1]).toUpperCase() === 'FALSE') autoRekapActive = false;
						} catch (e) { /* ignore if sheet missing */ }
						return createResponse({ autoRekapActive });
					}
					else if (request.method === 'POST') {
						const body = await request.json();
						const key = 'autoRekapActive';
						const val = String(body.autoRekapActive).toUpperCase();
						try {
							let data = [];
							try {
								data = await sheets.readData('Setting!A1:B20');
							} catch (readErr) {
								try {
									await sheets.createSheet('Setting');
								} catch (createErr) {
									return createErrorResponse("Sheet 'Setting' tidak ditemukan dan gagal dibuat: " + createErr.message, 404);
								}
							}
							
							const rowIndex = data.findIndex(row => String(row[0] || "").trim() === key);
							if (rowIndex !== -1) {
								await sheets.updateData(`Setting!B${rowIndex + 1}`, [[val]]);
							} else {
								await sheets.appendData('Setting!A:B', [[key, val]]);
							}
						} catch (e) {
							return createErrorResponse("Gagal menyimpan setting: " + e.message, 500);
						}
						return createResponse({ autoRekapActive: body.autoRekapActive });
					}
				} catch (error) {
					return createErrorResponse("Gagal memproses settings: " + error.message, 500);
				}
			}

			// 8. Broadcast Endpoint
			if (url.pathname === '/api/broadcast' && request.method === 'POST') {
				try {
					const body = await request.json();
					const payload = JSON.stringify(body);
					const id = Date.now().toString();
					const ts = new Date().toISOString();
					await sheets.appendData('Task_Queue!A:F', [[
						id, 'SEND_WHATSAPP', payload, 'PENDING', ts, ''
					]]);
					return createResponse({ message: "Broadcast task queued" });
				} catch (error) {
					return createErrorResponse("Gagal menambahkan task broadcast: " + error.message, 500);
				}
			}

			// 9. Alarm Endpoint
			if (url.pathname === '/api/alarm' && request.method === 'POST') {
				try {
					const id = Date.now().toString();
					const ts = new Date().toISOString();
					await sheets.appendData('Task_Queue!A:F', [[
						id, 'ALARM', '{}', 'PENDING', ts, ''
					]]);
					return createResponse({ message: "Alarm task queued" });
				} catch (error) {
					return createErrorResponse("Gagal menambahkan task alarm: " + error.message, 500);
				}
			}

			// Endpoint Tidak Ditemukan
			return createErrorResponse("Endpoint tidak ditemukan", 404);
		};

		const response = await handleRequest();
		const newHeaders = new Headers(response.headers);
		for (const [key, value] of Object.entries(corsHeaders)) {
			newHeaders.set(key, value);
		}
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: newHeaders
		});
	},
};

import { SignJWT } from "jose";

async function e2e() {
  const secret = new TextEncoder().encode("absen-secret-key-super-safe-2026");
  const token = await new SignJWT({ phone: "6285123456789", name: "Guru Test", role: "USER" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secret);
    
  const expiredToken = await new SignJWT({ phone: "6285123456789", name: "Guru Test", role: "USER" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("-1h")
    .sign(secret);

  const req = async (url, method = "GET", body = null, t = token) => {
    const opts = { method, headers: {} };
    if (t) opts.headers["Authorization"] = `Bearer ${t}`;
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`http://localhost:8787${url}`, opts);
    const txt = await res.text();
    return { status: res.status, body: txt };
  };

  const tests = [];
  const runTest = async (name, testFn) => {
    try {
      const result = await testFn();
      tests.push({ name, pass: true, msg: result });
    } catch (e) {
      tests.push({ name, pass: false, msg: e.message });
    }
  };

  // 1. Authentication
  await runTest("Login Tanpa Payload (422)", async () => {
    const res = await req("/api/login", "POST", {}, null);
    if (res.status !== 422) throw new Error(`Expected 422, got ${res.status}`);
    return "Lulus";
  });
  
  await runTest("Login Nomor Salah (401)", async () => {
    const res = await req("/api/login", "POST", { phone: "000", password: "123" }, null);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return "Lulus";
  });

  await runTest("JWT Expired (401)", async () => {
    const res = await req("/api/jadwal?hari=senin", "GET", null, expiredToken);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    return "Lulus";
  });

  // 2. Jadwal
  await runTest("Ambil Jadwal (200)", async () => {
    const res = await req("/api/jadwal?hari=senin");
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    return "Lulus";
  });

  await runTest("Jadwal Tanpa Parameter (400)", async () => {
    const res = await req("/api/jadwal");
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    return "Lulus";
  });

  // 3. Absensi
  await runTest("Absen Kosong (400)", async () => {
    const res = await req("/api/absen", "POST", {});
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    return "Lulus";
  });

  await runTest("Absen Valid (200)", async () => {
    const res = await req("/api/absen", "POST", {
      jam: "1", tanggal: "2026-06-28", data: [{ nama_guru: "Test", kelas: "10A", mapel: "X", status: "HADIR" }]
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    return "Lulus";
  });

  // 4. Koreksi
  await runTest("Koreksi Valid (200/404)", async () => {
    const res = await req("/api/koreksi", "POST", {
      nama_guru: "Tidak Ada", jam: "1", tanggal: "2099-01-01", status_baru: "IZIN"
    });
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    return "Lulus 404 (Data Tidak Ditemukan)";
  });

  // 5. Rekap
  await runTest("Rekap Bulanan (200)", async () => {
    const res = await req("/api/rekap-bulanan?month=6&year=2026");
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    return "Lulus";
  });

  // 6. Settings
  await runTest("Settings GET (200)", async () => {
    const res = await req("/api/settings");
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    return "Lulus";
  });
  
  await runTest("Settings POST (200)", async () => {
    const res = await req("/api/settings", "POST", { autoRekapActive: true });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    return "Lulus";
  });

  // Output
  console.log("=== LAPORAN E2E BACKEND ===");
  tests.forEach(t => {
    console.log(`[${t.pass ? 'PASS' : 'FAIL'}] ${t.name}: ${t.msg}`);
  });
}

e2e();

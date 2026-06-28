import { SignJWT } from "jose";

async function test() {
  const secret = new TextEncoder().encode("absen-secret-key-super-safe-2026");
  const token = await new SignJWT({ phone: "6285123456789", name: "Guru Test", role: "USER" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secret);

  const fetchApi = async (url, method, body, customToken = token) => {
    const res = await fetch(`http://localhost:8787${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(customToken ? { Authorization: `Bearer ${customToken}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const txt = await res.text();
    console.log(`\n[${method}] ${url} -> ${res.status}`);
    console.log(txt.substring(0, 200));
  };

  console.log("=== 1. Test invalid JWT ===");
  await fetchApi("/api/rekap-bulanan", "GET", null, "invalid.token.here");

  console.log("=== 2. GET /api/rekap-bulanan ===");
  await fetchApi("/api/rekap-bulanan", "GET");

  console.log("=== 3. GET /api/settings ===");
  await fetchApi("/api/settings", "GET");

  console.log("=== 4. POST /api/absen (Invalid Payload) ===");
  await fetchApi("/api/absen", "POST", { jam: "1" }); // missing tanggal and data

  console.log("=== 5. POST /api/absen (Valid) ===");
  await fetchApi("/api/absen", "POST", {
    jam: "1",
    tanggal: "2026-06-28",
    data: [{ nama_guru: "Guru Test", kelas: "10A", mapel: "Matematika", status: "HADIR" }]
  });

  console.log("=== 6. POST /api/koreksi (Data tidak ditemukan) ===");
  await fetchApi("/api/koreksi", "POST", {
    nama_guru: "Guru Hantu", jam: "9", tanggal: "2099-01-01", status_baru: "IZIN"
  });

  console.log("=== 7. POST /api/koreksi (Valid) ===");
  await fetchApi("/api/koreksi", "POST", {
    nama_guru: "Guru Test", jam: "1", tanggal: "2026-06-28", status_baru: "IZIN"
  });
}
test();

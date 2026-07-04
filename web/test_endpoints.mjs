import { SignJWT } from "jose";

async function test() {
  const secret = new TextEncoder().encode("absen-secret-key-super-safe-2026");
  const token = await new SignJWT({ phone: "6285123456789", name: "Guru Test", role: "USER" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secret);

  console.log("Token:", token);

  const fetchWithToken = async (url) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.text();
    console.log(`\nGET ${url} -> ${res.status}`);
    console.log(body.substring(0, 300)); 
  };

  await fetchWithToken("http://localhost:8787/api/jadwal?hari=senin");
  await fetchWithToken("http://localhost:8787/api/kontak");
  await fetchWithToken("http://localhost:8787/api/rekap?tanggal=2026-06-28");
}
test();

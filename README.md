# Payo Billiard

> **Find Your Table. Find Your Rival. Own Your Game.**

Platform digital billiard Indonesia: temukan venue, booking meja, cari lawan sparring, ikuti turnamen, dan lihat ranking pemain.

Status: **Phase 1 selesai** (setup, design system, homepage, navigasi responsif, autentikasi, koneksi Supabase, skema database lengkap + RLS).

---

## Tech stack

| Lapisan | Teknologi |
| --- | --- |
| Frontend | Next.js 16 (App Router, Cache Components, Turbopack), TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), Lucide, Framer Motion |
| Backend | Supabase Postgres, Auth, Storage, RLS (Realtime disiapkan untuk sparring/notifikasi) |
| Validasi | Zod (server actions) + constraint & trigger di database |
| Deploy | Vercel + Supabase Cloud |

## Struktur folder

```
src/
  app/
    (site)/            # halaman publik dengan header + footer
      page.tsx         # homepage
      venues/          # peta tempat billiard (OpenStreetMap)
      sparring/        # daftar tantangan + new/ (buka tantangan dengan lokasi dari peta)
      tournaments/ leaderboard/
    (auth)/            # login, register, forgot/reset password, verify-email
    api/places/        # proxy OSM: search, nearby, reverse
    auth/callback/     # route handler untuk link email Supabase (PKCE & token_hash)
    dashboard/         # dashboard pemain (terproteksi)
    admin/             # khusus admin
    sitemap.ts robots.ts opengraph-image.tsx icon.svg error.tsx not-found.tsx
  components/
    ui/                # primitif shadcn/ui
    layout/ brand/ home/ shared/ auth/ dashboard/ forms/ motion/
  config/site.ts       # nama brand, navigasi, daftar route terproteksi
  lib/
    supabase/          # client browser, server (cookie), public (cacheable), proxy
    auth/              # dal.ts (Data Access Layer) + actions.ts (server actions)
    data/public.ts     # query publik ter-cache ("use cache" + cacheTag)
    validation/        # skema Zod
    rate-limit.ts env.ts labels.ts
  proxy.ts             # (pengganti middleware di Next 16) refresh sesi + guard route
supabase/
  migrations/          # 10 migration SQL berurutan
  setup.sql            # gabungan semua migration (project baru, sekali jalan)
  seed.sql             # khusus lokal/testing — tanpa data palsu
```

## Design system

Tema gelap bergaya cetak olahraga / papan skor: judul condensed huruf besar, label mono bernomor, garis pemisah tipis, sudut kecil, tanpa glow/gradien. Warna diambil dari kain meja turnamen biru, aksen kuningan trofi, dan putih gading bola.

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `--background` | `#0A0B0B` | latar utama |
| `--surface` / `--surface-2` | `#121414` / `#1A1D1D` | kartu, panel, input |
| `--primary` | `#3A7FD5` | aksi utama, link |
| `--cloth` | `#1D4F8C` | blok warna (CTA, panel login), ilustrasi meja |
| `--brass` | `#D9A441` | aksen premium, turnamen, rank #1 |
| `--foreground` | `#EFEBE2` | teks (ivory) |
| `--muted-foreground` | `#8F918C` | teks sekunder |
| `--success` / `--destructive` | `#22C07F` / `#FF5D5D` | status |

Tipografi: **Barlow Condensed** untuk judul, **Geist Mono** untuk label, **Geist** untuk teks. Semua token ada di `src/app/globals.css`.

## Environment variables

Salin `.env.example` → `.env.local`:

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon / publishable key (aman di browser, dilindungi RLS). `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` juga diterima |
| `NEXT_PUBLIC_SITE_URL` | ✅ (prod) | URL publik situs, mis. `https://payobilliard.id`. Dipakai untuk link email auth, sitemap, OG |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ❌ | aktifkan Google Maps + Places (lihat bagian Google Maps) |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | ❌ | Map ID Google (default `DEMO_MAP_ID`) |
| `NEXT_PUBLIC_MAP_TILE_URL` | ❌ | template URL tile peta untuk produksi (default: tile OpenStreetMap) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | belum dipakai. Jika nanti dibutuhkan, **hanya** di server, jangan pernah diberi prefix `NEXT_PUBLIC_` |

Tanpa env Supabase, situs tetap bisa dibuild & dibuka: semua section menampilkan empty state, dan form auth memberi pesan “Supabase belum dikonfigurasi”.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya
npm run dev                  # http://localhost:3000
```

Perintah lain: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`.

## Setup Supabase

1. Buat project di [supabase.com](https://supabase.com) (region Singapore direkomendasikan).
2. Jalankan migration (0001 → 0010) — pilih salah satu:
   - **CLI**: `npx supabase link --project-ref <ref>` lalu `npx supabase db push`
   - **SQL Editor**: jalankan isi file di `supabase/migrations/` **berurutan**.
3. **Authentication → URL Configuration**
   - Site URL: `NEXT_PUBLIC_SITE_URL` Anda
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://<domain>/auth/callback`
4. **Authentication → Providers → Email**: aktifkan *Confirm email* (verifikasi email).
5. **Login Google & Apple (iCloud)** — lihat bagian *Login Google / Apple* di bawah.
6. Buat admin pertama: daftar lewat `/register`, lalu di SQL Editor:
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'email-anda@domain.com'
   on conflict do nothing;
   ```
7. (Opsional) generate tipe: `npx supabase gen types typescript --linked > src/types/database.ts`.

## Database

20 tabel (migration 0001–0010): `profiles, user_roles, venues, venue_photos, venue_facilities, billiard_tables, table_pricing, operating_hours, bookings, sparring_posts, sparring_requests, matches, match_results, player_ratings, tournaments, tournament_participants, tournament_matches, reviews, notifications, reports` + view `venue_cards`, `tournament_cards`, `leaderboard` + RPC `nearby_venues`, `table_busy_slots`, `get_my_profile`, `claim_venue_owner_role`.

Keamanan di level database:

- **RLS aktif di semua tabel**; tulis data hanya oleh pemilik (`auth.uid()`), admin, atau backend tepercaya.
- **Anti double-booking**: exclusion constraint GiST `(table_id, tstzrange)` untuk booking `pending`/`confirmed`.
- **Anti manipulasi harga**: `price_per_hour` & `total_price` selalu dihitung trigger dari `table_pricing` (aturan paling spesifik menang: meja+hari > meja > hari > default venue).
- **Kepemilikan venue**: owner tidak bisa memverifikasi venue sendiri, memindah kepemilikan, atau mengubah rating.
- **Role**: `admin` tidak bisa didaftarkan sendiri (trigger sign-up hanya mengizinkan `player` / `venue_owner`).
- **Privasi**: nomor HP tidak terbaca publik (column-level grant); pemilik membaca lewat RPC `get_my_profile`.
- Customer hanya bisa membatalkan booking; konfirmasi hanya oleh pemilik venue.

Migration sudah diuji pada Postgres (PGlite) dengan skenario: sign-up, role, RLS venue, perhitungan harga, bentrok booking, review → agregat rating, sparring request + notifikasi.

## Tempat billiard dari peta (tanpa pendaftaran venue)

Venue **tidak didaftarkan** oleh pemilik. Tempat billiard diambil dari **OpenStreetMap**:

- `/venues` dan homepage menampilkan peta (Leaflet) + daftar tempat billiard di sekitar titik peta. Bisa cari nama tempat/kota, pakai lokasi saya, atau "Cari billiard di area ini".
- Saat **membuka tantangan** (`/sparring/new`), pemain memilih lokasi dari peta, mencari nama tempat, atau klik peta untuk menandai titik sendiri. Nama, alamat, kota, koordinat, dan referensi OSM disimpan di `sparring_posts`.
- Dari peta, tombol **"Buka tantangan di sini"** langsung mengisi lokasi di form tantangan.
- Semua lookup lewat `GET /api/places` (server): Nominatim untuk pencarian & alamat, Overpass untuk tempat billiard terdekat (dengan mirror dan fallback ke Nominatim). Hasil di-cache 10 menit, request dibatasi per IP, dan User-Agent aplikasi dikirim sesuai kebijakan OSM.
- Tile peta default: server tile publik OpenStreetMap (cocok untuk development). Untuk trafik produksi set `NEXT_PUBLIC_MAP_TILE_URL` ke penyedia tile (MapTiler, Stadia, dll.).
- Kelengkapan data tergantung OpenStreetMap; tempat yang belum terdata tetap bisa dipilih dengan menandai titik di peta.

Tabel venue, meja, harga, dan booking tetap ada di database (beserta RLS-nya) tetapi tidak dipakai di UI saat ini.

### Google Maps (opsional, data lebih lengkap)

Data OpenStreetMap di Indonesia belum lengkap. Isi `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` untuk beralih otomatis ke **Google Maps**: peta, pencarian tempat (Places API New), dan alamat (Geocoding). Tanpa key, aplikasi tetap memakai OpenStreetMap.

1. Google Cloud Console → buat project → aktifkan **Billing** (Google memberi kredit bulanan gratis).
2. Aktifkan **Maps JavaScript API**, **Places API (New)**, dan **Geocoding API**.
3. *Credentials → Create API key*. Batasi: *Application restrictions* = HTTP referrers (`http://localhost:3000/*`, `https://<domain>/*`); *API restrictions* = tiga API di atas.
4. (Produksi) *Map Management → Create Map ID* (JavaScript, vector) lalu isi `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`. Untuk development cukup `DEMO_MAP_ID`.
5. Isi di `.env.local` / Vercel, lalu build ulang.

Sesuai ketentuan Google, hasil Places selalu ditampilkan di peta Google (bukan Leaflet).

## Alur sparring

1. Pemain membuka tantangan (lokasi dari peta, jadwal, level, game, format).
2. Pembuat bisa **edit** atau **hapus** tantangannya selama belum ada lawan yang diterima.
3. Pemain lain mengirim tantangan (opsional dengan pesan); pembuat **menerima satu** — sisanya otomatis ditolak, pertandingan dibuat.
4. Setelah jadwal mulai, salah satu pemain **mengajukan skor**. Lawan harus **menerima** (hasil final, rating Elo diperbarui) atau **menolak** (bisa diajukan ulang).
5. Semua transisi dijalankan RPC `respond_sparring_request`, `report_match_result`, `respond_match_result` yang memeriksa pemanggil di database. Format 2 vs 2 dicatat antar kapten dan tidak memengaruhi rating.

Halaman: `/sparring/[id]` (detail + aksi), `/sparring/[id]/edit`, `/dashboard/sparring` (tantangan, permintaan, pertandingan yang perlu tindakan).

## Login Google / Apple

Tombol **Masuk/Daftar dengan Google** dan **dengan Apple** ada di `/login` dan `/register`. Apple memakai Apple ID — akun yang sama dengan iCloud. Alurnya OAuth PKCE di server (`oauthSignInAction`) → provider → `/auth/callback`. Profil dibuat otomatis (nama & foto dari provider, username dari email).

Tombol hanya berfungsi setelah provider diaktifkan di Supabase. Sebelum itu, pengguna diarahkan kembali ke `/login` dengan pesan error.

**Google** (Supabase → Authentication → Providers → Google):
1. Google Cloud Console → APIs & Services → Credentials → *Create OAuth client ID* (Web application).
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Salin Client ID & Client Secret ke Supabase, aktifkan provider.

**Apple** (Supabase → Authentication → Providers → Apple) — butuh Apple Developer Program:
1. Buat *App ID* dengan kapabilitas *Sign in with Apple*, lalu *Services ID* (dipakai sebagai Client ID).
2. Di Services ID, daftarkan domain `<project-ref>.supabase.co` dan Return URL `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Buat *Key* untuk Sign in with Apple, lalu buat client secret (JWT) dari Team ID, Key ID, dan file `.p8` — ikuti panduan Supabase "Login with Apple". Secret ini kedaluwarsa tiap ≤ 6 bulan dan harus diperbarui.
4. Isi Services ID & secret di Supabase, aktifkan provider.

Pastikan juga URL situs (`/auth/callback`) ada di *Redirect URLs* Supabase.

## Autentikasi

- Register via email, Google, atau Apple; login, logout, lupa password, reset password, verifikasi email + kirim ulang.
- `src/proxy.ts` me-refresh sesi dan me-redirect route terproteksi ke `/login?next=…` (redirect `next` divalidasi agar tidak menjadi open redirect).
- Otorisasi sebenarnya dicek ulang di server (`requireUser` / `requireRole` di `lib/auth/dal.ts`) dan oleh RLS.
- Rate limit pada login, register, reset password, dan kirim ulang verifikasi (in-memory per instance; ganti ke Redis/Upstash untuk multi-instance).

## Deployment (Vercel)

1. Push repo ke GitHub, lalu *Import Project* di Vercel.
2. Isi environment variables di atas (Production & Preview).
3. Tambahkan domain produksi ke Supabase *Redirect URLs*.
4. Deploy. Build command default `next build`.

## Roadmap

- [x] **Phase 1** — setup, design system, homepage, navigasi, auth, Supabase, skema DB
- [x] Peta tempat billiard (OpenStreetMap) + buka tantangan dengan lokasi dari peta
- [x] Kirim/terima/tolak tantangan, edit/hapus, ajukan & konfirmasi hasil, rating Elo
- [ ] Filter sparring (kota, jarak, level, game, tanggal), profil publik pemain, notifikasi di UI
- [ ] ~~Pendaftaran venue, manajemen meja, booking~~ — ditunda (venue diambil dari peta)
- [ ] **Phase 5** — turnamen, bracket, leaderboard per kota/provinsi/jenis game
- [ ] **Phase 6** — admin dashboard lengkap, audit keamanan, performa, SEO lanjutan
- [ ] Integrasi payment gateway (kolom `payment_status` / `payment_ref` sudah disiapkan; belum ada integrasi)

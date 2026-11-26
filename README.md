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

## Alur sparring

1. Pemain membuka tantangan (lokasi dari peta, jadwal, level, game, format).
2. Pembuat bisa **edit** atau **hapus** tantangannya selama belum ada lawan yang diterima.
3. Pemain lain mengirim tantangan (opsional dengan pesan); pembuat **menerima satu** — sisanya otomatis ditolak, pertandingan dibuat.
4. Setelah jadwal mulai, salah satu pemain **mengajukan skor**. Lawan harus **menerima** (hasil final, rating Elo diperbarui) atau **menolak** (bisa diajukan ulang).
5. Semua transisi dijalankan RPC `respond_sparring_request`, `report_match_result`, `respond_match_result` yang memeriksa pemanggil di database. Format 2 vs 2 dicatat antar kapten dan tidak memengaruhi rating.

Halaman: `/sparring/[id]` (detail + aksi), `/sparring/[id]/edit`, `/dashboard/sparring` (tantangan, permintaan, pertandingan yang perlu tindakan).

# Supabase Storage model

Buckets and path conventions for invoices, receipts, and progress photos. Bucket + RLS policies are created in `supabase/migrations/20250407130011_storage.sql`.

---

## Buckets

| Bucket id | Public? | Suggested size / MIME guard (migration) | Purpose |
|-----------|---------|----------------------------------------|---------|
| `invoices` | **private** | PDF/images, 50 MB cap in migration | Invoice PDFs or scans |
| `receipts` | **private** | PDF/images, 50 MB cap | Receipt scans linked to payments |
| `progress-photos` | **private** | Images, 20 MB cap | Before/after client photos |

**v1:** Exercise library has **no** media bucket (metadata only).

---

## Path conventions

All paths use UUIDs from Postgres for stable RLS checks (`split_part(name, '/', 1)` = owning `client_id`).

| Bucket | Pattern | Example |
|--------|---------|---------|
| `invoices` | `{client_id}/{invoice_id}/{filename}` | `a1b2…/inv-uuid/invoice-april.pdf` |
| `receipts` | `{client_id}/{receipt_id_or_payment_id}/{filename}` | `a1b2…/pay-uuid/receipt.jpg` |
| `progress-photos` | `{client_id}/{photo_row_id}.{ext}` | `a1b2…/progress-uuid.jpg` |

**Rules**

- **Segment 1** must always be the **client’s** `profiles.id` (even for staff uploads on behalf of the client).  
- Do **not** put client A’s files under client B’s prefix.  
- After upload, persist `storage_bucket` + `storage_path` on `financial_documents`, `receipts`, or `progress_photos` so the API can generate signed URLs consistently.

---

## Who can upload / read / delete

### `invoices`

| Role | Read | Write (upload/replace/delete) |
|------|------|-------------------------------|
| Manager | ✓ all objects | ✓ all |
| Client | ✓ objects under **own** `{client_id}/` prefix | — |
| Trainer | — | — |

### `receipts`

Same pattern as `invoices`: **managers** full access; **clients** read-only under their prefix; **trainers** no access (billing privacy).

### `progress-photos`

| Role | Read | Write |
|------|------|--------|
| Manager | ✓ all | ✓ all |
| Trainer | ✓ under prefixes where `trainer_has_client_access(first_segment_uuid)` | ✓ same (upload/replace/delete for coaching) |
| Client | ✓ under **own** prefix | ✓ under **own** prefix (self-service uploads) |

**Privacy:** Client uploads intended for coach eyes only should set `progress_photos.visibility_client = false` in the database **and** restrict read paths in app (RLS on table + consider separate bucket prefix `private/` in a future revision). Current Storage policy for trainers uses access function, not the visibility flag — **treat visibility as an app-layer filter** for client UI until you add stricter Storage rules.

---

## Signed URLs

- Use **short-lived signed URLs** for browser display.  
- Never expose **service role** key in Next.js client bundles.  
- Server components / route handlers: create signed URL with service role or user JWT as appropriate.

---

## Metadata tables (Postgres)

Link Storage objects to domain rows for reporting:

- `financial_documents` → invoice PDFs  
- `receipts` → receipt files + optional `payment_record_id`  
- `progress_photos` → before/after rows + caption / date  

Deleting a row should optionally trigger Storage object deletion (implement in app or Edge Function).

---

## Open follow-ups

1. Virus scanning / content moderation for uploads.  
2. Separate bucket or prefix for **trainer-only** progress photos.  
3. Lifecycle rules (auto-archive old invoice PDFs).

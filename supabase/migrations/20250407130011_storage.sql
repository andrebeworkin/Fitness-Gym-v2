-- Storage buckets + object policies (path conventions documented in docs/STORAGE_MODEL.md)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('invoices', 'invoices', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png']::text[]),
  ('receipts', 'receipts', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png']::text[]),
  ('progress-photos', 'progress-photos', false, 20971520, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: {client_id}/{...}
create policy storage_invoices_manager_all
  on storage.objects for all
  to authenticated
  using (bucket_id = 'invoices' and public.is_manager())
  with check (bucket_id = 'invoices' and public.is_manager());

create policy storage_invoices_client_read
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'invoices'
    and public.is_client()
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy storage_receipts_manager_all
  on storage.objects for all
  to authenticated
  using (bucket_id = 'receipts' and public.is_manager())
  with check (bucket_id = 'receipts' and public.is_manager());

create policy storage_receipts_client_read
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_client()
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy storage_progress_manager_all
  on storage.objects for all
  to authenticated
  using (bucket_id = 'progress-photos' and public.is_manager())
  with check (bucket_id = 'progress-photos' and public.is_manager());

create policy storage_progress_trainer_rw
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and public.is_trainer()
    and public.trainer_has_client_access(split_part(name, '/', 1)::uuid)
  )
  with check (
    bucket_id = 'progress-photos'
    and public.is_trainer()
    and public.trainer_has_client_access(split_part(name, '/', 1)::uuid)
  );

create policy storage_progress_client_rw
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and public.is_client()
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'progress-photos'
    and public.is_client()
    and split_part(name, '/', 1) = auth.uid()::text
  );

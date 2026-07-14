-- =====================================================================
-- Private storage bucket for CV files.
-- Files are stored under '<user_id>/...', and policies ensure a user
-- can only read/write files inside their own folder.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

create policy "cv_files_owner_all"
on storage.objects for all to authenticated
using (
  bucket_id = 'cvs'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'cvs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Migration: Add image_url to messages table
-- Run this in Supabase SQL Editor

alter table messages add column if not exists image_url text;

-- Create storage bucket for message photos (if it doesn't exist)
insert into storage.buckets (id, name, public)
values ('message-photos', 'message-photos', false)
on conflict (id) do nothing;

-- RLS policy: clients can upload to their own folder
create policy "message-photos: client upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'message-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: clients can read their own photos
create policy "message-photos: client read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'message-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: coaches can read photos for their clients
create policy "message-photos: coach read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'message-photos'
  and exists (
    select 1 from clients
    where clients.auth_user_id::text = (storage.foldername(name))[1]
      and clients.coach_id = auth.uid()
  )
);

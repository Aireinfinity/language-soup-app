create or replace function admin_get_users_with_notifications()
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  created_at timestamptz,
  learning_languages text[],
  fluent_languages text[],
  group_count bigint,
  has_notifications boolean
)
language plpgsql
security definer
as $$
begin
  -- Optional: Add admin check here if auth.uid() is reliable, 
  -- but dashboard currently uses anonymous auth + app-level checks.
  -- We rely on the app to only call this from the admin dashboard.
  
  return query
  select 
    u.id,
    u.display_name,
    u.avatar_url,
    u.created_at,
    u.learning_languages,
    u.fluent_languages,
    (select count(*) from app_group_members m where m.user_id = u.id) as group_count,
    exists (
      select 1 from app_push_tokens t where t.user_id = u.id
    ) as has_notifications
  from app_users u
  order by u.created_at desc;
end;
$$;

-- Create a table to store general feature feedback
create table if not exists app_feature_feedback (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  feature_name text not null, -- e.g. 'voice_correct_me'
  rating int, -- 1-5 scale (optional)
  feedback_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table app_feature_feedback enable row level security;

create policy "Users can insert their own feedback"
  on app_feature_feedback for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all feedback"
  on app_feature_feedback for select
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
      and is_admin = true -- Assuming is_admin flag exists, adjust if needed
    )
  );

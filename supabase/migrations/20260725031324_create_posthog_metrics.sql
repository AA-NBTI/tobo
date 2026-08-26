create table public.posthog_metrics (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  avg_session_duration_seconds numeric default 0,
  retention_rate_d7 numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (though mostly read by server)
alter table public.posthog_metrics enable row level security;

create policy "Allow read access to anyone" on public.posthog_metrics
  for select using (true);

GRANT ALL ON TABLE public.posthog_metrics TO anon, authenticated, service_role;

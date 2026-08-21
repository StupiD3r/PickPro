create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  name text not null,
  contact text not null,
  booking_date date not null,
  start_hour int not null check (start_hour between 0 and 23),
  duration_hours int not null default 1 check (duration_hours between 1 and 8),
  courts int not null default 1 check (courts between 1 and 3),
  status text not null default 'Pending' check (status in ('Pending', 'Confirmed', 'Archived')),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bookings_date_idx on public.bookings (booking_date);

alter table public.bookings enable row level security;

alter table public.bookings add column if not exists deleted_at timestamptz;

create or replace function public.create_booking(
  p_name text,
  p_contact text,
  p_date date,
  p_start_hour int,
  p_duration int,
  p_courts int
)
returns public.bookings
language plpgsql
as $$
declare
  v_max_courts constant int := 3;
  v_hour int;
  v_occupied int;
  v_reference text;
  v_booking public.bookings;
begin
  if p_duration < 1 or p_duration > 8 then
    raise exception 'INVALID_DURATION';
  end if;

  if p_courts < 1 or p_courts > v_max_courts then
    raise exception 'INVALID_COURTS';
  end if;

  lock table public.bookings in exclusive mode;

  for i in 0..(p_duration - 1) loop
    v_hour := (p_start_hour + i) % 24;

    select coalesce(sum(b.courts), 0)
      into v_occupied
    from public.bookings b
    where b.booking_date = p_date
      and b.status <> 'Archived'
      and b.deleted_at is null
      and exists (
        select 1
        from generate_series(0, b.duration_hours - 1) g
        where (b.start_hour + g) % 24 = v_hour
      );

    if v_occupied + p_courts > v_max_courts then
      raise exception 'COURT_CAPACITY';
    end if;
  end loop;

  for attempt in 1..50 loop
    v_reference := 'PB-'
      || to_char(now() at time zone 'utc', 'YYMMDD')
      || '-'
      || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');

    exit when not exists (
      select 1 from public.bookings where reference = v_reference
    );
  end loop;

  if v_reference is null then
    raise exception 'REFERENCE_GENERATION_FAILED';
  end if;

  insert into public.bookings (
    reference, name, contact, booking_date, start_hour, duration_hours, courts
  ) values (
    v_reference, p_name, p_contact, p_date, p_start_hour, p_duration, p_courts
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

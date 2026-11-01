alter table public.profiles
  add column if not exists friend_tag text;

create unique index if not exists profiles_friend_tag_unique
  on public.profiles (friend_tag)
  where friend_tag is not null;

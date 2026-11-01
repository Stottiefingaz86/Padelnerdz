-- Tournament by wins mix-in format (group RR on games won + knockout).
alter type public.session_format add value if not exists 'tournament_by_wins';

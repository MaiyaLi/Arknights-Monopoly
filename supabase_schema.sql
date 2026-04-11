-- ARKNIGHTS MONOPOLY: SUPABASE TACTICAL DATA SCHEMA

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_id TEXT DEFAULT 'amiya',
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    matches INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Lobbies Table
CREATE TABLE IF NOT EXISTS public.lobbies (
    room_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'LOBBY',
    host_id TEXT NOT NULL,
    host_name TEXT,
    host_email TEXT,
    players JSONB DEFAULT '[]'::jsonb,
    game_state JSONB DEFAULT NULL,
    selected_operators TEXT[] DEFAULT '{}'::text[],
    chat_messages JSONB DEFAULT '[]'::jsonb,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Matchmaking Queue
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
    socket_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    avatar_id TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ENABLE REALTIME FOR LOBBIES AND QUEUE
ALTER PUBLICATION supabase_realtime ADD TABLE lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- RLS (Row Level Security) - Simplified for Tactical deployment (Enable as needed)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All Access" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow All Access" ON public.lobbies FOR ALL USING (true);
CREATE POLICY "Allow All Access" ON public.matchmaking_queue FOR ALL USING (true);

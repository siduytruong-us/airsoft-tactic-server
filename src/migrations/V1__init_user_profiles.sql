CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id     UUID PRIMARY KEY,
    display_name VARCHAR(100),
    avatar_url   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

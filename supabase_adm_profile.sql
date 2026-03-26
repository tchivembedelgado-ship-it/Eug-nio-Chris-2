-- 1. Create adm_settings table
CREATE TABLE IF NOT EXISTS public.adm_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_exibicao TEXT,
    biografia TEXT,
    avatar_url TEXT,
    capa_url TEXT,
    whatsapp_link TEXT,
    instagram_link TEXT,
    facebook_link TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create adm_posts table
CREATE TABLE IF NOT EXISTS public.adm_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conteudo TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create post_comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.adm_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    comentario TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS
ALTER TABLE public.adm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adm_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- 5. Policies for adm_settings
-- Check if policies exist before creating to avoid errors
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Settings') THEN
        CREATE POLICY "Public Read Settings" ON public.adm_settings FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Manage Settings') THEN
        CREATE POLICY "Admin Manage Settings" ON public.adm_settings FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
        );
    END IF;
END $$;

-- 6. Policies for adm_posts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Posts') THEN
        CREATE POLICY "Public Read Posts" ON public.adm_posts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Manage Posts') THEN
        CREATE POLICY "Admin Manage Posts" ON public.adm_posts FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
        );
    END IF;
END $$;

-- 7. Policies for post_comments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Comments') THEN
        CREATE POLICY "Public Read Comments" ON public.post_comments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Users Comment') THEN
        CREATE POLICY "Authenticated Users Comment" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users Delete Own Comments') THEN
        CREATE POLICY "Users Delete Own Comments" ON public.post_comments FOR DELETE USING (
            auth.uid() = user_id OR 
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
        );
    END IF;
END $$;

-- 8. Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('adm-assets', 'adm-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access Adm Assets') THEN
        CREATE POLICY "Public Access Adm Assets" ON storage.objects FOR SELECT USING (bucket_id = 'adm-assets');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Upload Adm Assets') THEN
        CREATE POLICY "Admin Upload Adm Assets" ON storage.objects FOR ALL USING (
            bucket_id = 'adm-assets' AND 
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
        );
    END IF;
END $$;

-- 9. Initial settings row if not exists
INSERT INTO public.adm_settings (id, nome_exibicao, biografia)
SELECT '00000000-0000-0000-0000-000000000000', 'Administrador', 'Bem-vindo ao meu perfil oficial.'
WHERE NOT EXISTS (SELECT 1 FROM public.adm_settings LIMIT 1);

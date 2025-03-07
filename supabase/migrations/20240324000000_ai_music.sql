-- Create AI music generations table
CREATE TABLE IF NOT EXISTS public.ai_music_generations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    prompt text NOT NULL,
    generated_data jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_music_generations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own music generations"
    ON public.ai_music_generations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own music generations"
    ON public.ai_music_generations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
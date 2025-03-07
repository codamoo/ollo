-- Create chat_history table
CREATE TABLE IF NOT EXISTS public.chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  conversation_id uuid NOT NULL,
  sequence_number integer NOT NULL,
  UNIQUE(conversation_id, sequence_number)
);

-- Enable RLS
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own chat messages"
ON public.chat_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own chat messages"
ON public.chat_history FOR SELECT TO authenticated
USING (auth.uid() = user_id);
// app/[username]/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import ProfileClient from './profile-client';
import { Database } from '@/types/supabase';

export const dynamicParams = true; // Optional: Set to false if you only want pre-rendered paths

export async function generateStaticParams() {
  const supabase = createServerComponentClient<Database>({ cookies });

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('username')
    .not('username', 'is', null);

  if (error || !profiles || profiles.length === 0) {
    console.error('Error fetching profiles:', error);
    return [];
  }

  return profiles.map((profile) => ({ username: profile.username }));
}

export default function Profile({ params }: { params: { username: string } }) {
  return <ProfileClient username={params.username} />;
}

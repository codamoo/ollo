'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import ProfileSettings from '../components/profile-settings';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        redirect('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      toast.error('Error fetching profile');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Error loading profile</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
        <ProfileSettings profile={profile} />
      </main>
    </div>
  );
}
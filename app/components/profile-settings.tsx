'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle2 } from 'lucide-react';
import ProfileThemeSettings from './profile-theme-settings';
import SpotifyIntegration from './spotify-integration';

interface ProfileSettings {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  is_verified: boolean;
}

interface UserSettings {
  theme: string;
  language: string;
  email_notifications: boolean;
  push_notifications: boolean;
}

interface ProfileSettingsProps {
  profile: ProfileSettings;
}

export default function ProfileSettings({ profile }: ProfileSettingsProps) {
  const [profileData, setProfileData] = useState<ProfileSettings>(profile);
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    language: 'en',
    email_notifications: true,
    push_notifications: true
  });
  const [loading, setLoading] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      toast.error('Error fetching settings');
    }
  }

  async function handleProfileUpdate() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Profile updated successfully');
      setUnsavedChanges(false);
    } catch (error) {
      toast.error('Error updating profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleSettingsUpdate(updates: Partial<UserSettings>) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          id: user.id,
          ...settings,
          ...updates,
        });

      if (error) throw error;
      
      setSettings(prev => ({ ...prev, ...updates }));
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Error updating settings');
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (field: keyof ProfileSettings, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="theme">Theme</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileData.avatar_url || undefined} />
              <AvatarFallback>
                <UserCircle2 className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">Profile Settings</h2>
              <p className="text-muted-foreground">Update your profile information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <Input
                value={profileData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Display Name</label>
              <Input
                value={profileData.display_name || ''}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Avatar URL</label>
              <Input
                value={profileData.avatar_url || ''}
                onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <Textarea
                value={profileData.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Website</label>
              <Input
                value={profileData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <Input
                value={profileData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                disabled={loading}
              />
            </div>
            {unsavedChanges && (
              <div className="flex justify-end">
                <Button 
                  onClick={handleProfileUpdate}
                  disabled={loading}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="settings">
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">User Settings</h2>
            <p className="text-muted-foreground">Manage your application preferences</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <Select
                value={settings.theme}
                onValueChange={(value) => handleSettingsUpdate({ theme: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <Select
                value={settings.language}
                onValueChange={(value) => handleSettingsUpdate({ language: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Email Notifications</label>
                <p className="text-sm text-muted-foreground">Receive email updates about your account</p>
              </div>
              <Switch
                checked={settings.email_notifications}
                onCheckedChange={(checked) => handleSettingsUpdate({ email_notifications: checked })}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Push Notifications</label>
                <p className="text-sm text-muted-foreground">Receive push notifications about your account</p>
              </div>
              <Switch
                checked={settings.push_notifications}
                onCheckedChange={(checked) => handleSettingsUpdate({ push_notifications: checked })}
                disabled={loading}
              />
            </div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="theme">
        <ProfileThemeSettings />
      </TabsContent>

      <TabsContent value="integrations">
        <div className="space-y-6">
        </div>
      </TabsContent>
      <SpotifyIntegration />
    </Tabs>
  );
}

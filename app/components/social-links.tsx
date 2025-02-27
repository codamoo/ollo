'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Github,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Twitch,
  Globe,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

interface SocialLinksProps {
  userId: string;
  isOwner: boolean;
}

const PLATFORMS = {
  github: {
    name: 'GitHub',
    icon: Github,
    iconColor: 'text-gray-900 dark:text-white',
    hoverColor: 'hover:border-gray-900 dark:hover:border-white',
  },
  twitter: {
    name: 'Twitter',
    icon: Twitter,
    iconColor: 'text-[#1DA1F2]',
    hoverColor: 'hover:border-[#1DA1F2]',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    iconColor: 'text-[#E4405F]',
    hoverColor: 'hover:border-[#E4405F]',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    iconColor: 'text-[#0A66C2]',
    hoverColor: 'hover:border-[#0A66C2]',
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    iconColor: 'text-[#FF0000]',
    hoverColor: 'hover:border-[#FF0000]',
  },
  twitch: {
    name: 'Twitch',
    icon: Twitch,
    iconColor: 'text-[#9146FF]',
    hoverColor: 'hover:border-[#9146FF]',
  },
  website: {
    name: 'Website',
    icon: Globe,
    iconColor: 'text-gray-600',
    hoverColor: 'hover:border-gray-600',
  },
};

export default function SocialLinks({ userId, isOwner }: SocialLinksProps) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState({ platform: '', url: '' });

  useEffect(() => {
    fetchSocialLinks();
  }, [userId]);

  const fetchSocialLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('social_links')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order');

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching social links:', error);
      toast.error('Failed to load social links');
    }
  };

  const handleSave = async () => {
    try {
      if (!newLink.platform || !newLink.url) {
        toast.error('Please fill in all fields');
        return;
      }

      const { error } = await supabase.from('social_links').insert([
        {
          user_id: userId,
          platform: newLink.platform,
          url: newLink.url,
        },
      ]);

      if (error) throw error;

      toast.success('Social link added');
      setIsDialogOpen(false);
      setNewLink({ platform: '', url: '' });
      fetchSocialLinks();
    } catch (error) {
      console.error('Error saving social link:', error);
      toast.error('Failed to save social link');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('social_links')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Social link removed');
      fetchSocialLinks();
    } catch (error) {
      console.error('Error deleting social link:', error);
      toast.error('Failed to delete social link');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Social Links</h3>
        {isOwner && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Social Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select
                  value={newLink.platform}
                  onValueChange={(value) =>
                    setNewLink({ ...newLink, platform: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORMS).map(([key, platform]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center">
                          <platform.icon className={`h-4 w-4 mr-2 ${platform.iconColor}`} />
                          {platform.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Enter URL"
                  value={newLink.url}
                  onChange={(e) =>
                    setNewLink({ ...newLink, url: e.target.value })
                  }
                />
                <Button onClick={handleSave} className="w-full">
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const platform = PLATFORMS[link.platform as keyof typeof PLATFORMS];
          if (!platform) return null;

          const Icon = platform.icon;
          return (
            <div key={link.id} className="relative group">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-md
                  border border-gray-200 dark:border-gray-800
                  transition-colors duration-200
                  ${platform.hoverColor}
                  hover:bg-gray-50 dark:hover:bg-gray-800/50
                `}
              >
                <Icon className={`h-4 w-4 ${platform.iconColor}`} />
                <span>{platform.name}</span>
                <ExternalLink className="h-4 w-4 opacity-50" />
              </a>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(link.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {links.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-4">
          {isOwner
            ? 'Add your social links to connect with others'
            : 'No social links added yet'}
        </div>
      )}
    </div>
  );
}

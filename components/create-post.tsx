"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

interface CreatePostProps {
  onPostCreated?: () => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('text')
  const [loading, setLoading] = useState(false)
  const [musicFile, setMusicFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      setMusicFile(file)
    } else {
      toast.error('Please select a valid audio file')
      e.target.value = ''
    }
  }

  const uploadMusic = async (file: File) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('music')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('music')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast.error('Please sign in to create a post');
        return;
      }

      // Then check if profile exists, if not create it
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.email?.split('@')[0] || `user_${Date.now()}`,
            display_name: user.email?.split('@')[0] || `User ${Date.now()}`,
            email: user.email
          });

        if (profileError) throw profileError;
      }

      // Handle media upload if needed
      let mediaUrl = null;
      if (postType === 'music' && musicFile) {
        mediaUrl = await uploadMusic(musicFile);
      }

      // Create the post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          title: title.trim(),
          content: content.trim(),
          type: postType === 'text' ? 'markdown' : postType,
          user_id: user.id,
          media_url: mediaUrl ? [mediaUrl] : [],
          user_email: user.email
        });

      if (postError) throw postError;

      toast.success('Post created successfully');
      setContent('');
      setTitle('');
      setPostType('text');
      setMusicFile(null);
      onPostCreated?.();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(error instanceof Error ? error.message : 'Error creating post');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-0">
      <Input
        placeholder="Title your ollo post"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Select value={postType} onValueChange={setPostType}>
        <SelectTrigger>
          <SelectValue placeholder="Select post type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="text">Text Post</SelectItem>
          <SelectItem value="music">Music Post</SelectItem>
          <SelectItem value="image">Image Post</SelectItem>
          <SelectItem value="video">Video Post</SelectItem>
          <SelectItem value="link">Link Post</SelectItem>
        </SelectContent>
      </Select>
      
      {postType === 'music' && (
        <Input
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="mb-4"
        />
      )}

      <Textarea
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="mb-4"
      />

      <Button 
        type="submit" 
        disabled={!content.trim() || loading || (postType === 'music' && !musicFile)}
      >
        {loading ? 'Creating...' : 'Create Post'}
      </Button>
    </form>
  )
}

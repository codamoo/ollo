'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, MoreVertical, Edit2 } from 'lucide-react';
import { AudioPlayer } from '@/components/ui/audio-player';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Profile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  media_url: Array<string> | string;
  type: 'text' | 'markdown' | 'music';
  likes_count: number;
  is_liked: boolean;
  profiles?: Profile;
  // Add these optional fields to handle the transformed data
  username?: string;
  display_name?: string;
  avatar_url?: string;
  // ... other fields
  author_username?: string;
  author_display_name?: string;
  author_avatar_url?: string;
}

interface PostsListProps {
  posts: Post[];
  currentUserId: string | null;
  onPostsUpdate: (updatedPosts: Post[]) => void;
}

export default function PostsList({ posts, currentUserId, onPostsUpdate }: PostsListProps) {
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Helper function to get the display name and username
  const getPostUser = (post: Post) => {
    return {
      username: post.username || post.author_username || post.profiles?.username,
      displayName: post.display_name || post.author_display_name || post.profiles?.display_name,
      avatarUrl: post.avatar_url || post.author_avatar_url || post.profiles?.avatar_url
    };
  };

  const handleDeletePost = async (postId: string, userId: string) => {
    if (userId !== currentUserId) {
      toast.error("You can only delete your own posts");
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .match({ id: postId, user_id: userId });

      if (error) throw error;

      onPostsUpdate(posts.filter(post => post.id !== postId));
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Error deleting post');
    }
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setEditedContent(post.content);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPost || !currentUserId) return;
    
    if (editingPost.user_id !== currentUserId) {
      toast.error("You can only edit your own posts");
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editedContent })
        .match({ id: editingPost.id, user_id: currentUserId });

      if (error) throw error;

      // Update the posts list with the edited content
      onPostsUpdate(
        posts.map(post => 
          post.id === editingPost.id 
            ? { ...post, content: editedContent }
            : post
        )
      );
      
      toast.success('Post updated successfully');
      setIsEditing(false);
      setEditingPost(null);
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Error updating post');
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const post = posts.find(p => p.id === postId);
      if (!post) return;

      if (post.is_liked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({ user_id: user.id, post_id: postId });

        if (error) throw error;

        onPostsUpdate(posts.map(p => 
          p.id === postId 
            ? { ...p, is_liked: false, likes_count: p.likes_count - 1 }
            : p
        ));
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: user.id, post_id: postId });

        if (error) throw error;

        onPostsUpdate(posts.map(p => 
          p.id === postId 
            ? { ...p, is_liked: true, likes_count: p.likes_count + 1 }
            : p
        ));
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error updating like');
    }
  };

  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => {
          const user = getPostUser(post);
          return (
            <Card key={post.id} className="p-4 post-hover-effect">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Link href={`/${user.username}`}>
                    <Avatar className="h-10 w-10 cursor-pointer">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || user.username || 'User'} />
                      <AvatarFallback>
                        {(user.displayName || user.username || 'A')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link 
                      href={`/${user.username}`} 
                      className="font-semibold hover:underline"
                    >
                      {user.displayName || user.username || 'Anonymous'}
                    </Link>
                    <div className="text-sm text-gray-500">
                      {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className={post.is_liked ? "text-red-500" : ""}
                  >
                    {post.is_liked ? "❤️" : "🤍"} {post.likes_count}
                  </Button>
                  
                  {/* More menu dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {post.user_id === currentUserId && (
                        <>
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => handleEditPost(post)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit post
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-500 focus:text-red-500 cursor-pointer"
                            onClick={() => handleDeletePost(post.id, post.user_id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete post
                          </DropdownMenuItem>
                        </>
                      )}
                      {/* Additional menu items can be added here */}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {post.type === 'text' || post.type === 'markdown' ? (
                <div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-700">{post.content}</p>
              )}
              {post.type === 'music' && post.media_url && (
                <AudioPlayer
                  src={Array.isArray(post.media_url) ? post.media_url[0] : post.media_url}
                  className="mt-4"
                />
              )}
            </Card>
          );
        })}
      </div>

      {/* Edit Post Dialog */}
      <Dialog open={isEditing} onOpenChange={(open) => !open && setIsEditing(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[150px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

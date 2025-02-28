'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import { DragDropContext, Droppable, Draggable, DroppableProvided, DraggableProvided, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Grip, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LayoutSection {
  id: string;
  type: string;
  title: string;
}

const defaultSections: LayoutSection[] = [
  { id: 'profile-info', type: 'profile-info', title: 'Profile Information' },
  { id: 'social-links', type: 'social-links', title: 'Social Links' },
  { id: 'spotify-player', type: 'spotify-player', title: 'Spotify Player' },
  { id: 'following', type: 'following', title: 'Following' },
  { id: 'posts', type: 'posts', title: 'Posts' },
  { id: 'youtube', type: 'youtube', title: 'YouTube Videos' },
  { id: 'portfolio', type: 'portfolio', title: 'Portfolio' },
];

export default function LayoutEditor() {
  const [sections, setSections] = useState<LayoutSection[]>(defaultSections);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profile_layouts')
        .select('layout_data')
        .eq('user_id', user.id)
        .eq('layout_name', 'default')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.layout_data) {
        setSections(data.layout_data as LayoutSection[]);
      }
    } catch (error) {
      console.error('Error loading layout:', error);
      toast.error('Failed to load layout');
    } finally {
      setLoading(false);
    }
  };

  const saveLayout = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profile_layouts')
        .upsert({
          user_id: user.id,
          layout_name: 'default',
          layout_data: sections
        });

      if (error) throw error;
      toast.success('Layout saved successfully');
    } catch (error) {
      console.error('Error saving layout:', error);
      toast.error('Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSections(items);
  };

  const previewProfile = () => {
    router.push(`/${sections[0]?.username || ''}`);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Layout Editor</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={previewProfile}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={saveLayout} disabled={saving}>
              {saving ? 'Saving...' : 'Save Layout'}
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections">
            {(provided: DroppableProvided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {sections.map((section, index) => (
                  <Draggable
                    key={section.id}
                    draggableId={section.id}
                    index={index}
                  >
                    {(provided: DraggableProvided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab"
                          >
                            <Grip className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <span>{section.title}</span>
                        </div>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </main>
    </div>
  );
}

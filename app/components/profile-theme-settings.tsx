'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ThemeColors {
  gradientFrom: string;
  gradientTo: string;
  accent: string;
}

const defaultColors: ThemeColors = {
  gradientFrom: '221 83% 53%',  // blue-500
  gradientTo: '271 91% 65%',    // purple-500
  accent: '221 83% 53%',        // blue-500
};

const presetThemes = [
  {
    name: 'Default Blue',
    colors: defaultColors,
  },
  {
    name: 'Sunset',
    colors: {
      gradientFrom: '12 89% 55%',    // orange-500
      gradientTo: '329 86% 56%',     // pink-500
      accent: '12 89% 55%',          // orange-500
    },
  },
  {
    name: 'Forest',
    colors: {
      gradientFrom: '142 71% 45%',   // green-600
      gradientTo: '186 100% 39%',    // cyan-600
      accent: '142 71% 45%',         // green-600
    },
  },
  {
    name: 'Ocean',
    colors: {
      gradientFrom: '199 89% 48%',   // blue-400
      gradientTo: '187 100% 42%',    // cyan-500
      accent: '199 89% 48%',         // blue-400
    },
  },
];

export default function ProfileThemeSettings() {
  const [colors, setColors] = useState<ThemeColors>(defaultColors);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profile_themes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setColors({
          gradientFrom: data.gradient_from,
          gradientTo: data.gradient_to,
          accent: data.accent,
        });
        updateCssVariables({
          gradientFrom: data.gradient_from,
          gradientTo: data.gradient_to,
          accent: data.accent,
        });
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const updateCssVariables = (newColors: ThemeColors) => {
    const root = document.documentElement;
    root.style.setProperty('--profile-gradient-from', newColors.gradientFrom);
    root.style.setProperty('--profile-gradient-to', newColors.gradientTo);
    root.style.setProperty('--profile-accent', newColors.accent);
  };

  const handleColorChange = (colorKey: keyof ThemeColors, value: string) => {
    const newColors = { ...colors, [colorKey]: value };
    setColors(newColors);
    updateCssVariables(newColors);
  };

  const applyPreset = (preset: typeof presetThemes[0]) => {
    setColors(preset.colors);
    updateCssVariables(preset.colors);
  };

  const saveTheme = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profile_themes')
        .upsert({
          user_id: user.id,
          gradient_from: colors.gradientFrom,
          gradient_to: colors.gradientTo,
          accent: colors.accent,
        });

      if (error) throw error;
      toast.success('Theme saved successfully');
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Failed to save theme');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Profile Theme</h2>
      
      <div className="space-y-6">
        {/* Preview */}
        <div 
          className="h-24 rounded-lg"
          style={{
            background: `linear-gradient(to right, hsl(${colors.gradientFrom}), hsl(${colors.gradientTo}))`
          }}
        />

        {/* Preset Themes */}
        <div className="space-y-2">
          <Label>Preset Themes</Label>
          <div className="grid grid-cols-2 gap-2">
            {presetThemes.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                className="w-full"
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="space-y-4">
          <Label>Custom Colors</Label>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2 items-center">
              <Label>Gradient Start:</Label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                value={colors.gradientFrom}
                onChange={(e) => handleColorChange('gradientFrom', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <Label>Gradient End:</Label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                value={colors.gradientTo}
                onChange={(e) => handleColorChange('gradientTo', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <Label>Accent Color:</Label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                value={colors.accent}
                onChange={(e) => handleColorChange('accent', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          className="w-full"
          onClick={saveTheme}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Theme'}
        </Button>
      </div>
    </Card>
  );
}
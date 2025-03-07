
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request: Request) {
  try {
    const { tempo, mood, instrument } = await request.json();
    
    // Create a unique filename for this generation
    const outputFile = path.join(process.cwd(), 'tmp', `music_${Date.now()}.wav`);
    
    // Ensure the tmp directory exists
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Create the prompt for MusicGen
    const prompt = `Generate ${mood} music with ${instrument} at ${tempo} BPM`;

    return new Promise((resolve, reject) => {
      const musicGen = spawn('python', [
        path.join(process.cwd(), 'scripts', 'generate_music.py'),
        '--prompt', prompt,
        '--output', outputFile
      ]);

      musicGen.stderr.on('data', (data) => {
        console.error(`MusicGen Error: ${data}`);
      });

      musicGen.on('close', async (code) => {
        if (code !== 0) {
          return resolve(NextResponse.json(
            { error: 'Music generation failed' },
            { status: 500 }
          ));
        }

        try {
          // Upload to Supabase Storage
          const fileStream = fs.createReadStream(outputFile);
          const fileName = `generated/${path.basename(outputFile)}`;
          
          const { data, error } = await supabase.storage
            .from('music')
            .upload(fileName, fileStream, {
              contentType: 'audio/wav',
              cacheControl: '3600'
            });

          if (error) throw error;

          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from('music')
            .getPublicUrl(fileName);

          // Clean up the temporary file
          fs.unlinkSync(outputFile);

          return resolve(NextResponse.json({ url: publicUrl }));
        } catch (error) {
          console.error('Storage error:', error);
          return resolve(NextResponse.json(
            { error: 'Failed to store generated music' },
            { status: 500 }
          ));
        }
      });
    });
  } catch (error) {
    console.error('Request error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

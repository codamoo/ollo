'use client';

import { useEffect, useState } from 'react';
import * as Tone from 'tone';

interface Note {
  pitch: string;
  duration: number;
  timing: number;
  velocity: number;
  instrument: 'piano' | 'strings' | 'bass' | 'drums' | 'guitar';
}

interface VocalPhrase {
  text: string;
  timing: number;
  duration: number;
  pitch: string;
  emotion: string;
}

interface MusicPlayerProps {
  tracks: {
    instrumental: Note[];
    vocals: VocalPhrase[];
  };
  tempo: number;
}

const isValidNote = (note: string): boolean => {
  // Valid note format: Letter(A-G) + Optional #/b + Octave number
  const notePattern = /^[A-G][#b]?[0-8]$/i;
  return notePattern.test(note);
};

export default function MusicPlayer({ tracks, tempo }: MusicPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [samplers, setSamplers] = useState<{ [key: string]: Tone.Sampler }>({});

  useEffect(() => {
    const setupSamplers = async () => {
      try {
        setIsLoading(true);
        
        // Initialize samplers with minimal samples for faster loading
        const samplersSetup: { [key: string]: Tone.Sampler } = {
          'piano': new Tone.Sampler({
            urls: {
              'C4': 'C4.mp3',  // Just use one sample per instrument
            },
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
            onload: () => {
              console.log('Piano loaded');
            },
            onerror: (error) => {
              console.error('Piano loading error:', error);
            }
          }).toDestination(),
          
          'strings': new Tone.Sampler({
            urls: {
              'C4': 'C4.mp3',
            },
            baseUrl: 'https://tonejs.github.io/audio/violin/',
            onload: () => {
              console.log('Strings loaded');
            },
            onerror: (error) => {
              console.error('Strings loading error:', error);
            }
          }).toDestination(),
          
          'bass': new Tone.Sampler({
            urls: {
              'C2': 'C2.mp3',
            },
            baseUrl: 'https://tonejs.github.io/audio/bass/',
            onload: () => {
              console.log('Bass loaded');
            },
            onerror: (error) => {
              console.error('Bass loading error:', error);
            }
          }).toDestination(),
          
          'drums': new Tone.Sampler({
            urls: {
              'C2': 'kick.mp3',
            },
            baseUrl: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/',
            onload: () => {
              console.log('Drums loaded');
            },
            onerror: (error) => {
              console.error('Drums loading error:', error);
            }
          }).toDestination(),
          
          'guitar': new Tone.Sampler({
            urls: {
              'E2': 'E2.mp3',
            },
            baseUrl: 'https://tonejs.github.io/audio/guitar-acoustic/',
            onload: () => {
              console.log('Guitar loaded');
            },
            onerror: (error) => {
              console.error('Guitar loading error:', error);
            }
          }).toDestination(),
        };

        // Set the samplers first
        setSamplers(samplersSetup);

        // Create an array of promises that resolve when each sampler is loaded
        const loadingPromises = Object.entries(samplersSetup).map(([name, sampler]) => {
          return new Promise((resolve, reject) => {
            // Set a timeout to prevent infinite loading
            const timeoutId = setTimeout(() => {
              reject(new Error(`Loading timeout for ${name}`));
            }, 10000); // 10 second timeout

            sampler.onload = () => {
              clearTimeout(timeoutId);
              resolve(true);
            };

            sampler.onerror = (error) => {
              clearTimeout(timeoutId);
              reject(error);
            };
          });
        });

        // Wait for all samplers to load with a timeout
        try {
          await Promise.all(loadingPromises);
          console.log('All samplers loaded successfully');
          setIsLoading(false);
        } catch (error) {
          console.error('Error loading samplers:', error);
          setIsLoading(false);
          // You might want to show an error message to the user here
        }

      } catch (error) {
        console.error('Setup error:', error);
        setIsLoading(false);
      }
    };

    setupSamplers();

    return () => {
      // Cleanup
      Object.values(samplers).forEach(sampler => {
        sampler.dispose();
      });
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, []);

  const stopAllSounds = () => {
    Object.values(samplers).forEach(sampler => {
      sampler.releaseAll();
    });
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const playMusic = async () => {
    if (isPlaying || isLoading) return;

    try {
      // Check if all samplers are loaded
      const allSamplersLoaded = Object.values(samplers).every(
        sampler => sampler.loaded
      );

      if (!allSamplersLoaded) {
        console.warn('Not all samplers are loaded yet');
        return;
      }

      await Tone.start();
      Tone.Transport.stop();
      Tone.Transport.cancel();
      stopAllSounds();
      
      setIsPlaying(true);
      Tone.Transport.bpm.value = tempo;

      tracks.instrumental.forEach(note => {
        const samplerToUse = samplers[note.instrument];
        if (samplerToUse) {
          if (!isValidNote(note.pitch)) {
            console.warn(`Invalid note format: ${note.pitch}`);
            return;
          }

          Tone.Transport.schedule((time) => {
            const validPitch = note.pitch.toUpperCase();
            console.log(`Playing ${validPitch} on ${note.instrument} at ${time}`);
            samplerToUse.triggerAttackRelease(
              validPitch,
              note.duration,
              time,
              note.velocity
            );
          }, note.timing);
        }
      });

      const totalDuration = Math.max(
        ...tracks.instrumental.map(n => n.timing + n.duration)
      );

      Tone.Transport.schedule((time) => {
        Tone.Transport.stop();
        stopAllSounds();
        setIsPlaying(false);
      }, totalDuration + 0.5);

      Tone.Transport.start();

    } catch (error) {
      console.error('Error playing music:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button 
        onClick={playMusic}
        disabled={isPlaying || isLoading}
        className={`px-6 py-3 rounded-lg text-white font-semibold transition-all ${
          isPlaying || isLoading
            ? 'bg-gray-400 cursor-not-allowed opacity-70' 
            : 'bg-blue-500 hover:bg-blue-600 hover:shadow-lg'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span>Loading Instruments...</span>
            <span className="text-xs">
              ({Object.values(samplers).filter(s => s.loaded).length}/{Object.keys(samplers).length})
            </span>
          </div>
        ) : isPlaying ? (
          'Playing...'
        ) : (
          'Play Music'
        )}
      </button>
    </div>
  );
}
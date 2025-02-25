'use client';

import * as React from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Volume2, VolumeX, Play, Pause, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
}

export function AudioPlayer({ src, className, ...props }: AudioPlayerProps) {
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [muted, setMuted] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
      setMuted(newVolume === 0);
    }
  };

  const handleTimeChange = (value: number[]) => {
    const newTime = value[0];
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        'flex flex-col rounded-md bg-secondary/30 p-4',
        className
      )}
      {...props}
    >
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
      />
      
      <div className="flex items-center space-x-4">
        <div className="rounded-full bg-primary/90 p-2">
          <Music className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex flex-1 items-center space-x-4">
          <button
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          
          <div className="flex flex-1 items-center space-x-2">
            <span className="w-12 text-sm tabular-nums">
              {formatTime(currentTime)}
            </span>
            <Slider.Root
              className="relative flex h-5 w-full touch-none select-none items-center"
              max={duration}
              step={1}
              value={[currentTime]}
              onValueChange={handleTimeChange}
            >
              <Slider.Track className="relative h-1 w-full grow rounded-full bg-secondary">
                <Slider.Range className="absolute h-full rounded-full bg-primary" />
              </Slider.Track>
              <Slider.Thumb
                className="block h-3 w-3 rounded-full border border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                aria-label="Time"
              />
            </Slider.Root>
            <span className="w-12 text-sm tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <Slider.Root
              className="relative flex h-5 w-[100px] touch-none select-none items-center"
              max={1}
              min={0}
              step={0.1}
              value={[muted ? 0 : volume]}
              onValueChange={handleVolumeChange}
            >
              <Slider.Track className="relative h-1 w-full grow rounded-full bg-secondary">
                <Slider.Range className="absolute h-full rounded-full bg-primary" />
              </Slider.Track>
              <Slider.Thumb
                className="block h-3 w-3 rounded-full border border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                aria-label="Volume"
              />
            </Slider.Root>
          </div>
        </div>
      </div>
    </div>
  );
}

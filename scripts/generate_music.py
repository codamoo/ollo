import argparse
import torchaudio
from audiocraft.models import MusicGen
from audiocraft.data.audio import audio_write

def generate_music(tempo, mood, instrument, output_file):
    model = MusicGen.get_pretrained("facebook/musicgen-small")

    prompt = f"{mood} {instrument} music at {tempo} BPM"
    
    print(f"Generating: {prompt}")

    wav = model.generate([prompt], progress=True)

    audio_write(output_file.replace('.mp3', ''), wav[0].cpu(), model.sample_rate, format='mp3')

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tempo", type=int, required=True, help="Tempo in BPM")
    parser.add_argument("--mood", type=str, required=True, help="Mood of the music")
    parser.add_argument("--instrument", type=str, required=True, help="Main instrument")
    parser.add_argument("--output", type=str, required=True, help="Output MP3 file path")

    args = parser.parse_args()
    
    generate_music(args.tempo, args.mood, args.instrument, args.output)

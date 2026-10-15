# generate with key 1, then whatever is left with key 2
cd "$(dirname "$0")/.."
T=../../reels/tools/tts_expressive.py
GEMINI_API_KEY="$K1" TTS_TEMP=0.8 python $T --input voices/ep1.csv --out voices --pause-seconds 22 --pending-out voices/p1.csv > voices/gen1.log 2>&1
[ -f voices/p1.csv ] && GEMINI_API_KEY="$K2" TTS_TEMP=0.8 python $T --input voices/p1.csv --out voices --pause-seconds 22 --pending-out voices/p2.csv > voices/gen2.log 2>&1
echo done

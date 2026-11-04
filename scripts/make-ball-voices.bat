@echo off
cd /d "%~dp0.."
set GEMINI_API_KEY_FILE=%USERPROFILE%\gemini-key.txt
python scripts/generate_gemini_voice_pack.py --input scripts/quest-voices-ball.csv --out assets/audio/fa-test --overwrite --pause-seconds 2 --pending-out scripts/quest-voices-ball.pending.csv
pause

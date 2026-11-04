@echo off
cd /d "%~dp0.."
set GEMINI_API_KEY_FILE=%USERPROFILE%\gemini-key.txt
python scripts/generate_gemini_voice_pack.py --input scripts/peach-voice.csv --out assets/audio/fa-test --overwrite
pause

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import omnicast_engine as e

banned_test = "अरे दादा रे दादा! ई त गर्दा उड़ा दिहलन भइया! स्टेडियम में पूरा भउकाल मच गइल बा!"
user_langs = [
    'hindi', 'english', 'marathi', 'punjabi', 'oriya', 
    'gujarati', 'rajasthani', 'tamil', 'telegulu', 'nepali', 
    'bengali', 'kannada', 'urdu', 'assamese', 'Bhojpuri'
]

print("=== Omnicast 15-Language Pure Cricket Voicemail Test ===")
for lang in user_langs:
    norm = e.normalize_language_name(lang)
    vm = e.generate_voice_mail(banned_test, selected_lang=lang, recipient_name='Cricket Fans')
    assert 'गर्दा' not in vm['script'], f"Banned word found in {lang}"
    assert 'भउकाल' not in vm['script'], f"Banned word found in {lang}"
    assert 'दादा' not in vm['script'], f"Banned word found in {lang}"
    print(f"[{norm:11}] ({vm['file_size_kb']} KB) File: {vm['filename']}")
    print(f"            Script: {vm['script']}")

print("\nSUCCESS: All 15 languages cleanly interpreted with pure cricket commentary!")

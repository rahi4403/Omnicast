import urllib.request
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 1. Status API
with urllib.request.urlopen('http://localhost:5000/api/status') as r:
    data = json.loads(r.read().decode('utf-8'))
    print("Status API:", data)

# 2. Multilingual Matrix (15 languages)
req = urllib.request.Request(
    'http://localhost:5000/api/multilingual-matrix',
    data=json.dumps({
        'raw_text': 'Short of a length and angled across off, left alone by the batsman.',
        'audience_mode': 'rookie',
        'cultural_tone': 'standard'
    }).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req) as r:
    res = json.loads(r.read().decode('utf-8'))
    print(f"Matrix Total Languages: {res['total_languages']}")
    for row in res['matrix']:
        print(f"  {row['Language']} [{row['gTTS Code']}]: {row['Adapted Commentary'][:40]}...")

# 3. Voicemail Generation (Cell 7)
req_vm = urllib.request.Request(
    'http://localhost:5000/api/generate-voicemail',
    data=json.dumps({
        'text': 'बल्लेबाज ने गेंद को शांति से छोड़ दिया।',
        'language': 'Hindi',
        'recipient': 'Rahul'
    }).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req_vm) as r:
    vm = json.loads(r.read().decode('utf-8'))
    print(f"Voicemail Generated: {vm['filename']} -> URL: {vm['audio_url']} (Size: {vm['file_size_kb']} KB)")

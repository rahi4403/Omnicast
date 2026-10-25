"""
OmniCast AI - Production Flask Application
Serves the 4 Core Tabs:
1. Live Match Feed & Ball-by-Ball Stream Tab
2. Complexity Switcher & Cultural Adaptation Tab
3. Multilingual Broadcast Tab
4. Audio Voice Mail / Live Audio Stream Tab
"""

import os
import json
import time
from flask import Flask, render_template, request, jsonify, send_from_directory
import omnicast_engine as engine

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config['JSON_AS_ASCII'] = False

# Active simulated match state
MATCH_STATE = {
    "match_title": "ICC World Championship Final - India vs Australia",
    "venue": "Narendra Modi Stadium, Ahmedabad",
    "toss": "India elected to bat first",
    "current_innings": "1st Innings",
    "current_score": "184/4",
    "overs": "18.4",
    "run_rate": "9.85",
    "req_rate": "N/A",
    "win_prob_india": 68,
    "win_prob_opp": 32,
    "batsman_1": {"name": "Virat Kohli", "runs": 76, "balls": 48, "fours": 7, "sixes": 2, "sr": 158.3, "status": "out"},
    "batsman_2": {"name": "Hardik Pandya", "runs": 28, "balls": 14, "fours": 2, "sixes": 2, "sr": 200.0, "status": "not out"},
    "bowler": {"name": "Jasprit Bumrah", "overs": "3.4", "maidens": 0, "runs": 28, "wickets": 2, "econ": 7.64},
    "balls": list(engine.DEFAULT_BALL_FEED)
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status')
def api_status():
    return jsonify({
        "status": "online",
        "engine": "OmniCast Multilingual AI Engine",
        "supported_languages": len(engine.LANGUAGES_CONFIG),
        "cultural_tones": len(engine.CULTURAL_TONES),
        "total_feed_balls": len(MATCH_STATE["balls"])
    })

@app.route('/api/languages')
def api_languages():
    return jsonify({
        "languages": engine.LANGUAGES_CONFIG,
        "cultural_tones": engine.CULTURAL_TONES
    })

@app.route('/api/feed')
def api_feed():
    return jsonify({
        "match": MATCH_STATE,
        "balls": MATCH_STATE["balls"]
    })

@app.route('/api/adapt', methods=['POST'])
def api_adapt():
    data = request.get_json() or {}
    raw_text = data.get('raw_text', '').strip()
    if not raw_text:
        raw_text = "Short of a length and angled across off, left alone by the batsman."

    audience_mode = data.get('audience_mode', 'rookie')
    target_lang = engine.normalize_language_name(data.get('target_lang', 'Hindi'))
    cultural_tone = data.get('cultural_tone', 'standard')

    start_time = time.time()
    adapted_text = engine.adapt_commentary_multilingual(
        raw_text=raw_text,
        audience_mode=audience_mode,
        target_lang=target_lang,
        cultural_tone=cultural_tone
    )
    latency_ms = round((time.time() - start_time) * 1000, 1)

    lang_info = engine.LANGUAGES_CONFIG.get(target_lang, {"name": target_lang, "gtts": "en"})

    return jsonify({
        "success": True,
        "raw_text": raw_text,
        "adapted_text": adapted_text,
        "audience_mode": audience_mode,
        "target_lang": target_lang,
        "cultural_tone": cultural_tone,
        "gtts_code": lang_info.get("gtts", "en"),
        "latency_ms": latency_ms,
        "word_count": len(adapted_text.split()),
        "char_count": len(adapted_text)
    })

@app.route('/api/multilingual-matrix', methods=['POST'])
def api_multilingual_matrix():
    data = request.get_json() or {}
    raw_text = data.get('raw_text', '').strip()
    if not raw_text:
        raw_text = "Short of a length and angled across off, left alone by the batsman."

    audience_mode = data.get('audience_mode', 'rookie')
    cultural_tone = data.get('cultural_tone', 'standard')

    start_time = time.time()
    matrix = engine.generate_multilingual_matrix(
        raw_text=raw_text,
        audience_mode=audience_mode,
        cultural_tone=cultural_tone
    )
    latency_ms = round((time.time() - start_time) * 1000, 1)

    return jsonify({
        "success": True,
        "raw_text": raw_text,
        "audience_mode": audience_mode,
        "cultural_tone": cultural_tone,
        "matrix": matrix,
        "total_languages": len(matrix),
        "latency_ms": latency_ms
    })

import traceback

@app.route('/api/generate-voicemail', methods=['POST'])
def api_generate_voicemail():
    try:
        data = request.get_json() or {}
        text_to_speak = data.get('text', '').strip()
        selected_lang = engine.normalize_language_name(data.get('language', 'Bengali'))
        recipient_name = data.get('recipient', 'All Fans')
        celebration_tag = data.get('celebration', '')

        if not text_to_speak:
            matrix = engine.generate_multilingual_matrix("Short of a length and angled across off, left alone by the batsman.")
            row = next((r for r in matrix if r["Language"] == selected_lang), matrix[0])
            text_to_speak = row["Adapted Commentary"]

        audience_mode = data.get('audience_mode', 'rookie')
        cultural_tone = data.get('cultural_tone', 'standard')

        result = engine.generate_voice_mail(
            text_to_speak=text_to_speak,
            selected_lang=selected_lang,
            recipient_name=recipient_name,
            celebration_tag=celebration_tag,
            audience_mode=audience_mode,
            cultural_tone=cultural_tone
        )

        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/api/add-ball', methods=['POST'])
def api_add_ball():
    data = request.get_json() or {}
    commentary = data.get('commentary', '').strip()
    if not commentary:
        return jsonify({"success": False, "error": "Commentary cannot be empty"}), 400

    commentary = engine.clean_cricket_commentary_text(commentary)
    sport = "cricket"
    event_type = data.get('event_type', 'FOUR')
    runs = int(data.get('runs', 4))
    bowler = data.get('bowler', 'Jasprit Bumrah')
    striker = data.get('striker', 'Hardik Pandya')

    new_id = f"ball-{len(MATCH_STATE['balls']) + 1}"
    ball_obj = {
        "id": new_id,
        "over": f"19.{len(MATCH_STATE['balls']) % 6 + 1}",
        "sport": sport,
        "bowler": bowler,
        "striker": striker,
        "speed": "141 km/h",
        "event_type": event_type,
        "score": "196/4",
        "runs": runs,
        "raw_text": commentary,
        "pitch_zone": "Custom Cricket Delivery",
        "impact": f"Live Added ({event_type})"
    }

    MATCH_STATE["balls"].insert(0, ball_obj)
    return jsonify({"success": True, "ball": ball_obj, "total_balls": len(MATCH_STATE["balls"])})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting OmniCast AI Server on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)

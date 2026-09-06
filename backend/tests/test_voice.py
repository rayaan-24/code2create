import pytest
from app.voice.client import ElevenLabsClient


def test_elevenlabs_client_fallback():
    """Test ElevenLabs client falls back cleanly to synthesized WAV audio when no API key."""
    client = ElevenLabsClient(api_key="mock_key")
    audio_bytes, content_type = client.synthesize_speech_sync("Hello from Nexora voice intelligence.")
    
    assert audio_bytes is not None
    assert len(audio_bytes) > 44  # Valid WAV file header size is at least 44 bytes
    assert audio_bytes[:4] == b"RIFF"  # Valid WAV header signature
    assert content_type == "audio/wav"


def test_voice_speech_endpoint(client, token_user_a):
    """Test POST /api/v1/voice/speech endpoint generates audio bytes with correct media headers."""
    headers = {"Authorization": f"Bearer {token_user_a}"}

    response = client.post(
        "/api/v1/voice/speech",
        headers=headers,
        json={"text": "Student Services is located in SJT Ground Floor, Room G12."},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] in ["audio/mpeg", "audio/wav"]
    assert len(response.content) > 40


def test_voice_speech_empty_text_rejected(client, token_user_a):
    """Test POST /api/v1/voice/speech with empty text returns 400 or 422 validation error."""
    headers = {"Authorization": f"Bearer {token_user_a}"}

    response = client.post(
        "/api/v1/voice/speech",
        headers=headers,
        json={"text": ""},
    )
    assert response.status_code in [400, 422]


def test_voice_transcribe_endpoint(client, token_user_a):
    """Test POST /api/v1/voice/transcribe handles audio file upload and returns text."""
    headers = {"Authorization": f"Bearer {token_user_a}"}

    # Upload mock audio bytes
    files = {"file": ("test.wav", b"RIFF....WAVEfmt ....data....", "audio/wav")}
    response = client.post(
        "/api/v1/voice/transcribe",
        headers=headers,
        files=files,
    )
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert len(data["text"]) > 0

import whisper
whisper.load_model('tiny', download_root='./models')
print("Whisper model downloaded successfully.")
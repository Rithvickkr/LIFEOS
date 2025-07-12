import os
import warnings
import whisper
import moviepy as mp  # For video audio extract
from PyPDF2 import PdfReader  # For PDF
from docx import Document  # For DOCX
from langchain.embeddings import HuggingFaceEmbeddings
from fastapi import Body

# Global embedder for RAG
embedder = HuggingFaceEmbeddings(model_name='all-MiniLM-L6-v2')

def extract_and_transcribe_media(file_path):
    """Extract/transcribe text from media files (no images)"""
    file_ext = os.path.splitext(file_path)[1].lower()
    content = ""
    
    try:
        if file_ext in ['.wav', '.mp3', '.ogg', '.flac']:  # Audio
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", UserWarning)
                model = whisper.load_model('tiny', download_root=os.getenv('WHISPER_MODEL_PATH'))
                result = model.transcribe(file_path)
            content = result['text']
        
        elif file_ext in ['.mp4', '.avi', '.mkv', '.mov']:  # Video - extract audio first
            video = mp.VideoFileClip(file_path)
            audio_path = file_path + '.wav'  # Temp audio
            video.audio.write_audiofile(audio_path)
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", UserWarning)
                model = whisper.load_model('tiny', download_root=os.getenv('WHISPER_MODEL_PATH'))
                result = model.transcribe(audio_path)
            content = result['text']
            os.remove(audio_path)  # Clean up
        
        elif file_ext == '.pdf':
            with open(file_path, 'rb') as f:
                reader = PdfReader(f)
                content = " ".join([page.extract_text() for page in reader.pages])
        
        elif file_ext in ['.doc', '.docx']:
            doc = Document(file_path)
            content = " ".join([paragraph.text for paragraph in doc.paragraphs])
        
        elif file_ext in ['.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.xml']:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")
        
        if not content.strip():
            raise ValueError("No content extracted/transcribed")
        
        return content
    
    except Exception as e:
        print(f"Extraction error: {str(e)}")
        return ""
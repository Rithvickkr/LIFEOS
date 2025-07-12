from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import pdfplumber
import whisper
import os
from models import Embedding
from database import SessionLocal
from dotenv import load_dotenv
import warnings

load_dotenv()

# Init embedder and Chroma (local persist)
embedder = SentenceTransformer('all-MiniLM-L6-v2')
chroma_client = chromadb.PersistentClient(path="./chroma_db")  # Stores locally in ./chroma_db
collection = chroma_client.get_or_create_collection(name="lifeos_embeddings")

text_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=50)

def extract_text_from_pdf(file_path):
    with pdfplumber.open(file_path) as pdf:
        text = ''.join(page.extract_text() for page in pdf.pages if page.extract_text())
    return text

def transcribe_audio_video(file_path):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)  # Targets UserWarning like FP16
        model = whisper.load_model('tiny', download_root=os.getenv('WHISPER_MODEL_PATH'))
        result = model.transcribe(file_path)
    return result['text']

def embed_content(activity_id, content, source_type):
    chunks = text_splitter.split_text(content)
    embeddings = embedder.encode(chunks).tolist()  # List for Chroma

    # Store in Chroma
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        metadatas=[{"activity_id": activity_id, "source": source_type} for _ in chunks],
        ids=[f"chunk_{i}_{activity_id}" for i in range(len(chunks))]
    )

    # Optional: Save to PostgreSQL too (for ref)
    db = SessionLocal()
    for i, chunk in enumerate(chunks):
        new_emb = Embedding(activity_id=activity_id, text=chunk, vector=embeddings[i])
        db.add(new_emb)
        db.commit()
    db.close()

def process_activity_content(activity):
    content = ""
    source_type = ""
    if activity.file_path:
        if activity.file_path.endswith('.pdf'):
            content = extract_text_from_pdf(activity.file_path)
            source_type = 'pdf'
        elif activity.file_path.endswith(('.mp3', '.mp4', '.wav')):
            content = transcribe_audio_video(activity.file_path)
            source_type = 'media'
        elif activity.file_path.endswith('.txt'):
            with open(activity.file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            source_type = 'text'
        elif activity.file_path.endswith(('.docx', '.doc')):
            import docx
            doc = docx.Document(activity.file_path)
            content = '\n'.join([para.text for para in doc.paragraphs])
            source_type = 'docx'
        elif activity.file_path.endswith('.csv'):
            import pandas as pd
            df = pd.read_csv(activity.file_path)
            content = df.to_string(index=False)
            source_type = 'csv'
    # Add more handlers if needed (e.g., .txt files)

    if content:
        embed_content(activity.id, content, source_type)
import json
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
from extracter import extract_and_transcribe_media
from database import SessionLocal
from models import Activity, Embedding
from fastapi import Body
from tracking import start_file_tracking, start_window_tracking
from memory import collection, embedder
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from fastapi.middleware.cors import CORSMiddleware
from langchain_chroma import Chroma
from langchain_together import Together as LangChainTogether # For vectorstore
from langchain_huggingface import HuggingFaceEmbeddings  # For embeddings
from langchain.chains import RetrievalQA, LLMChain
from langchain.prompts import PromptTemplate
from together import Together
import networkx as nx
import numpy as np
from networkx.readwrite import json_graph

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Your frontend URL; add "*" for all (dev only)
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, etc.
    allow_headers=["*"],  # Allows all headers
)


start_window_tracking()
start_file_tracking(os.getenv('MONITORED_FOLDER'))


# Dependency for DB sessions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "LIFEOS Backend Running"}

@app.post("/track/activity")
def track_activity(data: dict = Body(...), db: Session = Depends(get_db)):
    new_activity = Activity(
        app_name=data.get('app_name'),
        window_title=data.get('window_title'),
        url=data.get('url'),
        file_path=data.get('file_path'),
        type=data.get('type')
    )
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    return {"status": "logged", "id": new_activity.id}

@app.get("/search")
def search(query: str, top_k: int = 5):
    query_emb = embedder.encode(query).tolist()
    results = collection.query(query_embeddings=[query_emb], n_results=top_k)
    return {"results": results['documents'][0], "metadatas": results['metadatas'][0]}

@app.get("/timeline")
def get_timeline(db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    activities = db.query(Activity).filter(func.date(Activity.timestamp) == today).all()

    # Aggregate by hour and calculate hourly focus scores
    timeline_data = {}
    hourly_switches = {}
    hourly_counts = {}
    last_app_per_hour = {}
    
    for act in activities:
        hour = act.timestamp.hour
        if hour not in timeline_data:
            timeline_data[hour] = {'apps': [], 'focus': 100}
            hourly_switches[hour] = 0
            hourly_counts[hour] = 0
            
        timeline_data[hour]['apps'].append(act.app_name or act.type)
        hourly_counts[hour] += 1

        # Count switches per hour
        if act.app_name:
            if hour in last_app_per_hour and act.app_name != last_app_per_hour[hour]:
                hourly_switches[hour] += 1
            last_app_per_hour[hour] = act.app_name

    # Calculate focus score for each hour
    for hour in timeline_data:
        if hourly_counts[hour] > 0:
            switch_ratio = hourly_switches[hour] / hourly_counts[hour]
            timeline_data[hour]['focus'] = int((1 - switch_ratio) * 100)
        else:
            timeline_data[hour]['focus'] = 100
         
    # Overall focus score
    total_activities = len(activities)
    total_switches = sum(hourly_switches.values())
    print(f"Total activities today: {total_activities}, Total switches: {total_switches}")  # Debug print
    switch_ratio = total_switches / total_activities if total_activities > 0 else 0
    focus_score = int((1 - switch_ratio) * 100)
    print(f"Overall focus score calculated: {focus_score}")  # Debug print

    # Updated prediction with hourly counts
    from collections import Counter
    from darts import TimeSeries
    from darts.models import ExponentialSmoothing


    prediction = 0

    if len(activities) >= 2:  # Minimum needed for time series
        try:
            # Step 1: Count activities per hour
            hourly_counts = Counter([act.timestamp.hour for act in activities])
            sorted_hours = sorted(hourly_counts.keys())
            activity_counts = [hourly_counts[hour] for hour in sorted_hours]

            # Debug: Print hour-wise data
            print("Hourly Activity Count:")
            for h, c in zip(sorted_hours, activity_counts):
                print(f"{h}: {c}")

            # Step 2: Create TimeSeries from activity counts
            series = TimeSeries.from_values(activity_counts)

            # Step 3: Fit model and predict
            model = ExponentialSmoothing()
            model.fit(series)
            pred_ts = model.predict(1)

            prediction = float(pred_ts.values()[0][0])
            print(f"Predicted activity count for next hour: {prediction}")

        except Exception as e:
            print(f"Darts prediction error: {e} - Falling back to 0")
            prediction = 0
    else:
        print("Not enough activities for prediction.")
        prediction = 0

    return {
        "timeline": timeline_data,
        "focus_score": focus_score,
        "prediction": prediction
    }

together_client = Together(api_key=os.getenv('TOGETHER_API_KEY'))
Embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma(persist_directory="./chroma_db", embedding_function=Embeddings)

@app.get("/insightss")
def get_insights(db: Session = Depends(get_db)):
    # Get today's activities
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)
    activities = db.query(Activity).filter(Activity.timestamp >= one_hour_ago, Activity.timestamp <= now).all()
    activity_summary = " ".join([f"{act.app_name or act.type}: {act.window_title or act.file_path}" for act in activities])
    print("Past hour's activities summary:", activity_summary)  # Debug print
    
    # Get unique activities
    unique_activities = list(set([act.app_name or act.type for act in activities if act.app_name or act.type]))
    print("Unique activities:", unique_activities)  # Debug print

    # RAG retriever from Chroma
    retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 5})
    print ("Retriever initialized")  # Debug: Confirm retriever setup

    # Batch question text
    batch_question = """Answer these questions:

1. What did I learn today?
2. Where am I weak?
3. What should I revise?

Only respond with a **valid JSON object** using **double quotes**, like:
{"1": "answer1", "2": "answer2", "3": "answer3"}

Return ONLY that. Do not add anything else, not even explanation."""

    # Prompt template for Llama
    prompt_template = PromptTemplate(
        input_variables=["context", "question"],
        template="""You are an AI assistant analyzing a user's daily activities and learning progress.

Based on today's activities and learning materials: {context}

{question}

Instructions:
- Provide detailed, specific, and actionable insights
- Base your answers on the actual activities and content provided
- Be honest if there's insufficient information
- Focus on concrete learning outcomes and improvement areas
- Use specific examples from the activities when possible

Answer in the specified JSON format with detailed explanations for each question. Do not add any additional text outside the JSON format.

"""
    )

    # LangChain chain with Llama (updated to RunnableSequence: prompt | llm)
    llm = LangChainTogether(
        model="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        together_api_key=os.getenv('TOGETHER_API_KEY'),
        max_tokens=2048,
        temperature=0.7
    )
    chain = prompt_template | llm  # New way, no LLMChain

    # Get RAG context
    docs = retriever.invoke(batch_question + " Activities summary: " + activity_summary + " Unique activities: " + ", ".join(unique_activities))
    print("Retrieved documents:", docs)
    context = activity_summary + " " + ", ".join(unique_activities)
    
    # Fallback to activity summary if no RAG context found
    if not context.strip():
        context = activity_summary
        print("No RAG context found, using activity summary as context")
    
    print("Context generated", context)  # Debug: Check if context is empty

    # Generate batched insights
    result = chain.invoke({"context": context, "question": batch_question})
    print("Raw result from Llama:", result)  # Debug print
    # Return raw text from LLM without JSON parsing
    if isinstance(result, str):
        raw_text = result
    else:
        raw_text = result.content if hasattr(result, 'content') else str(result)
    
    return {"raw_response": raw_text}

@app.get("/quiz")
def get_quiz(topic: str = "learning", num_mcqs: int = 5, db: Session = Depends(get_db)):
    print("Entering get_quiz endpoint with topic:", topic, "and num_mcqs:", num_mcqs)  # Debug: Confirm entry
    print("Using vectorstore:", vectorstore)  # Debug: Check vectorstore setup
    
    # Fetch all embeddings from DB for fallback
    all_embeddings = db.query(Embedding).all()
    print("Embeddings fetched from DB:", len(all_embeddings))  # Debug: Check DB load
    if all_embeddings:
        print("Sample DB text:", all_embeddings[0].text[:100])  # Debug DB content
    
    # Rebuild vectorstore if empty (sync with DB)
    if vectorstore._collection.count() == 0:
        texts = [emb.text for emb in all_embeddings]
        vectors = [emb.vector for emb in all_embeddings]
        vectorstore.add_texts(texts, embeddings=vectors)
        print("Rebuilt vectorstore from DB - now has:", vectorstore._collection.count())
    
    # Retriever with MMR, lower threshold
    retriever = vectorstore.as_retriever(search_type="mmr", search_kwargs={"k": 20, "score_threshold": 0.4})  # Lower for more matches
    print("Retriever initialized for quiz:", retriever)  # Debug
    
    # Query: Lowercase for case-insensitivity
    enhanced_query = topic.lower()
    docs = retriever.invoke(enhanced_query)
    print("Docs retrieved:", len(docs))  # Debug
    if docs:
        print("Sample doc:", docs[0].page_content[:100])  # Debug
    
    context = " ".join([doc.page_content for doc in docs])
    print("Context generated - length:", len(context))  # Debug
    
    # Fixed fallback: Always use full DB texts if 0 docs
    if not context:
        context = " ".join([emb.text for emb in all_embeddings if emb.text])
        print("Fallback context used - length:", len(context))
    
    # Prompt for MCQs and summaries (fixed: escaped JSON with double curly braces)
    prompt_template = PromptTemplate(
        input_variables=["context", "num_mcqs"],
        template="From this content: {context}\nGenerate {num_mcqs} MCQs with 4 options (A-D, one correct), and a 1-liner summary for each key concept. Format as JSON: {{'mcqs': [{{'question': '', 'options': [], 'answer': ''}}], 'summaries': []}}"
    )

    llm = LangChainTogether(
        model="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        together_api_key=os.getenv('TOGETHER_API_KEY'),
        max_tokens=1024,
        temperature=0.7
    )

    chain = prompt_template | llm

    result = chain.invoke({"context": context, "num_mcqs": num_mcqs})
    
    # Handle both string and object responses
    if isinstance(result, str):
        result_content = result
    else:
        result_content = result.content if hasattr(result, 'content') else str(result)
    
    print("Raw result from Llama:", result_content)  # Debug

    try:
        output = json.loads(result_content)
        print("Generated output after parse:", output)

        # Fix lists
        if not isinstance(output.get('summaries', []), list):
            output['summaries'] = [output['summaries']] if output.get('summaries') else []

        if not isinstance(output.get('mcqs', []), list):
            output['mcqs'] = [output['mcqs']] if output.get('mcqs') else []

        print("Generated MCQs:", output.get('mcqs', []))
        print("Generated Summaries:", output.get('summaries', []))
    except Exception as e:
        print("JSON parsing error:", str(e))
        output = {"mcqs": [], "summaries": []}

    return output
@app.get("/mindmap")
def get_mindmap(db: Session = Depends(get_db)):
    embeddings = db.query(Embedding).all()
    if not embeddings:
        return {"nodes": [], "edges": []}

    G = nx.Graph()

    for emb in embeddings:
        G.add_node(emb.id, label=emb.text[:20] + "...", full_text=emb.text, activity_id=emb.activity_id)

    # Add edges based on cosine similarity
    for i in range(len(embeddings)):
        for j in range(i+1, len(embeddings)):
            vec1 = np.array(embeddings[i].vector)
            vec2 = np.array(embeddings[j].vector)
            sim = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
            if sim > 0.5:  # Adjust threshold as needed
                G.add_edge(embeddings[i].id, embeddings[j].id, weight=sim)

    # Convert to React Flow JSON
    data = json_graph.node_link_data(G)
    nodes = [{'id': str(node['id']), 'data': {'label': node['label']}, 'position': {'x': 0, 'y': 0}} for node in data['nodes']]  # Random pos later
    edges = [{'id': f"{edge['source']}-{edge['target']}", 'source': str(edge['source']), 'target': str(edge['target'])} for edge in data['links']]
    return {"nodes": nodes, "edges": edges}

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain.embeddings import HuggingFaceEmbeddings  # Or your embedder

# Global embedder (init outside for reuse)
embedder = HuggingFaceEmbeddings(model_name='all-MiniLM-L6-v2')

@app.get("/files")
def get_files():
    """Get all files from the monitored folder with their formats"""
    monitored_folder = os.getenv('MONITORED_FOLDER')
    if not monitored_folder or not os.path.exists(monitored_folder):
        return {"files": [], "error": "Monitored folder not found"}
    
    files = []
    for root, dirs, filenames in os.walk(monitored_folder):
        for filename in filenames:
            file_path = os.path.join(root, filename)
            relative_path = os.path.relpath(file_path, monitored_folder)
            file_ext = os.path.splitext(filename)[1].lower()
            file_size = os.path.getsize(file_path)
            
            files.append({
                "name": filename,
                "path": relative_path,
                "full_path": file_path,
                "format": file_ext,
                "size": file_size,
                "modified": os.path.getmtime(file_path)
            })
    
    return {"files": files}

@app.post("/query-file")
def query_file(data: dict = Body(...)):
    """Query a specific file's content using RAG after extraction/transcription"""
    file_path = data.get('file_path')
    query = data.get('query', '')
    
    if not file_path or not os.path.exists(file_path):
        return {"error": "File not found"}
    
    try:
        # Extract/transcribe content
        content = extract_and_transcribe_media(file_path)
        
        if not content:
            return {"error": "No content could be extracted/transcribed"}
        
        # RAG: Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_text(content)
        
        # Temp vectorstore
        vectorstore = Chroma.from_texts(
            texts=chunks,
            embedding=embedder,
            collection_name="temp_media_query"
        )
        
        # Retrieve relevant chunks
        retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 5})
        relevant_chunks = retriever.invoke(query)
        rag_context = " ".join([doc.page_content for doc in relevant_chunks])
        
        if not rag_context:
            rag_context = content[:2000]  # Fallback
        
        # LLM query
        prompt_template = PromptTemplate(
            input_variables=["context", "query"],
            template="""Based on the following extracted/transcribed content, answer the question:

Content: {context}

Question: {query}

Answer based solely on the content. If not found, say so."""
        )
        
        llm = LangChainTogether(
            model="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
            together_api_key=os.getenv('TOGETHER_API_KEY'),
            max_tokens=1024,
            temperature=0.3
        )
        
        chain = prompt_template | llm
        result = chain.invoke({"context": rag_context, "query": query})
        
        answer = result.content if hasattr(result, 'content') else str(result)
        
        # Clean temp vectorstore
        vectorstore.delete_collection()
        
        return {
            "file_path": file_path,
            "query": query,
            "answer": answer,
            "content_preview": content[:500] + "..." if len(content) > 500 else content
        }
    
    except Exception as e:
        return {"error": f"Error: {str(e)}"}
import json
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
from database import SessionLocal
from models import Activity
from fastapi import Body
from tracking import start_file_tracking, start_window_tracking
from memory import collection, embedder
from datetime import datetime, timedelta
from sqlalchemy import func
from fastapi.middleware.cors import CORSMiddleware
from langchain_chroma import Chroma
from langchain_together import Together as LangChainTogether # For vectorstore
from langchain_huggingface import HuggingFaceEmbeddings  # For embeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from together import Together

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

    # Aggregate by hour and type
    timeline_data = {}
    switches = 0
    last_app = None
    for act in activities:
        hour = act.timestamp.hour
        if hour not in timeline_data:
            timeline_data[hour] = {'apps': [], 'focus': 100}  # Start high
        timeline_data[hour]['apps'].append(act.app_name or act.type)

        # Simple focus calc: Count switches
        if act.app_name and act.app_name != last_app:
            switches += 1
            last_app = act.app_name

    # Overall focus score
    total_activities = len(activities)
    focus_score = max(100 - (switches * 10), 0) if total_activities else 0

    # Basic prediction with darts
    prediction = 0
    if activities:
        from darts import TimeSeries
        from darts.models import ExponentialSmoothing
        times = [act.timestamp.hour for act in activities]
        series = TimeSeries.from_values([1] * len(times))  # Dummy series
        model = ExponentialSmoothing()
        model.fit(series)
        pred_ts = model.predict(1)
        prediction = float(pred_ts.values()[0][0])  # Convert to Python float for serialization

    return {
        "timeline": timeline_data,
        "focus_score": focus_score,
        "prediction": prediction
    }

together_client = Together(api_key=os.getenv('TOGETHER_API_KEY'))
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)

@app.get("/insights")
def get_insights(db: Session = Depends(get_db)):
    # Get today's activities
    today = datetime.utcnow().date()
    activities = db.query(Activity).filter(func.date(Activity.timestamp) == today).all()
    activity_summary = " ".join([f"{act.app_name or act.type}: {act.window_title or act.file_path}" for act in activities])

    # RAG retriever from Chroma
    retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 5})

    # Prompt template for Llama
    prompt_template = PromptTemplate(
        input_variables=["context", "question"],
        template="Based on today's activities: {context}\nQuestion: {question}\nAnswer:"
    )

    # LangChain chain with Llama
    llm = LangChainTogether(
        model="deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",
        together_api_key=os.getenv('TOGETHER_API_KEY'),
        max_tokens=1024,
        temperature=0.7
        
    )
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": prompt_template}
    )

    # Generate insights
    questions = [
        "What did I learn today?",
        "Where am I weak?",
        "What should I revise?"
    ]
    insights = {}
    for q in questions:
        result = qa_chain.invoke({"query": q + " Activities summary: " + activity_summary})
        insights[q] = result['result']

    return {"insights": insights}    

@app.get("/quiz")
def get_quiz(topic: str = "cybersecurity", num_mcqs: int = 5, db: Session = Depends(get_db)):
    print("Entering get_quiz endpoint with topic:", topic, "and num_mcqs:", num_mcqs)  # Debug: Confirm entry

    # Get relevant embeddings (RAG on topic or all)
    retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 10})
    docs = retriever.invoke(topic or "cybersecurity")
    context = " ".join([doc.page_content for doc in docs])
    print("Context generated - length:", len(context))  # Debug: Check if context is empty

    if not context:
        print("No context found - returning empty")  # Debug: If early return
        return {"mcqs": [], "summaries": "No content yet—add some activities!"}

    # Prompt for MCQs and summaries
    prompt_template = PromptTemplate(
        input_variables=["context"],
        template="From this content: {context}\nGenerate {num_mcqs} MCQs with 4 options (A-D, one correct), and a 1-liner summary for each key concept. Format as JSON: {'mcqs': [{'question': '', 'options': [], 'answer': ''}], 'summaries': []}"
    )

    llm = LangChainTogether(
        model="deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",  # Corrected name - no "-free", added "ed" in Distilled
        together_api_key=os.getenv('TOGETHER_API_KEY'),
        max_tokens=1024,
        temperature=0.7
    )

    chain = prompt_template | llm  # Simple chain

    result = chain.invoke({"context": context, "num_mcqs": num_mcqs})
    print("Raw result from Llama:", result.content)  # Your original print, now with debug label

    try:
        output = json.loads(result.content)
        print("Generated output after parse:", output)  # Your original

        # Fix for summaries
        if not isinstance(output['summaries'], list):
            output['summaries'] = [output['summaries']] if output['summaries'] else []

        # Similar for mcqs
        if not isinstance(output['mcqs'], list):
            output['mcqs'] = [output['mcqs']] if output['mcqs'] else []

        print("Generated MCQs:", output.get('mcqs', []))  # Your original
        print("Generated Summaries:", output.get('summaries', []))  # Your original
    except Exception as e:
        print("JSON parsing error:", str(e))  # Debug: Catch why try fails
        output = {"mcqs": [], "summaries": []}

    return output
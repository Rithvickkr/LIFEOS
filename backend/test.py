from dotenv import load_dotenv
import os
load_dotenv()
print(os.getenv('TOGETHER_API_KEY'))
print(os.getenv('DATABASE_URL'))
print(os.getenv('WHISPER_MODEL_PATH'))
print(os.getenv('MONITORED_FOLDER'))
print("Environment variables loaded successfully.")
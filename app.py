import os
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import google.generativeai as genai
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv
import logging
import shutil
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB
MODEL_NAME = "mixedbread-ai/mxbai-embed-large-v1"
DB_DIR = "chroma_db"

try:
    client = chromadb.PersistentClient(path=DB_DIR)
    sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=MODEL_NAME
    )
    collection = client.get_collection(
        name="resume",
        embedding_function=sentence_transformer_ef
    )
    logger.info("Successfully connected to ChromaDB")
except Exception as e:
    logger.error(f"Error connecting to ChromaDB: {str(e)}")
    raise

def get_relevant_chunks(query: str, top_k=4):
    try:
        results = collection.query(
            query_texts=[query],
            n_results=top_k
        )
        return results['documents'][0]  # Get the first list of documents
    except Exception as e:
        logger.error(f"Error getting relevant chunks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get relevant chunks: {str(e)}")

# Configure Gemini
try:
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
    model_gemini = genai.GenerativeModel('gemini-2.0-flash')
    logger.info("Gemini API configured successfully")
except Exception as e:
    logger.error(f"Error configuring Gemini API: {str(e)}")
    raise

class Question(BaseModel):
    question: str

# New model for admin authentication
class AdminAuth(BaseModel):
    admin_key: str

@app.post("/ask")
async def ask_question(question: Question):
    try:
        logger.info(f"Received question: {question.question}")
        
        # Get relevant chunks directly using the question text
        relevant_chunks = get_relevant_chunks(question.question)
        context = "\n\n".join(relevant_chunks)
        logger.info(f"Found {len(relevant_chunks)} relevant chunks")
        
        # Prepare prompt for Gemini
        prompt = f"""You are Teja's portfolio bot. You must strictly follow these rules:
1. Only answer based on the resume content provided below
2. If information cannot be found in the resume, respond with "I apologize, but I cannot find that information in the resume."
3. Keep answers concise and professional (maximum 120 words)
4. Do not make assumptions or add information not present in the resume
5. When discussing technical skills or experience, be specific and cite examples from the resume

<RESUME>
{context}
</RESUME>

Question: {question.question}"""

        try:
            # Generate response using Gemini with safety settings
            safety_settings = [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_NONE",
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_NONE",
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_NONE",
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_NONE",
                },
            ]

            response = model_gemini.generate_content(
                prompt,
                safety_settings=safety_settings,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=160,
                    candidate_count=1,
                    top_k=40,
                    top_p=0.95
                )
            )
            
            if response.text:
                logger.info("Generated response from Gemini successfully")
                return {"answer": response.text}
            else:
                error_msg = "No response generated from Gemini API"
                logger.error(error_msg)
                raise HTTPException(status_code=500, detail=error_msg)
                
        except Exception as gemini_error:
            logger.error(f"Gemini API error: {str(gemini_error)}")
            raise HTTPException(status_code=500, detail=f"Error generating response: {str(gemini_error)}")
            
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add a new endpoint for updating the resume PDF
@app.post("/update-resume")
async def update_resume(file: UploadFile = File(...), auth: Optional[str] = None):
    """
    Upload a new resume PDF and regenerate the embeddings.
    Requires an admin key for authentication.
    """
    # Simple authentication check - you should use a more secure method in production
    admin_key = os.getenv("ADMIN_KEY", "your-secure-admin-key")
    
    if not auth or auth != admin_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        # Save the new resume PDF
        with open("resume.pdf", "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info("Resume PDF updated successfully")
        
        # Regenerate the embeddings
        # This assumes your embed_resume.py can be imported and has a main() function
        try:
            from embed_resume import main as embed_resume_main
            embed_resume_main()
            
            # Refresh the collection reference after updating
            global collection
            collection = client.get_collection(
                name="resume",
                embedding_function=sentence_transformer_ef
            )
            
            logger.info("Resume embeddings regenerated successfully and collection reference updated")
            return {"message": "Resume updated and embeddings regenerated successfully"}
        except Exception as embed_error:
            logger.error(f"Error regenerating embeddings: {str(embed_error)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Resume PDF updated but failed to regenerate embeddings: {str(embed_error)}"
            )
    except Exception as e:
        logger.error(f"Error updating resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update resume: {str(e)}")
    finally:
        file.file.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))

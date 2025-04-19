# Interactive Resume ChatBot

An AI-powered interactive resume chatbot that allows users to ask questions about my professional experience and skills.

## Features
- Natural language interaction with resume content
- Voice input support
- Semantic search for relevant resume sections
- ChromaDB for efficient vector storage
- FastAPI backend with Gemini AI integration

## Setup
1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file with your API keys:
```
GEMINI_API_KEY=your_gemini_api_key_here
HF_KEY=your_huggingface_api_key_here
```

3. Embed your resume:
```bash
python embed_resume.py
```

4. Start the server:
```bash
python app.py
```

5. Open `docs/index.html` in a web browser to interact with the chatbot.

## Technologies Used
- Python (FastAPI, ChromaDB)
- Google Gemini AI
- HuggingFace Embeddings
- JavaScript (Speech Recognition API)
- HTML/CSS
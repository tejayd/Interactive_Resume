#!/usr/bin/env python3
import re
import sys
from pathlib import Path
from sentence_transformers import SentenceTransformer
from pypdf import PdfReader
import chromadb
from chromadb.utils import embedding_functions

# ── CONFIG ─────────────────────────────────────────────────────────────────────
PDF_FILE   = sys.argv[1] if len(sys.argv) > 1 else "resume.pdf"
MODEL_NAME = "mixedbread-ai/mxbai-embed-large-v1"
MIN_CHUNK  = 100    # min chars to keep
MAX_CHUNK  = 500    # max chars per chunk
DB_DIR     = "chroma_db"
# ────────────────────────────────────────────────────────────────────────────────

def smart_chunk(text: str):
    # split on common headers
    sections = re.split(
        r'\n(?=(?:EDUCATION|EXPERIENCE|SKILLS|PROJECTS|AWARDS|CERTIFICATIONS|PUBLICATIONS))',
        text
    )
    raw: list[str] = []
    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue
        if len(sec) <= MAX_CHUNK:
            raw.append(sec)
        else:
            # further split very long sections
            parts = re.split(r'(?<=\n)(?=[\u2022\-\*])|(?<=[.!?])\s+(?=[A-Z])', sec)
            buf = ""
            for p in parts:
                if len(buf) + len(p) <= MAX_CHUNK:
                    buf += ("\n\n" + p) if buf else p
                else:
                    raw.append(buf)
                    buf = p
            if buf:
                raw.append(buf)
    # final pass: merge tiny with neighbors
    out: list[str] = []
    buf = ""
    for chunk in raw:
        if len(buf) + len(chunk) <= MAX_CHUNK:
            buf += ("\n\n" + chunk) if buf else chunk
        else:
            out.append(buf)
            buf = chunk
    if buf:
        out.append(buf)
    return out

def main():
    print(f"• Loading PDF → {PDF_FILE}")
    text = "\n".join(p.extract_text() or "" for p in PdfReader(PDF_FILE).pages)

    print("• Chunking…")
    chunks = smart_chunk(text)
    print(f"  → {len(chunks)} chunks between {MIN_CHUNK}–{MAX_CHUNK} chars")

    print(f"• Setting up ChromaDB with '{MODEL_NAME}'")
    # Initialize ChromaDB
    client = chromadb.PersistentClient(path=DB_DIR)
    
    # Create or get collection with the specified embedding function
    sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=MODEL_NAME
    )
    
    # Delete collection if it exists
    try:
        client.delete_collection("resume")
    except:
        pass
        
    collection = client.create_collection(
        name="resume",
        embedding_function=sentence_transformer_ef,
        metadata={"description": "Resume chunks with embeddings"}
    )

    print("• Adding chunks to ChromaDB...")
    # Add documents to the collection
    collection.add(
        documents=chunks,
        ids=[f"chunk_{i}" for i in range(len(chunks))],
        metadatas=[{"source": "resume.pdf"} for _ in chunks]
    )
    
    print(f"✓ Successfully stored {len(chunks)} chunks in ChromaDB at {DB_DIR}")

if __name__ == "__main__":
    main()

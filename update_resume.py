#!/usr/bin/env python3
import argparse
import requests
import os
from dotenv import load_dotenv

load_dotenv()

def update_resume(pdf_path, api_url, admin_key=None):
    """
    Upload a new resume PDF to the deployed API service.
    
    Args:
        pdf_path: Path to the new resume PDF file
        api_url: URL of the Cloud Run API service
        admin_key: Admin key for authentication (defaults to ADMIN_KEY env var)
    """
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return False
    
    # Get admin key from environment if not provided
    if not admin_key:
        admin_key = os.getenv("ADMIN_KEY")
        if not admin_key:
            print("Error: No admin key provided. Set ADMIN_KEY environment variable or pass with --admin-key")
            return False
    
    # Ensure the API URL has the proper endpoint
    if not api_url.endswith("/update-resume"):
        api_url = f"{api_url.rstrip('/')}/update-resume"
    
    print(f"Uploading resume PDF to {api_url}...")
    
    try:
        with open(pdf_path, "rb") as pdf_file:
            files = {"file": (os.path.basename(pdf_path), pdf_file, "application/pdf")}
            params = {"auth": admin_key}
            
            response = requests.post(api_url, files=files, params=params)
            
            if response.status_code == 200:
                print("✅ Resume updated successfully!")
                print(response.json()["message"])
                return True
            else:
                print(f"❌ Error: {response.status_code}")
                try:
                    error_detail = response.json().get("detail", "Unknown error")
                    print(f"Details: {error_detail}")
                except:
                    print(f"Response: {response.text}")
                return False
    except Exception as e:
        print(f"❌ Failed to upload resume: {str(e)}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update resume PDF on deployed service")
    parser.add_argument("pdf_path", help="Path to the new resume PDF file")
    parser.add_argument("--api-url", required=True, help="URL of the deployed API service")
    parser.add_argument("--admin-key", help="Admin key for authentication (defaults to ADMIN_KEY env var)")
    
    args = parser.parse_args()
    update_resume(args.pdf_path, args.api_url, args.admin_key)
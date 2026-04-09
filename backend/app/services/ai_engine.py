import os
import json
from google import genai
from backend.app.core.config import settings

def explain_vulnerability(vuln_title: str, description: str) -> dict:
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.strip() == "":
        return {
            "summary": f"Mock AI Summary for {vuln_title}",
            "risk": "High severity potentially.",
            "fix": "Standard patch implementation required.",
            "code_example": "# Provide correct parameters"
        }
    
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        prompt = f"""
        You are an expert cybersecurity analyst.
        Analyze the following vulnerability found via scanner.
        Vulnerability: {vuln_title}
        Details: {description}
        
        Provide your response as a valid JSON object matching this schema exactly:
        {{
            "summary": "Brief 1 sentence explanation",
            "risk": "Explanation of the risk and why it matters",
            "fix": "How to fix it step by step",
            "code_example": "A short configuration or code snippet demonstrating the fix"
        }}
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        
        data = json.loads(raw_text.strip())
        return data
    except Exception as e:
        print(f"AI Engine Error: {e}")
        return {
            "summary": "AI error retrieving summary",
            "risk": "Unknown",
            "fix": "Unknown",
            "code_example": ""
        }

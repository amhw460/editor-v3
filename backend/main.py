from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv
import re
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Text Editor API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Google Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class ConvertLatexRequest(BaseModel):
    text: str

class ConvertLatexResponse(BaseModel):
    latex: str
    original_text: str

LATEX_CONVERSION_PROMPT = """Convert natural language math descriptions to LaTeX code. Return only the LaTeX code without $ symbols."""

@app.get("/")
async def root():
    return {"message": "Text Editor API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/convert-latex", response_model=ConvertLatexResponse)
async def convert_latex(request: ConvertLatexRequest):
    """Convert natural language mathematical expressions to LaTeX."""
    
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    # Check if Gemini API key is configured
    if not os.getenv("GEMINI_API_KEY"):
        logger.warning("Gemini API key not configured, using fallback patterns")
        # Return original text as fallback
        return ConvertLatexResponse(
            latex=request.text,
            original_text=request.text
        )
    
    try:
        # Use Gemini to convert natural language to LaTeX
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",  # Stable Gemini 1.5 Flash model
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,  # Low temperature for consistent mathematical output
                max_output_tokens=200,
            ),
            system_instruction=LATEX_CONVERSION_PROMPT
        )
        
        response = model.generate_content(request.text)
        
        latex_code = response.text.strip()
        
        if not latex_code or latex_code == request.text:
            latex_code = request.text
        
        logger.info(f"Converted '{request.text}' to '{latex_code}'")
        
        return ConvertLatexResponse(
            latex=latex_code,
            original_text=request.text
        )
        
    except genai.types.BlockedPromptException:
        logger.error("Gemini blocked the prompt")
        raise HTTPException(status_code=400, detail="Content was blocked by safety filters")
    
    except genai.types.StopCandidateException:
        logger.error("Gemini stopped generation")
        raise HTTPException(status_code=400, detail="Generation was stopped")
    
    except Exception as e:
        logger.error(f"Error converting LaTeX: {str(e)}")
        # Check for specific Gemini errors
        if "API_KEY_INVALID" in str(e):
            raise HTTPException(status_code=401, detail="Gemini API authentication failed")
        elif "RATE_LIMIT_EXCEEDED" in str(e):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        
        # Return original text as fallback
        return ConvertLatexResponse(
            latex=request.text,
            original_text=request.text
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
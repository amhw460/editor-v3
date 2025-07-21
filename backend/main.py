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
# Replace "YOUR_GEMINI_API_KEY_HERE" with your actual API key from https://aistudio.google.com/app/apikey
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")
genai.configure(api_key=GEMINI_API_KEY)

class ConvertLatexRequest(BaseModel):
    text: str

class ConvertLatexResponse(BaseModel):
    latex: str
    original_text: str

class ConvertTableRequest(BaseModel):
    prompt: str

class ConvertTableResponse(BaseModel):
    tableData: list
    originalPrompt: str

class ConvertLatexBlockRequest(BaseModel):
    englishText: str

class ConvertLatexBlockResponse(BaseModel):
    latexCode: str
    originalText: str

LATEX_CONVERSION_PROMPT = """You are a mathematical LaTeX code generator. Convert natural language mathematical descriptions into proper LaTeX syntax.

Examples:
- "integral" → "\\int f(x) \\, dx"
- "integral of x squared" → "\\int x^2 \\, dx"
- "definite integral from 0 to 1" → "\\int_0^1 f(x) \\, dx"
- "fraction x over y" → "\\frac{x}{y}"
- "square root of x" → "\\sqrt{x}"
- "x squared" → "x^2"
- "x to the power of n" → "x^n"
- "sum from i equals 1 to n" → "\\sum_{i=1}^n"
- "limit as x approaches infinity" → "\\lim_{x \\to \\infty}"
- "derivative of f with respect to x" → "\\frac{df}{dx}"
- "partial derivative" → "\\frac{\\partial f}{\\partial x}"
- "alpha beta gamma" → "\\alpha \\beta \\gamma"
- "infinity" → "\\infty"
- "theta" → "\\theta"
- "pi" → "\\pi"

Instructions:
1. Understand the mathematical concept being described
2. Convert it to proper LaTeX syntax
3. Use appropriate mathematical notation
4. Return ONLY the LaTeX code without $ symbols
5. If the input is already LaTeX, return it as-is
6. If the input is unclear, create a reasonable mathematical expression

Return only the LaTeX code, nothing else."""

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
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
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

LATEX_BLOCK_CONVERSION_PROMPT = """You are a LaTeX specialist that converts English mathematical and logical text into well-formatted LaTeX for academic documents.

Your task is to convert multi-line English text into LaTeX format suitable for display in mathematical documents.

Rules:
1. Convert mathematical expressions to proper LaTeX notation
2. Handle line breaks by creating align environment when needed
3. Each line should be a separate equation or statement
4. Use proper LaTeX symbols for:
   - "and" → \\wedge
   - "or" → \\vee  
   - "not" → \\neg
   - "implies" → \\rightarrow
   - "equivalent to" or "equiv" → \\equiv
   - "therefore" → \\therefore
   - "because" → \\because
   - "for all" → \\forall
   - "there exists" → \\exists
   - "infinity" → \\infty
   - "integral" → \\int
   - "sum" → \\sum
   - "product" → \\prod
   - "limit" → \\lim
   - "derivative" → \\frac{d}{dx}
   - "partial derivative" → \\frac{\\partial}{\\partial x}
   - "square root" → \\sqrt{}
   - "fraction" → \\frac{}{}
   - Common Greek letters: alpha, beta, gamma, etc. → \\alpha, \\beta, \\gamma

5. For multi-line content:
   - Use \\\\ to separate lines
   - Use & for alignment if needed
   - Wrap in align* environment structure if multiple aligned equations (no equation numbering)

6. For logical proofs:
   - Format step-by-step reasoning clearly
   - Use proper mathematical notation
   - Include justification in \\text{} when provided

Examples:
Input: "The derivative of x squared is 2x"
Output: \\frac{d}{dx}(x^2) = 2x

Input: "p and q implies r\ntherefore if p and q then r"  
Output: p \\wedge q \\rightarrow r \\\\ \\therefore (p \\wedge q) \\rightarrow r

Return ONLY the LaTeX code, no surrounding text or markdown."""

@app.post("/api/convert-latex-block", response_model=ConvertLatexBlockResponse)
async def convert_latex_block(request: ConvertLatexBlockRequest):
    """Convert English text to LaTeX for large mathematical blocks."""
    
    if not request.englishText.strip():
        raise HTTPException(status_code=400, detail="English text cannot be empty")
    
    # Check if Gemini API key is configured
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        logger.warning("Gemini API key not configured, using fallback LaTeX template")
        fallback_latex = f"\\text{{{request.englishText}}}"
        return ConvertLatexBlockResponse(
            latexCode=fallback_latex,
            originalText=request.englishText
        )
    
    try:
        # Parse dash-separated content to preserve annotations
        input_text = request.englishText.strip()
        
        # Check if the input contains dash-separated lines (math - annotation format)
        lines = input_text.split('\n')
        math_only_lines = []
        
        for line in lines:
            line = line.strip()
            if ' - ' in line:
                # Extract only the mathematical part (before the dash)
                # Use split with maxsplit=1 to handle multiple dashes correctly
                parts = line.split(' - ', 1)
                math_part = parts[0].strip()
                if math_part:
                    math_only_lines.append(math_part)
            else:
                # No annotation, use the whole line
                if line:
                    math_only_lines.append(line)
        
        # Join the mathematical parts for AI processing
        text_for_ai = '\n'.join(math_only_lines)
        
        # Use Gemini to convert English to LaTeX
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,  # Low temperature for consistent output
                max_output_tokens=800,  # More tokens for longer blocks
            ),
            system_instruction=LATEX_BLOCK_CONVERSION_PROMPT
        )
        
        response = model.generate_content(text_for_ai)
        latex_code = response.text.strip()
        
        # Clean up the response
        if latex_code.startswith('```latex'):
            latex_code = latex_code.replace('```latex', '').replace('```', '').strip()
        elif latex_code.startswith('```'):
            latex_code = latex_code.replace('```', '').strip()
        
        # Basic validation
        if not latex_code or len(latex_code.strip()) < 3:
            raise ValueError("Generated LaTeX is too short or empty")
        
        logger.info(f"Converted LaTeX block: '{text_for_ai[:50]}...' to '{latex_code[:100]}...'")
        
        return ConvertLatexBlockResponse(
            latexCode=latex_code,
            originalText=request.englishText  # Return the original with annotations
        )
        
    except genai.types.BlockedPromptException:
        logger.error("Gemini blocked the LaTeX block prompt")
        raise HTTPException(status_code=400, detail="Content was blocked by safety filters")
    
    except genai.types.StopCandidateException:
        logger.error("Gemini stopped LaTeX block generation")
        raise HTTPException(status_code=400, detail="Generation was stopped")
    
    except Exception as e:
        logger.error(f"Error converting LaTeX block: {str(e)}")
        
        # Check for specific Gemini errors
        if "API_KEY_INVALID" in str(e):
            raise HTTPException(status_code=401, detail="Gemini API authentication failed")
        elif "RATE_LIMIT_EXCEEDED" in str(e):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        
        # Fallback to a simple LaTeX representation
        fallback_latex = f"\\text{{{request.englishText}}}"
        logger.info(f"Using fallback LaTeX for: {request.englishText}")
        
        return ConvertLatexBlockResponse(
            latexCode=fallback_latex,
            originalText=request.englishText
        )

@app.post("/api/convert-table", response_model=ConvertTableResponse)
async def convert_table(request: ConvertTableRequest):
    """Convert natural language table descriptions to structured table data."""
    
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    # Check if Gemini API key is configured
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        logger.warning("Gemini API key not configured, using fallback table structure")
        # Return simple 3x3 table as fallback
        fallback_table = [
            {"cells": [{"content": "", "isHeader": True}, {"content": "", "isHeader": True}, {"content": "", "isHeader": True}]},
            {"cells": [{"content": "", "isHeader": False}, {"content": "", "isHeader": False}, {"content": "", "isHeader": False}]},
            {"cells": [{"content": "", "isHeader": False}, {"content": "", "isHeader": False}, {"content": "", "isHeader": False}]}
        ]
        return ConvertTableResponse(
            tableData=fallback_table,
            originalPrompt=request.prompt
        )
    
    try:
        # Use Gemini to convert natural language to table structure
        table_prompt = f"""
        Convert this table description to JSON format:
        "{request.prompt}"
        
        Return JSON with structure:
        {{
          "tableData": [
            {{"cells": [{{"content": "text", "isHeader": true}}]}}
          ]
        }}
        
        Important: 
        - If no specific content is mentioned for cells, use empty strings ("") for content
        - Only populate cells with actual data if explicitly mentioned in the description
        - First row should have isHeader: true, other rows isHeader: false
        - All rows must have the same number of cells
        """
        
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=500,
            ),
            system_instruction="You are a table structure generator. Return only valid JSON."
        )
        
        response = model.generate_content(table_prompt)
        
        try:
            # Try to parse the JSON response
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:-3]
            elif response_text.startswith('```'):
                response_text = response_text[3:-3]
            
            import json
            result = json.loads(response_text)
            table_data = result.get("tableData", [])
            
            # Validate table structure
            if not table_data or not isinstance(table_data, list):
                raise ValueError("Invalid table data structure")
            
            # Ensure all rows have the same number of cells
            if table_data:
                first_row_length = len(table_data[0].get("cells", []))
                for row in table_data:
                    if len(row.get("cells", [])) != first_row_length:
                        raise ValueError("Inconsistent row lengths")
            
            logger.info(f"Successfully converted table prompt: '{request.prompt}'")
            
            return ConvertTableResponse(
                tableData=table_data,
                originalPrompt=request.prompt
            )
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse table JSON: {e}")
            # Fallback to simple 3x3 table
            fallback_table = [
                {"cells": [{"content": "", "isHeader": True}, {"content": "", "isHeader": True}, {"content": "", "isHeader": True}]},
                {"cells": [{"content": "", "isHeader": False}, {"content": "", "isHeader": False}, {"content": "", "isHeader": False}]},
                {"cells": [{"content": "", "isHeader": False}, {"content": "", "isHeader": False}, {"content": "", "isHeader": False}]}
            ]
            return ConvertTableResponse(
                tableData=fallback_table,
                originalPrompt=request.prompt
            )
        
    except genai.types.BlockedPromptException:
        logger.error("Gemini blocked the table prompt")
        raise HTTPException(status_code=400, detail="Content was blocked by safety filters")
    
    except genai.types.StopCandidateException:
        logger.error("Gemini stopped table generation")
        raise HTTPException(status_code=400, detail="Generation was stopped")
    
    except Exception as e:
        logger.error(f"Error converting table: {e}")
        # Fallback to simple 3x3 table
        fallback_table = [
            {"cells": [{"content": "", "isHeader": True}, {"content": "", "isHeader": True}, {"content": "", "isHeader": True}]},
            {"cells": [{"content": "", "isHeader": False}, {"content": "", "isHeader": False}, {"content": "", "isHeader": False}]},
            {"cells": [{"content": "", "isHeader": False}, {"content": "", "isHeader": False}, {"content": "", "isHeader": False}]}
        ]
        return ConvertTableResponse(
            tableData=fallback_table,
            originalPrompt=request.prompt
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
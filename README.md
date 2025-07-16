# Text Editor

A collaborative text editor with natural language to LaTeX conversion. Type mathematical expressions in plain English within `$...$` and they'll be automatically converted to LaTeX and rendered inline.

## Features

### Rich Text Editing
- **Formatting**: Bold, italics, underline, strikethrough
- **Structure**: Headings (H1, H2, H3), paragraphs, lists (ordered, unordered)
- **Links**: Insert and edit hyperlinks
- **History**: Undo/redo functionality
- **Shortcuts**: Full keyboard shortcut support

### LaTeX Natural Language Parsing
- Type mathematical expressions in plain English inside `$...$`
- Automatic conversion to proper LaTeX syntax
- Real-time rendering with KaTeX
- Built-in patterns for common expressions
- Click to edit rendered expressions
- Hover tooltips showing original text

### Document Management
- Create, rename, and delete documents
- Auto-save functionality
- Local storage persistence
- Document list with timestamps
- Quick document switching

### Modern UI/UX
- Clean, Google Docs-inspired interface
- Responsive design
- Smooth animations and transitions
- Professional toolbar and sidebar

## Example Usage

Type mathematical expressions naturally:

```
Input: The integral of x squared from 0 to 1 is $integral of x squared from 0 to 1$
Output: The integral of x squared from 0 to 1 is ∫₀¹ x² dx
```

More examples:
- `$square root of 2$` → √2
- `$derivative of sin x$` → d/dx(sin x)
- `$sum from i equals 1 to n of i squared$` → Σᵢ₌₁ⁿ i²
- `$fraction 1 over 2$` → ½

## Tech Stack

### Frontend
- **React** - UI framework
- **TipTap** - Rich text editor
- **KaTeX** - LaTeX rendering
- **Styled Components** - CSS-in-JS styling
- **Lucide React** - Icons

### Backend
- **FastAPI** - Python web framework
- **Google Gemini API** - LaTeX conversion
- **Uvicorn** - ASGI server

## Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Google Gemini API key (optional)

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the backend directory:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

5. Start the backend server:
```bash
python main.py
```

The backend will run on `http://localhost:8000`

### Running Both Servers

For the best experience, run both frontend and backend simultaneously:

1. Terminal 1 (Frontend):
```bash
npm start
```

2. Terminal 2 (Backend):
```bash
cd backend
source venv/bin/activate
python main.py
```

## Built-in LaTeX Patterns

The editor includes built-in patterns for common mathematical expressions:

- **Integrals**: "integral of x from 0 to 1"
- **Derivatives**: "derivative of sin x"
- **Powers**: "x squared", "x cubed", "x to the power of 2"
- **Roots**: "square root of 2", "cube root of 8"
- **Fractions**: "1 over 2", "fraction a over b"
- **Trigonometry**: "sin x", "cos x", "tan x"
- **Greek letters**: "alpha", "beta", "pi", "theta"
- **Special symbols**: "infinity", "plus or minus"

## API Endpoints

### `POST /api/convert-latex`
Convert natural language to LaTeX.

**Request:**
```json
{
  "text": "integral of x squared from 0 to 1"
}
```

**Response:**
```json
{
  "latex": "\\int_0^1 x^2 \\, dx",
  "original_text": "integral of x squared from 0 to 1"
}
```

## Development

### Project Structure
```
text-editor/
├── src/
│   ├── components/
│   │   ├── DocumentManager.js
│   │   ├── TextEditor.js
│   │   └── Toolbar.js
│   ├── extensions/
│   │   ├── LaTeXExtension.js
│   │   └── LaTeXNodeView.js
│   ├── services/
│   │   └── latexService.js
│   └── App.js
├── backend/
│   ├── main.py
│   └── requirements.txt
└── package.json
```

### Key Components

- **TextEditor**: Main editor component using TipTap
- **LaTeXExtension**: Custom TipTap extension for LaTeX handling
- **LaTeXNodeView**: React component for rendering LaTeX nodes
- **DocumentManager**: Sidebar component for document operations
- **Toolbar**: Rich text formatting controls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Troubleshooting

### Common Issues

1. **LaTeX not rendering**: Check that KaTeX CSS is loaded in `public/index.html`
2. **LaTeX conversion not working**: Verify Gemini API key in backend `.env` file
3. **CORS errors**: Ensure backend is running on port 8000
4. **Build errors**: Clear node_modules and reinstall dependencies

### Support

For issues and questions, please open a GitHub issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Console error messages 
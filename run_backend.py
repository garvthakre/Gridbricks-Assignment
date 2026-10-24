import uvicorn
import sys
from pathlib import Path

if __name__ == "__main__":
    backend_dir = Path(__file__).parent / "backend"
    sys.path.insert(0, str(backend_dir))
    print("=" * 60)
    print("Starting UK Wind Day-Ahead Decision & Accuracy API")
    print("API Documentation: http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run("app.main:app", app_dir=str(backend_dir), host="127.0.0.1", port=8000, reload=False)

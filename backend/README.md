# CivicSync Backend

Backend foundation for the CivicSync duplicate-detection system.

## Setup Instructions

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows:
  ```bash
  venv\Scripts\activate
  ```
- Mac/Linux:
  ```bash
  source venv/bin/activate
  ```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the server:
```bash
uvicorn app.main:app --reload
```

The server will run on `http://localhost:8000`.
Health endpoint: `http://localhost:8000/api/health`

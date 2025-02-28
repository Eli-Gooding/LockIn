# LockIn Server

This is the server component of the LockIn app that handles screenshot storage and processing.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

Start the server with:
```bash
python main.py
```

The server will run on `http://localhost:8000`.

## API Endpoints

- `POST /upload-screenshot`: Upload a new screenshot
  - Request body:
    ```json
    {
      "timestamp": 1234567890,
      "image_data": "base64_encoded_image"
    }
    ```

- `GET /screenshots`: Get a list of all screenshots

## Directory Structure

- `screenshots/`: Directory where screenshot images are stored
- `screenshots.db`: SQLite database for screenshot metadata
- `main.py`: Main server application
- `requirements.txt`: Python dependencies 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import base64
from PIL import Image
import io
import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import aiosqlite
from typing import List, Optional
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Adjust this based on your Electron app's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_URL = "sqlite:///./screenshots.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Screenshot(Base):
    __tablename__ = "screenshots"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    image_path = Column(String)

Base.metadata.create_all(bind=engine)

class ScreenshotUpload(BaseModel):
    timestamp: int
    image_data: str

class RecentDescription(BaseModel):
    timestamp: int
    description: str

class ScreenshotAnalysisRequest(BaseModel):
    screenshot: str  # base64 encoded image
    currentGoal: Optional[str]
    recentDescriptions: List[RecentDescription]

class ScreenshotAnalysisResponse(BaseModel):
    imageDescription: str
    nudge: Optional[str]
    timestamp: int

def format_recent_activities(descriptions: List[RecentDescription]) -> str:
    if not descriptions:
        return "No recent activities."
    
    activities = []
    for desc in descriptions:
        time = datetime.fromtimestamp(desc.timestamp / 1000).strftime('%H:%M:%S')
        activities.append(f"At {time}: {desc.description}")
    
    return "\n".join(activities)

@app.post("/upload-screenshot")
async def upload_screenshot(screenshot: ScreenshotUpload):
    try:
        # Decode base64 image
        image_data = base64.b64decode(screenshot.image_data.split(',')[1])
        image = Image.open(io.BytesIO(image_data))
        
        # Create screenshots directory if it doesn't exist
        os.makedirs("screenshots", exist_ok=True)
        
        # Save image
        timestamp = datetime.fromtimestamp(screenshot.timestamp / 1000)
        filename = f"screenshots/screenshot_{timestamp.strftime('%Y%m%d_%H%M%S')}.png"
        image.save(filename)
        
        # Save to database
        db = SessionLocal()
        db_screenshot = Screenshot(timestamp=timestamp, image_path=filename)
        db.add(db_screenshot)
        db.commit()
        db.close()
        
        return {"status": "success", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/screenshots")
async def get_screenshots():
    db = SessionLocal()
    screenshots = db.query(Screenshot).all()
    db.close()
    return screenshots

@app.post("/analyze-screenshot")
async def analyze_screenshot(request: ScreenshotAnalysisRequest) -> ScreenshotAnalysisResponse:
    try:
        # First, get the image description using GPT-4V
        image_response = client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Describe what the user is doing in this screenshot. Focus on the active applications and tasks visible."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": request.screenshot,
                                "detail": "low"
                            }
                        }
                    ]
                }
            ],
            max_tokens=300
        )
        
        image_description = image_response.choices[0].message.content

        # If there's a current goal, analyze if the user needs a nudge
        nudge = None
        if request.currentGoal:
            recent_activities = format_recent_activities(request.recentDescriptions)
            
            nudge_response = client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a helpful AI assistant that helps users stay focused on their goals.
                        Analyze the user's recent activities and current screen to determine if they need a gentle nudge
                        to stay on track with their current goal. If they are on track, return null.
                        If they need a nudge, provide a brief, friendly message."""
                    },
                    {
                        "role": "user",
                        "content": f"""
                        Current Goal: {request.currentGoal}
                        
                        Recent Activities:
                        {recent_activities}
                        
                        Current Screen:
                        {image_description}
                        
                        Should I nudge the user? If yes, provide a brief message. If no, respond with 'null'.
                        """
                    }
                ],
                max_tokens=150
            )
            
            potential_nudge = nudge_response.choices[0].message.content.strip()
            if potential_nudge.lower() != "null":
                nudge = potential_nudge

        return ScreenshotAnalysisResponse(
            imageDescription=image_description,
            nudge=nudge,
            timestamp=int(datetime.now().timestamp() * 1000)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
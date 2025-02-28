from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import base64
from PIL import Image
import io
import os
import logging
from typing import List, Optional
from openai import OpenAI
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/analyze-screenshot")
async def analyze_screenshot(request: ScreenshotAnalysisRequest) -> ScreenshotAnalysisResponse:
    try:
        logger.info("Starting screenshot analysis")
        logger.info(f"Current goal: {request.currentGoal}")
        logger.info(f"Number of recent descriptions: {len(request.recentDescriptions)}")
        
        # Log the first few characters of the screenshot to verify we're receiving it
        screenshot_preview = request.screenshot[:100] + "..." if len(request.screenshot) > 100 else request.screenshot
        logger.info(f"Received screenshot data (preview): {screenshot_preview}")

        # First, get the image description using GPT-4V
        logger.info("Calling GPT-4V for image description...")
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
        logger.info(f"GPT-4V Response received: {image_description}")

        # If there's a current goal, analyze if the user needs a nudge
        nudge = None
        if request.currentGoal:
            logger.info(f"Analyzing current goal: {request.currentGoal}")
            recent_activities = format_recent_activities(request.recentDescriptions)
            logger.info(f"Recent activities formatted: {recent_activities}")
            
            logger.info("Calling GPT-4 for nudge analysis...")
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
                logger.info(f"Generated nudge: {nudge}")
            else:
                logger.info("No nudge needed")

        response = ScreenshotAnalysisResponse(
            imageDescription=image_description,
            nudge=nudge,
            timestamp=int(datetime.now().timestamp() * 1000)
        )
        logger.info("Analysis complete, sending response")
        return response

    except Exception as e:
        logger.error(f"Error analyzing screenshot: {str(e)}")
        logger.exception("Full error details:")  # This will log the full stack trace
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
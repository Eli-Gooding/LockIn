from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import base64
from PIL import Image
import io
import os
import logging
import signal
import asyncio
from typing import List, Optional
from openai import OpenAI
from openai import APITimeoutError, APIError, RateLimitError
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

# Initialize OpenAI client with timeout
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    timeout=30.0  # 30 second timeout for all API calls
)

# API call retry configuration
MAX_RETRIES = 2
RETRY_DELAY = 2  # seconds

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup graceful shutdown
def handle_sigterm(signum, frame):
    logger.info("Received SIGTERM. Shutting down gracefully...")
    # Perform any cleanup here if needed
    exit(0)

signal.signal(signal.SIGTERM, handle_sigterm)
signal.signal(signal.SIGINT, handle_sigterm)

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

async def make_openai_call_with_retry(call_func, *args, **kwargs):
    """Make an OpenAI API call with retry logic for timeouts and rate limits"""
    retries = 0
    while True:
        try:
            return call_func(*args, **kwargs)
        except APITimeoutError as e:
            logger.warning(f"OpenAI API timeout: {str(e)}")
            if retries >= MAX_RETRIES:
                logger.error(f"Max retries reached after timeout. Giving up.")
                raise
            retries += 1
            logger.info(f"Retrying after timeout ({retries}/{MAX_RETRIES})...")
            await asyncio.sleep(RETRY_DELAY)
        except RateLimitError as e:
            logger.warning(f"OpenAI API rate limit: {str(e)}")
            if retries >= MAX_RETRIES:
                logger.error(f"Max retries reached after rate limit. Giving up.")
                raise
            retries += 1
            # For rate limits, use exponential backoff
            backoff = RETRY_DELAY * (2 ** retries)
            logger.info(f"Retrying after rate limit in {backoff}s ({retries}/{MAX_RETRIES})...")
            await asyncio.sleep(backoff)
        except APIError as e:
            logger.warning(f"OpenAI API error: {str(e)}")
            if retries >= MAX_RETRIES:
                logger.error(f"Max retries reached after API error. Giving up.")
                raise
            retries += 1
            logger.info(f"Retrying after API error ({retries}/{MAX_RETRIES})...")
            await asyncio.sleep(RETRY_DELAY)

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
        
        # Ensure the base64 string is properly formatted as a data URL
        if not request.screenshot.startswith('data:image/'):
            image_url = f"data:image/png;base64,{request.screenshot}"
        else:
            image_url = request.screenshot
        
        try:
            # Use the retry wrapper for the API call
            image_response = await make_openai_call_with_retry(
                client.chat.completions.create,
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Describe what the user is doing in this screenshot. Focus on the active applications and tasks visible. Ignore the app LockedIn (to-do list)"
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_url,
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
        except Exception as e:
            logger.error(f"Error getting image description: {str(e)}")
            # Provide a fallback description rather than failing completely
            image_description = "Unable to analyze the screenshot due to a technical issue."

        # If there's a current goal, analyze if the user needs a nudge
        nudge = None
        if request.currentGoal:
            logger.info(f"Analyzing current goal: {request.currentGoal}")
            recent_activities = format_recent_activities(request.recentDescriptions)
            logger.info(f"Recent activities formatted: {recent_activities}")
            
            try:
                logger.info("Calling GPT-4 for nudge analysis...")
                # Use the retry wrapper for the API call
                nudge_response = await make_openai_call_with_retry(
                    client.chat.completions.create,
                    model="gpt-4-turbo-preview",
                    messages=[
                        {
                            "role": "system",
                            "content": """You are a helpful AI assistant that helps users stay focused on their goals.
                            Analyze the user's recent activities and current screen to determine if they need a gentle nudge
                            to stay on track with their current goal. 
                            If they are on track, return null.
                            If they need a nudge, provide a brief, message.
                            For example, if the user is on X when they should be writing their paper, say something like:
                            "Is this the right time to check X?" or "Get off X and write your paper."
                            You can be blunt and direct. You should just provide the nudge message, nothing more. No "Yes I should nudge them" or anything like that."""
                        },
                        {
                            "role": "user",
                            "content": f"""
                            Current Goal: {request.currentGoal}
                            
                            Recent Activities:
                            {recent_activities}
                            
                            Current Screen:
                            {image_description}
                            
                            Should I nudge the user? If yes, respond with the nudge message. If no, respond with 'null'.
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
            except Exception as e:
                logger.error(f"Error generating nudge: {str(e)}")
                # Continue without a nudge rather than failing completely

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
    
    # Configure uvicorn with timeout settings
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        timeout_keep_alive=120,  # Increase keep-alive timeout
        log_level="info"
    ) 
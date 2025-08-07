"""MapLearner Backend
A Flask app that evaluates map drawings asynchronously using external APIs.
Exposes a single `/evaluate` endpoint that accepts a PNG image (form-data, key="image")
and returns a JSON object with an evaluation.
"""
from __future__ import annotations

import asyncio
import io
import logging
import os
from typing import Any, List

from dotenv import load_dotenv
from flask import Flask, request
from flask_cors import CORS
from flask_executor import Executor
from PIL import Image, UnidentifiedImageError
from fluent_llm import llm
import pydantic

# Load environment variables from .env file
load_dotenv()


# Configure very basic logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
)

app = Flask(__name__)

# Enable CORS for all routes to allow web frontend access
CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:3000'])

# Initialize the executor for background tasks
executor = Executor(app)

# Configuration
app.config['EXECUTOR_MAX_WORKERS'] = 4
app.config['EXECUTOR_TYPE'] = 'thread'

# External API configuration (example - replace with actual API details)
EVALUATION_API_URL = os.getenv('EVALUATION_API_URL', 'https://api.example.com/evaluate')
API_TIMEOUT = int(os.getenv('API_TIMEOUT', '30'))  # seconds

def load_prompt(prompt_name: str) -> str:
    with open(f"prompts/{prompt_name}.prompt", "r", encoding="utf-8") as f:
        return f.read()

class Evaluation(pydantic.BaseModel):
    score: int
    feedback: List[str]

async def evaluate_drawing_async(image_data: bytes) -> Evaluation:
    """Asynchronously evaluate the drawing using an external API.

    Args:
        image_data: Binary image data to evaluate

    Returns:
        Dict containing evaluation results
    """
    # evaluation = await llm\
    #     .agent(load_prompt('evaluator'))\
    #     .context("Here's the reference map:")\
    #     .image(pathlib.Path('data/germany_bordering.png'))\
    #     .context("Here's the student's attempt:")\
    #     .image(image_data)\
    #     .request("Hand out a score and advice on how to improve.")\
    #     .prompt_for_type(Evaluation)

    with open('last_image.png', 'wb') as f:
        f.write(image_data)

    evaluation = await llm\
        .agent(load_prompt('simple'))\
        .request("What now follows is the student's attempt to evaluate:")\
        .image(image_data)\
        .prompt_for_type(Evaluation)

        #.agent("Here's the reference drawing, which I will soon refer to in the example response:")\
        #.image('data/example_drawing_france.png')\

    # return {
    #     "evaluation": "Great job! Your map shows good understanding of geographical features.",
    #     "confidence": 0.85,
    #     "feedback": ["Well-drawn coastlines", "Good use of labels", "Consider adding more detail"]
    # }
    print(evaluation)
    return evaluation


@app.route("/evaluate", methods=["POST"])
def evaluate() -> tuple[dict[str, Any], int]:
    """Receive a PNG drawing, process it asynchronously, and return an evaluation.

    This endpoint accepts an image file, validates it, and processes it asynchronously
    using an external API. The request will block until the evaluation is complete.

    Expected request format (multipart/form-data):
    - "image": the PNG file to evaluate.

    Returns:
        JSON response with evaluation results or error message
    """
    # Ensure the client actually sent a file
    if "image" not in request.files:
        logging.warning("Request without 'image' file part")
        return {"error": "No image part in the request"}, 400

    file_storage = request.files["image"]

    if not file_storage or file_storage.filename == "":
        logging.warning("No file selected or empty filename provided")
        return {"error": "No file selected"}, 400

    try:
        # Read and validate the image
        image_bytes = file_storage.read()
        if not image_bytes:
            logging.warning("Empty file received")
            return {"error": "Empty file"}, 400

        img = Image.open(io.BytesIO(image_bytes))
        img.verify()  # type: ignore[attr-defined]

        # Convert to RGB if needed (for JPEG compatibility)
        # if img.mode != 'RGB':
        #     img = img.convert('RGB')

        # Reset file pointer after verification
        file_storage.seek(0)

    except (UnidentifiedImageError, OSError) as exc:
        logging.exception("Invalid image uploaded: %s", exc)
        return {"error": "Uploaded file is not a valid image"}, 400

    try:
        logging.info("Processing image (%s bytes) asynchronously...", len(image_bytes))

        # Run the async evaluation function in the executor
        future = executor.submit(
            asyncio.run,
            evaluate_drawing_async(image_bytes)
        )

        # Wait for the result with timeout
        result = future.result(timeout=API_TIMEOUT + 5)  # Add some buffer time

        # Log success and return the result
        logging.info("Successfully processed image")
        # Convert Pydantic model to dict before returning
        return result.model_dump(), 200

    except asyncio.TimeoutError:
        logging.error("Evaluation timed out after %s seconds", API_TIMEOUT)
        return {"error": "Evaluation timed out"}, 504


@app.get("/health")
def health() -> dict[str, str]:
    """Simple health-check endpoint suitable for container orchestration."""
    return {"status": "ok"}


if __name__ == "__main__":
    # Allow overriding the host/port via environment variables for flexibility
    import os

    host = os.getenv("MAPLEARNER_HOST", "0.0.0.0")
    port = int(os.getenv("MAPLEARNER_PORT", "8000"))
    debug = os.getenv("MAPLEARNER_DEBUG", "false").lower() == "true"

    logging.info("Starting MapLearner backend on %s:%s (debug=%s)", host, port, debug)
    app.run(host=host, port=port, debug=debug)

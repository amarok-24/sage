# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import contextlib
import os
from collections.abc import AsyncIterator

import google.auth
from a2a.server.tasks import InMemoryTaskStore
from dotenv import load_dotenv
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner
from google.cloud import logging as google_cloud_logging

from app.app_utils import services
from app.app_utils.a2a import attach_a2a_routes
from app.app_utils.telemetry import setup_telemetry
from app.app_utils.typing import Feedback

load_dotenv()
setup_telemetry()
_, project_id = google.auth.default()
logging_client = google_cloud_logging.Client()
logger = logging_client.logger(__name__)
allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(",") if os.getenv("ALLOW_ORIGINS") else None
)

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    from app.agent import app as adk_app
    from app.agent import root_agent

    runner = Runner(
        app=adk_app,
        session_service=services.get_session_service(),
        artifact_service=services.get_artifact_service(),
        auto_create_session=True,
    )
    app.state.runner = runner
    app.state.agent_app_name = adk_app.name
    await attach_a2a_routes(
        app,
        agent=root_agent,
        runner=runner,
        task_store=InMemoryTaskStore(),
        rpc_path=f"/a2a/{adk_app.name}",
    )
    yield


app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    artifact_service_uri=services.ARTIFACT_SERVICE_URI,
    allow_origins=allow_origins,
    session_service_uri=services.SESSION_SERVICE_URI,
    otel_to_cloud=False,
    lifespan=lifespan,
)
app.title = "agent"
app.description = "API for interacting with the Agent agent"


@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback.

    Args:
        feedback: The feedback data to log

    Returns:
        Success message
    """
    logger.log_struct(feedback.model_dump(), severity="INFO")
    return {"status": "success"}


from fastapi import Request, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from google.genai import types

class BrainDumpRequest(BaseModel):
    user_id: str
    text:    str

@app.post("/process")
async def process_braindump(request: Request, payload: BrainDumpRequest):
    runner: Runner = request.app.state.runner
    session_service = runner.session_service
    
    session = await session_service.create_session(
        app_name=request.app.state.agent_app_name,
        user_id=payload.user_id,
    )
    
    user_message = types.Content(
        role="user",
        parts=[types.Part.from_text(text=payload.text)]
    )
    
    # Run the workflow and capture the router event
    router_output_str = None
    async for event in runner.run_async(
        session_id=session.id,
        user_id=payload.user_id,
        new_message=user_message,
    ):
        if event.author == "router" and event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    router_output_str = part.text
        
    if not router_output_str:
        raise HTTPException(status_code=500, detail="Agent produced no parsed output")
        
    import json
    try:
        router_output = json.loads(router_output_str)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse agent JSON output: {e}")
        
    response_data = {
        "nutrition": router_output.get("nutrition") or [],
        "expenses": router_output.get("expenses") or [],
        "time_logs": router_output.get("time_logs") or [],
        "habits_completed": router_output.get("habits") or [],
        "sleep": router_output.get("sleep"),
        "somatic_logs": router_output.get("somatic_logs") or [],
        "journal": router_output.get("journal"),
        "raw_text": payload.text,
        "parsed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    }
    return response_data


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

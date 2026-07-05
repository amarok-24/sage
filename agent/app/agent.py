import os
import google.auth
from dotenv import load_dotenv
from google.adk.workflow import Workflow, JoinNode, FunctionNode
from google.adk.agents import LlmAgent
from google.adk.apps import App
from google.genai import types
from google.adk.events.event import Event
from app.schemas import BodhiAgentOutput

load_dotenv()

if not os.environ.get("GOOGLE_CLOUD_PROJECT"):
    try:
        _, project_id = google.auth.default()
        if project_id:
            os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
    except Exception:
        pass

if not os.environ.get("GOOGLE_CLOUD_LOCATION"):
    os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"

if os.environ.get("GEMINI_API_KEY"):
    os.environ.pop("GOOGLE_GENAI_USE_VERTEXAI", None)
else:
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

# 1. LLM Router Node
router_agent = LlmAgent(
    name="router",
    model="gemini-flash-latest",
    instruction="""You are the Bodhi Universal Input Router.
The user will provide an unstructured daily log. Your task is to extract and route the information into the appropriate structured schemas (Nutrition, Expenses, Time, Habits, Sleep, Somatic, Journal). 
Do not make up information. Only fill in the fields if they are explicitly mentioned or strongly implied.
""",
    output_schema=BodhiAgentOutput,
)

from google.adk.workflow import Workflow, JoinNode, FunctionNode

# 2. Domain Processing Nodes (Mock DB Writers)
def process_nutrition_impl(node_input: dict) -> str | None:
    data = node_input.get("nutrition")
    if not data:
        return None
    return f"🍔 Logged Nutrition: {len(data.get('food_items', []))} items, {data.get('total_nutrition_summary', {}).get('total_calories')} total calories."

def process_expense_impl(node_input: dict) -> str | None:
    data = node_input.get("expenses")
    if not data:
        return None
    total = sum(item.get("amount", 0) for item in data)
    return f"💰 Logged Expenses: {len(data)} transactions, Total ${total}."

def process_time_impl(node_input: dict) -> str | None:
    data = node_input.get("time_logs")
    if not data:
        return None
    total = sum(item.get("duration_minutes", 0) for item in data)
    return f"⏱️ Logged Time: {len(data)} activities, {total} mins total."

def process_habit_impl(node_input: dict) -> str | None:
    data = node_input.get("habits")
    if not data:
        return None
    names = [h.get("habit_name") for h in data]
    return f"✅ Logged Habits: {', '.join(names)}."

def process_sleep_impl(node_input: dict) -> str | None:
    data = node_input.get("sleep")
    if not data:
        return None
    return f"🛏️ Logged Sleep: {data.get('duration_hours')} hours, {data.get('quality')} quality."

def process_somatic_impl(node_input: dict) -> str | None:
    data = node_input.get("somatic_logs")
    if not data:
        return None
    symptoms = [s.get("symptom") for s in data]
    return f"🩺 Logged Somatic: {len(data)} symptoms ({', '.join(symptoms)})."

def process_journal_impl(node_input: dict) -> str | None:
    data = node_input.get("journal")
    if not data:
        return None
    return f"📝 Logged Journal: Mood {data.get('mood_score')}/10. Tags: {', '.join(data.get('tags', []))}."

process_nutrition = FunctionNode(func=process_nutrition_impl, name="process_nutrition")
process_expense = FunctionNode(func=process_expense_impl, name="process_expense")
process_time = FunctionNode(func=process_time_impl, name="process_time")
process_habit = FunctionNode(func=process_habit_impl, name="process_habit")
process_sleep = FunctionNode(func=process_sleep_impl, name="process_sleep")
process_somatic = FunctionNode(func=process_somatic_impl, name="process_somatic")
process_journal = FunctionNode(func=process_journal_impl, name="process_journal")

# 3. Join & Combiner
join_node = JoinNode(name="merge")

def combine_results_impl(node_input: dict) -> Event:
    results = []
    for node_name, output in node_input.items():
        if output:
            results.append(output)
            
    if not results:
        final_output = "No actionable data identified in the input."
    else:
        summary_text = "\n".join(results)
        final_output = f"**Processed Input Summary:**\n\n{summary_text}"
    
    return Event(
        content=types.Content(role="model", parts=[types.Part.from_text(text=final_output)]),
        output=final_output
    )
combine_results = FunctionNode(func=combine_results_impl, name="combine_results")

# 4. Graph Definition
root_agent = Workflow(
    name="root_agent",
    edges=[
        ('START', router_agent),
        # Fan-out to all processors unconditionally
        (router_agent, (
            process_nutrition, 
            process_expense, 
            process_time, 
            process_habit, 
            process_sleep, 
            process_somatic, 
            process_journal
        )),
        # Fan-in to join node
        ((
            process_nutrition, 
            process_expense, 
            process_time, 
            process_habit, 
            process_sleep, 
            process_somatic, 
            process_journal
        ), join_node),
        (join_node, combine_results)
    ]
)

app = App(
    root_agent=root_agent,
    name="app",
)

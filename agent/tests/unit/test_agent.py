import pytest
from google.adk.events.event import Event
from google.genai import types
from app.agent import (
    process_nutrition_impl, 
    process_expense_impl, 
    process_time_impl,
    process_habit_impl,
    process_sleep_impl,
    process_somatic_impl,
    process_journal_impl,
    combine_results_impl
)

def test_process_nutrition():
    input_data = {
        "nutrition": {
            "food_items": [{"name": "Paneer Tikka", "quantity": "1 plate", "calories": 400, "protein_g": 20, "carbs_g": 10, "fat_g": 30}],
            "total_nutrition_summary": {"total_calories": 400, "total_protein_g": 20, "total_carbs_g": 10, "total_fat_g": 30}
        }
    }
    result = process_nutrition_impl(node_input=input_data)
    assert result == "🍔 Logged Nutrition: 1 items, 400 total calories."
    assert process_nutrition_impl(node_input={"expenses": []}) is None

def test_process_expense():
    input_data = {
        "expenses": [
            {"amount": 15.0, "currency": "USD", "category": "Food", "merchant_inferred": "Restaurant"}
        ]
    }
    result = process_expense_impl(node_input=input_data)
    assert result == "💰 Logged Expenses: 1 transactions, Total $15.0."

def test_process_time():
    input_data = {
        "time_logs": [
            {"duration_minutes": 60, "activity_category": "study", "description": "reading"}
        ]
    }
    result = process_time_impl(node_input=input_data)
    assert result == "⏱️ Logged Time: 1 activities, 60 mins total."

def test_process_habit():
    input_data = {
        "habits": [
            {"habit_name": "meditation", "completed": True}
        ]
    }
    result = process_habit_impl(node_input=input_data)
    assert result == "✅ Logged Habits: meditation."

def test_process_sleep():
    input_data = {
        "sleep": {"duration_hours": 8.0, "quality": "Good"}
    }
    result = process_sleep_impl(node_input=input_data)
    assert result == "🛏️ Logged Sleep: 8.0 hours, Good quality."

def test_process_somatic():
    input_data = {
        "somatic_logs": [
            {"symptom": "knee pain", "severity": 4, "body_area": "knee"}
        ]
    }
    result = process_somatic_impl(node_input=input_data)
    assert result == "🩺 Logged Somatic: 1 symptoms (knee pain)."

def test_process_journal():
    input_data = {
        "journal": {"mood_score": 9, "tags": ["productive", "happy"]}
    }
    result = process_journal_impl(node_input=input_data)
    assert result == "📝 Logged Journal: Mood 9/10. Tags: productive, happy."

def test_combine_results():
    input_data = {
        "process_nutrition": "🍔 Logged Nutrition",
        "process_expense": None,
        "process_time": "⏱️ Logged Time"
    }
    event = combine_results_impl(node_input=input_data)
    assert isinstance(event, Event)
    assert "🍔 Logged Nutrition" in event.output
    assert "⏱️ Logged Time" in event.output
    assert "💰" not in event.output

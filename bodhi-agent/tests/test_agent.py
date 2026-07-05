import pytest
from google.adk.events.event import Event
from google.genai import types
from app.agent import process_nutrition_impl, process_expense_impl, combine_results_impl

def test_process_nutrition():
    # Nutrition present
    input_data = {
        "nutrition": {
            "food_items": [{"name": "Paneer Tikka", "quantity": "1 plate", "calories": 400, "protein_g": 20, "carbs_g": 10, "fat_g": 30}],
            "total_nutrition_summary": {"total_calories": 400, "total_protein_g": 20, "total_carbs_g": 10, "total_fat_g": 30}
        }
    }
    result = process_nutrition_impl(node_input=input_data)
    assert result == "🍔 Logged Nutrition: 1 items, 400 total calories."
    
    # Nutrition absent
    assert process_nutrition_impl(node_input={"expenses": []}) is None

def test_process_expense():
    input_data = {
        "expenses": [
            {"amount": 15.0, "currency": "USD", "category": "Food", "merchant_inferred": "Restaurant"}
        ]
    }
    result = process_expense_impl(node_input=input_data)
    assert result == "💰 Logged Expenses: 1 transactions, Total $15.0."
    

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

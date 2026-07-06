from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime

class FoodItem(BaseModel):
    name: str
    quantity: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float

class NutritionSummary(BaseModel):
    total_calories: int
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float

class NutritionData(BaseModel):
    food_items: List[FoodItem]
    total_nutrition_summary: NutritionSummary

class ExpenseData(BaseModel):
    amount: float
    currency: str = "USD"
    category: str
    merchant_inferred: str

class TimeData(BaseModel):
    duration_minutes: int
    activity_category: str
    description: str

class HabitData(BaseModel):
    habit_name: str
    completed: bool = True

class SleepQuality(str, Enum):
    deep = "deep"
    moderate = "moderate"
    light = "light"
    poor = "poor"

class SleepData(BaseModel):
    bedtime: datetime
    wake_time: datetime
    duration_hours: float
    quality: SleepQuality
    notes: Optional[str] = None

class SomaticData(BaseModel):
    symptom: str
    severity: int = Field(ge=1, le=10)
    body_area: Optional[str] = None
    remedy_taken: Optional[str] = None
    duration_minutes: Optional[int] = None
    resolved: bool

class JournalData(BaseModel):
    mood_score: int = Field(ge=1, le=10)
    tags: List[str]
    summary_snippet: str

class SageAgentOutput(BaseModel):
    """The overarching schema containing all possible domain data for a given journal entry."""
    nutrition: Optional[NutritionData] = None
    expenses: Optional[List[ExpenseData]] = None
    time_logs: Optional[List[TimeData]] = None
    habits: Optional[List[HabitData]] = None
    sleep: Optional[SleepData] = None
    somatic_logs: Optional[List[SomaticData]] = None
    journal: Optional[JournalData] = None

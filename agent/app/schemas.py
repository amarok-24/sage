from typing import List, Literal, Optional
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
    confidence: Literal['high', 'medium', 'low']

class NutritionData(BaseModel):
    food_items: List[FoodItem]
    total_calories: int
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    meal_type: Literal['breakfast', 'lunch', 'dinner', 'snack', 'unspecified']

class ExpenseData(BaseModel):
    amount: float
    currency: str = "USD"
    category: Literal[
        'food', 'groceries', 'transport', 'utility', 'entertainment',
        'health', 'education', 'shopping', 'investment', 'savings',
        'rent', 'subscription', 'gift', 'other',
    ]
    merchant_inferred: str
    description: str

class TimeData(BaseModel):
    duration_minutes: int
    activity_category: Literal[
        'deep-work', 'study', 'exercise', 'commute', 'meeting',
        'creative', 'chores', 'social', 'rest', 'other',
    ]
    description: str

class HabitData(BaseModel):
    habit_name: str
    matched_phrase: str
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
    nutrition: Optional[List[NutritionData]] = None
    expenses: Optional[List[ExpenseData]] = None
    time_logs: Optional[List[TimeData]] = None
    habits: Optional[List[HabitData]] = None
    sleep: Optional[SleepData] = None
    somatic_logs: Optional[List[SomaticData]] = None
    journal: Optional[JournalData] = None


# --- Async specialist output schemas (Sage_Technical_Design_Document.md 4.6) ---

class JournalMetadata(BaseModel):
    mood_score: int = Field(ge=1, le=10)
    tags: List[str]
    summary_snippet: str

class SleepAnalysis(BaseModel):
    consistency_score: int = Field(ge=1, le=10)
    circadian_alignment: Literal['aligned', 'slightly_shifted', 'misaligned']
    recommendation: str

class SomaticCorrelation(BaseModel):
    potential_triggers: List[str]
    confidence: Literal['high', 'medium', 'low']
    suggestion: str

class ExpenseAnalysis(BaseModel):
    anomaly_flag: bool
    subscription_creep: str
    insight: str

class TimeAnalysis(BaseModel):
    deep_work_ratio: float
    time_drain: str
    optimization_tip: str

class WeeklyInsight(BaseModel):
    top_insight: str
    supporting_data: List[str]
    growth_area: str
    celebration: str

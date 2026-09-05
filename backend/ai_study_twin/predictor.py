"""
AI Study Twin - Predicts exam performance and provides improvement scenarios
Usage: from ai_study_twin.predictor import predict_exam_score, analyze_risk_subjects, simulate_improvement
"""

import json
import re
from typing import Dict, List, Any

def safe_json_parse(text: str):
    """
    Safely parses JSON even if the model returns extra text
    """
    if not text:
        raise ValueError("Empty response from model")

    # Try direct JSON load
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Extract JSON block from text
    match = re.search(r"\{.*\}|\[.*\]", text, re.DOTALL)
    if match:
        return json.loads(match.group())

    raise ValueError(f"Invalid JSON returned by model:\n{text}")


def predict_exam_score(student_data: Dict[str, Any], bedrock_client) -> Dict[str, Any]:
    """
    Predicts exam score based on current performance and study patterns
    
    Args:
        student_data: {
            'current_marks': {'math': 65, 'science': 72, 'english': 80},
            'study_time_hours': {'math': 2, 'science': 1.5, 'english': 1},
            'attendance_percent': 85,
            'assignment_completion': 90
        }
        bedrock_client: AWS Bedrock client instance
    
    Returns:
        {
            'predicted_score': 75.5,
            'confidence': 'high',
            'prediction_range': {'min': 72, 'max': 79}
        }
    """
    prompt = f"""You are an AI academic performance predictor. Analyze this student data and predict their likely exam score.

Student Performance Data:
- Current Marks: {json.dumps(student_data.get('current_marks', {}))}
- Daily Study Time (hours): {json.dumps(student_data.get('study_time_hours', {}))}
- Attendance: {student_data.get('attendance_percent', 0)}%
- Assignment Completion: {student_data.get('assignment_completion', 0)}%

Provide prediction in this JSON format:
{{
    "predicted_score": <number 0-100>,
    "confidence": "<high/medium/low>",
    "prediction_range": {{"min": <number>, "max": <number>}},
    "reasoning": "<brief explanation>"
}}

Only return valid JSON, no other text."""

    response = bedrock_client.converse(
        modelId="google.gemma-3-12b-it",
        messages=[{"role": "user", "content": [{"text": prompt}]}]
    )
    
    result_text = response['output']['message']['content'][0]['text']
    return safe_json_parse(result_text)


def analyze_risk_subjects(student_data: Dict[str, Any], bedrock_client) -> List[Dict[str, Any]]:
    """
    Identifies subjects at risk and provides actionable insights
    
    Args:
        student_data: {
            'current_marks': {'math': 45, 'science': 72, 'english': 55},
            'study_time_hours': {'math': 1, 'science': 2, 'english': 1},
            'weak_topics': {'math': ['algebra', 'geometry'], 'english': ['grammar']}
        }
        bedrock_client: AWS Bedrock client instance
    
    Returns:
        [
            {
                'subject': 'math',
                'risk_level': 'high',
                'current_score': 45,
                'weak_areas': ['algebra', 'geometry'],
                'recommended_action': 'Increase study time to 3 hours daily'
            }
        ]
    """
    prompt = f"""You are an AI academic advisor. Analyze this student's performance and identify subjects at risk.

Student Data:
- Current Marks: {json.dumps(student_data.get('current_marks', {}))}
- Study Time per Subject: {json.dumps(student_data.get('study_time_hours', {}))}
- Weak Topics: {json.dumps(student_data.get('weak_topics', {}))}

Identify risk subjects (score < 60 or declining performance). Return JSON array:
[
    {{
        "subject": "<subject_name>",
        "risk_level": "<high/medium/low>",
        "current_score": <number>,
        "weak_areas": ["<topic1>", "<topic2>"],
        "recommended_action": "<specific actionable advice>"
    }}
]

Only return valid JSON array, no other text."""

    response = bedrock_client.converse(
        modelId="google.gemma-3-12b-it",
        messages=[{"role": "user", "content": [{"text": prompt}]}]
    )
    
    result_text = response['output']['message']['content'][0]['text']
    return safe_json_parse(result_text)


def simulate_improvement(student_data: Dict[str, Any], improvement_scenario: Dict[str, Any], bedrock_client) -> Dict[str, Any]:
    """
    Simulates what happens if student increases study effort
    
    Args:
        student_data: {
            'current_marks': {'math': 65, 'science': 72},
            'study_time_hours': {'math': 2, 'science': 1.5}
        }
        improvement_scenario: {
            'increased_study_time': {'math': 3, 'science': 2.5},
            'focus_on_topics': ['algebra', 'physics']
        }
        bedrock_client: AWS Bedrock client instance
    
    Returns:
        {
            'projected_scores': {'math': 78, 'science': 82},
            'improvement_percent': {'math': 20, 'science': 14},
            'timeline': '4-6 weeks',
            'success_probability': 'high'
        }
    """
    prompt = f"""You are an AI study planner. Simulate the impact of increased study effort on exam scores.

Current Performance:
- Marks: {json.dumps(student_data.get('current_marks', {}))}
- Study Time: {json.dumps(student_data.get('study_time_hours', {}))}

Improvement Plan:
- New Study Time: {json.dumps(improvement_scenario.get('increased_study_time', {}))}
- Focus Topics: {json.dumps(improvement_scenario.get('focus_on_topics', []))}

Predict the outcome in this JSON format:
{{
    "projected_scores": {{"subject": <new_score>}},
    "improvement_percent": {{"subject": <percent_increase>}},
    "timeline": "<estimated weeks>",
    "success_probability": "<high/medium/low>",
    "key_factors": ["<factor1>", "<factor2>"]
}}

Only return valid JSON, no other text."""

    response = bedrock_client.converse(
        modelId="google.gemma-3-12b-it",
        messages=[{"role": "user", "content": [{"text": prompt}]}]
    )
    
    result_text = response['output']['message']['content'][0]['text']
    return safe_json_parse(result_text)

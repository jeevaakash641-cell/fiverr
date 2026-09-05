"""
Focus Score Meter - Analyzes student focus and attention patterns
Usage: from focus_ai.focus_meter import calculate_focus_score, get_focus_insights
"""

import json
from typing import Dict, List, Any
from datetime import datetime


def calculate_focus_score(activity_data: Dict[str, Any], bedrock_client) -> Dict[str, Any]:
    """
    Calculates focus score based on student's study behavior
    
    Args:
        activity_data: {
            'session_duration_minutes': 45,
            'tab_switches': 12,
            'idle_time_minutes': 8,
            'questions_attempted': 15,
            'questions_skipped': 5,
            'pause_count': 3
        }
        bedrock_client: AWS Bedrock client instance
    
    Returns:
        {
            'focus_score': 72,
            'focus_status': 'Moderate Focus',
            'status_color': 'yellow',
            'distractions_detected': 12
        }
    """
    prompt = f"""You are an AI focus analyzer. Evaluate student's focus level during study session.

Activity Metrics:
- Session Duration: {activity_data.get('session_duration_minutes', 0)} minutes
- Tab Switches: {activity_data.get('tab_switches', 0)}
- Idle Time: {activity_data.get('idle_time_minutes', 0)} minutes
- Questions Attempted: {activity_data.get('questions_attempted', 0)}
- Questions Skipped: {activity_data.get('questions_skipped', 0)}
- Pause Count: {activity_data.get('pause_count', 0)}

Calculate focus score (0-100) and classify:
- 80-100: Deep Focus (green)
- 50-79: Moderate Focus (yellow)
- 30-49: Distracted (orange)
- 0-29: Highly Distracted (red)

Return JSON:
{{
    "focus_score": <number 0-100>,
    "focus_status": "<Deep Focus/Moderate Focus/Distracted/Highly Distracted>",
    "status_color": "<green/yellow/orange/red>",
    "distractions_detected": <number>,
    "analysis": "<brief explanation>"
}}

Only return valid JSON, no other text."""

    response = bedrock_client.converse(
        modelId="google.gemma-3-12b-it",
        messages=[{"role": "user", "content": [{"text": prompt}]}]
    )
    
    result_text = response['output']['message']['content'][0]['text']
    return json.loads(result_text)


def get_focus_insights(activity_history: List[Dict[str, Any]], bedrock_client) -> Dict[str, Any]:
    """
    Provides insights and recommendations based on focus patterns over time
    
    Args:
        activity_history: [
            {
                'date': '2024-03-01',
                'focus_score': 75,
                'session_duration': 45,
                'tab_switches': 8
            },
            ...
        ]
        bedrock_client: AWS Bedrock client instance
    
    Returns:
        {
            'average_focus': 68,
            'trend': 'improving',
            'best_time': 'morning',
            'recommendations': ['Reduce tab switches', 'Take regular breaks']
        }
    """
    prompt = f"""You are an AI productivity coach. Analyze student's focus patterns over time.

Focus History (last sessions):
{json.dumps(activity_history, indent=2)}

Analyze patterns and provide insights in JSON format:
{{
    "average_focus": <number>,
    "trend": "<improving/stable/declining>",
    "best_time": "<morning/afternoon/evening>",
    "peak_focus_score": <number>,
    "common_distractions": ["<distraction1>", "<distraction2>"],
    "recommendations": ["<tip1>", "<tip2>", "<tip3>"]
}}

Only return valid JSON, no other text."""

    response = bedrock_client.converse(
        modelId="google.gemma-3-12b-it",
        messages=[{"role": "user", "content": [{"text": prompt}]}]
    )
    
    result_text = response['output']['message']['content'][0]['text']
    return json.loads(result_text)


def detect_distraction_patterns(activity_data: Dict[str, Any], bedrock_client) -> List[Dict[str, str]]:
    """
    Identifies specific distraction patterns and their impact
    
    Args:
        activity_data: {
            'tab_switches': 15,
            'idle_periods': [5, 3, 7],  # minutes
            'app_switches': ['youtube', 'whatsapp', 'instagram'],
            'time_of_day': 'evening'
        }
        bedrock_client: AWS Bedrock client instance
    
    Returns:
        [
            {
                'pattern': 'Frequent social media checks',
                'severity': 'high',
                'impact': 'Breaks concentration flow',
                'solution': 'Use app blockers during study time'
            }
        ]
    """
    prompt = f"""You are an AI distraction analyzer. Identify specific distraction patterns.

Activity Data:
- Tab Switches: {activity_data.get('tab_switches', 0)}
- Idle Periods (minutes): {activity_data.get('idle_periods', [])}
- App Switches: {activity_data.get('app_switches', [])}
- Time of Day: {activity_data.get('time_of_day', 'unknown')}

Identify distraction patterns and return JSON array:
[
    {{
        "pattern": "<specific distraction behavior>",
        "severity": "<high/medium/low>",
        "impact": "<how it affects learning>",
        "solution": "<actionable fix>"
    }}
]

Only return valid JSON array, no other text."""

    response = bedrock_client.converse(
        modelId="google.gemma-3-12b-it",
        messages=[{"role": "user", "content": [{"text": prompt}]}]
    )
    
    result_text = response['output']['message']['content'][0]['text']
    return json.loads(result_text)

"""
AI Teacher Assistant - Generates personalized learning materials
Usage: from teacher_ai.assistant import generate_question_paper, create_simplified_notes, generate_homework
"""

import json
from typing import Dict, List, Any


def generate_question_paper(topic_data: Dict[str, Any], bedrock_client) -> Dict[str, Any]:
    """
    Generates a customized question paper based on weak topics
    
    Args:
        topic_data: {
            'subject': 'Mathematics',
            'weak_topics': ['algebra', 'quadratic equations', 'geometry'],
            'difficulty_level': 'medium',
            'question_count': 10,
            'exam_type': 'practice'
        }
        bedrock_client: AWS Bedrock client instance
    
    Returns:
        {
            'questions': [
                {
                    'id': 1,
                    'question': 'Solve: 2x + 5 = 15',
                    'type': 'short_answer',
                    'marks': 2,
                    'topic': 'algebra'
                }
            ],
            'total_marks': 20,
            'estimated_time': '30 minutes'
        }
    """
    prompt = f"""You are an AI teacher creating a question paper. Generate questions focused on student's weak areas.

Requirements:
- Subject: {topic_data.get('subject', 'General')}
- Weak Topics: {json.dumps(topic_data.get('weak_topics', []))}
- Difficulty: {topic_data.get('difficulty_level', 'medium')}
- Number of Questions: {topic_data.get('question_count', 10)}
- Exam Type: {topic_data.get('exam_type', 'practice')}

Generate a question paper in JSON format:
{{
    "questions": [
        {{
            "id": <number>,
            "question": "<question text>",
            "type": "<mcq/short_answer/long_answer>",
            "marks": <number>,
            "topic": "<topic_name>",
            "options": ["<option1>", "<option2>", "<option3>", "<option4>"]  // only for MCQ
        }}
    ],
    "total_marks": <number>,
    "estimated_time": "<time in minutes>",
    "instructions": "<exam instructions>"
}}

Focus questions on weak topics. Mix question types. Only return valid JSON, no other text."""

    response = bedrock_client.converse(
        modelId="google.gemma-3-12b-it",
        messages=[{"role": "user", "content": [{"text": prompt}]}]
    )
    
    result_text = response['output']['message']['content'][0]['text']
    return json.loads(result_text)


def create_simplified_notes(topic_data: Dict[str, Any], bedrock_client) -> Dict[str, Any]:
    """
    Creates simplified, easy-to-understand notes for slow learners
    
    Args:
        topic_data: {
            'subject': 'Science',
            'topic': 'Photosynthesis',
            'current_understanding': 'beginner',
            'learning_style': 'visual'
        }
        bedrock_client: AWS Bedrock client instance
    
    Returns:
        {
            'title': 'Photosynthesis - Simple Explanation',
            'summary': 'Plants make food using sunlight...',
            'key_points': ['Point 1', 'Point 2'],
            'examples': ['Example 1'],
            'visual_aids': ['diagram suggestion'],
            'practice_questions': ['Q1', 'Q2']
        }
    """
    prompt = f"""You are an AI teacher creating simplified notes for slow learners. Make complex topics easy to understand.

Topic Details:
- Subject: {topic_data.get('subject', 'General')}
- Topic: {topic_data.get('topic', 'Unknown')}
- Student Level: {topic_data.get('current_understanding', 'beginner')}
- Learning Style: {topic_data.get('learning_style', 'mixed')}

Create simplified notes in JSON format:
{{
    "title": "<clear topic title>",
    "summary": "<2-3 sentence simple explanation>",
    "key_points": [
        "<simple point 1>",
        "<simple point 2>",
        "<simple point 3>"
    ],
    "step_by_step": [
        "<step 1 with simple language>",
        "<step 2 with simple language>"
    ],
    "real_life_examples": [
        "<relatable example 1>",
        "<relatable example 2>"
    ],
    "visual_aids": [
        "<diagram suggestion>",
        "<chart suggestion>"
    ],
    "memory_tricks": [
        "<mnemonic or trick 1>",
        "<mnemonic or trick 2>"
    ],
    "practice_questions": [
        "<easy question 1>",
        "<easy question 2>"
    ]
}}

Use simple words, short sentences, and relatable examples. Only return valid JSON, no other text."""

    response = bedrock_client.converse(
        modelId="google.gemma-3-12b-it",
        messages=[{"role": "user", "content": [{"text": prompt}]}]
    )
    
    result_text = response['output']['message']['content'][0]['text']
    return json.loads(result_text)


def generate_homework(topic_data: Dict[str, Any], bedrock_client) -> Dict[str, Any]:
    """
    Generates homework assignments in 3 difficulty levels
    
    Args:
        topic_data: {
            'subject': 'Mathematics',
            'topics': ['algebra', 'equations'],
            'grade': 8
        }
        bedrock_client: AWS Bedrock client instance
    
    Returns:
        {
            'easy': [{'question': '...', 'marks': 1}],
            'medium': [{'question': '...', 'marks': 2}],
            'hard': [{'question': '...', 'marks': 3}],
            'instructions': 'Complete at least easy level...'
        }
    """
    prompt = f"""You are an AI teacher creating differentiated homework. Generate questions at 3 difficulty levels.

Assignment Details:
- Subject: {topic_data.get('subject', 'General')}
- Topics: {json.dumps(topic_data.get('topics', []))}
- Grade: {topic_data.get('grade', 'Unknown')}

Create homework in JSON format:
{{
    "easy": [
        {{
            "question": "<basic question>",
            "marks": 1,
            "hint": "<helpful hint>"
        }}
    ],
    "medium": [
        {{
            "question": "<moderate question>",
            "marks": 2,
            "hint": "<helpful hint>"
        }}
    ],
    "hard": [
        {{
            "question": "<challenging question>",
            "marks": 3,
            "hint": "<helpful hint>"
        }}
    ],
    "instructions": "<how to approach the homework>",
    "estimated_time": {{
        "easy": "<minutes>",
        "medium": "<minutes>",
        "hard": "<minutes>"
    }}
}}

Easy: 5 questions (foundational concepts)
Medium: 4 questions (application)
Hard: 3 questions (analysis/synthesis)

Only return valid JSON, no other text."""

    response = bedrock_client.converse(
        modelId="google.gemma-3-12b-it",
        messages=[{"role": "user", "content": [{"text": prompt}]}]
    )
    
    result_text = response['output']['message']['content'][0]['text']
    return json.loads(result_text)


def generate_lesson_plan(topic_data: Dict[str, Any], bedrock_client) -> Dict[str, Any]:
    """
    Creates a structured lesson plan for teachers
    
    Args:
        topic_data: {
            'subject': 'Science',
            'topic': 'Cell Structure',
            'duration_minutes': 45,
            'student_level': 'grade_9'
        }
        bedrock_client: AWS Bedrock client instance
    
    Returns:
        {
            'objectives': ['Learn cell parts', 'Understand functions'],
            'activities': [{'time': 10, 'activity': 'Introduction'}],
            'resources': ['Microscope', 'Slides'],
            'assessment': ['Quiz', 'Lab work']
        }
    """
    prompt = f"""You are an AI teaching assistant creating a lesson plan.

Lesson Details:
- Subject: {topic_data.get('subject', 'General')}
- Topic: {topic_data.get('topic', 'Unknown')}
- Duration: {topic_data.get('duration_minutes', 45)} minutes
- Student Level: {topic_data.get('student_level', 'Unknown')}

Create lesson plan in JSON format:
{{
    "objectives": ["<learning objective 1>", "<learning objective 2>"],
    "activities": [
        {{
            "time_minutes": <number>,
            "activity": "<activity name>",
            "description": "<what to do>",
            "materials": ["<material1>", "<material2>"]
        }}
    ],
    "resources": ["<resource1>", "<resource2>"],
    "assessment_methods": ["<method1>", "<method2>"],
    "differentiation": {{
        "for_slow_learners": "<strategy>",
        "for_advanced_learners": "<strategy>"
    }},
    "homework": "<homework assignment>"
}}

Only return valid JSON, no other text."""

    response = bedrock_client.converse(
        modelId="google.gemma-3-12b-it",
        messages=[{"role": "user", "content": [{"text": prompt}]}]
    )
    
    result_text = response['output']['message']['content'][0]['text']
    return json.loads(result_text)

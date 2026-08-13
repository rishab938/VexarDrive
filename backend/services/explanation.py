import os
import requests
import json

def call_llm_api(prompt: str) -> str:
    """
    Calls Groq or OpenAI chat completions depending on which API key is set.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    # 1. Check Groq
    if groq_key and groq_key.strip():
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {groq_key.strip()}",
                "Content-Type": "application/json"
            }
            data = {
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": "You are a professional operations analyst summarizing safety and maintenance scores."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 150,
                "temperature": 0.3
            }
            res = requests.post(url, headers=headers, json=data, timeout=8)
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            # Fall through to OpenAI or templates
            print(f"Groq API call error: {e}")
            
    # 2. Check OpenAI
    if openai_key and openai_key.strip():
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {openai_key.strip()}",
                "Content-Type": "application/json"
            }
            data = {
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": "You are a professional operations analyst summarizing safety and maintenance scores."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 150,
                "temperature": 0.3
            }
            res = requests.post(url, headers=headers, json=data, timeout=8)
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"OpenAI API call error: {e}")
            
    raise ValueError("No valid LLM response obtained.")

def generate_driver_explanation(row: dict) -> str:
    """
    Generates a clear business description for a driver's risk score using raw metrics.
    Uses LLM (Groq/OpenAI) if available, else falls back to a template.
    """
    driver_id = row.get('Driver_ID', 'Unknown')
    driver_name = row.get('Driver_Name', 'Unknown')
    risk_score = row.get('Risk_Score', 0.0)
    category = row.get('Risk_Category', 'Safe')
    distance = row.get('distance', 0.0)
    total_events = row.get('total_risk_events', 0)
    events_per_km = row.get('risk_events_per_km', 0.0)
    trips = row.get('trips', 0)
    risky_trips = row.get('risky_trips', 0)
    pct_risky = row.get('pct_risky_trips', 0.0)
    
    hard_braking = row.get('hard_braking_events', 0)
    sudden_accel = row.get('sudden_acceleration_events', 0)
    sharp_turns = row.get('sharp_turn_events', 0)
    sharp_lateral = row.get('sharp_lateral_events', 0)
    high_speed = row.get('high_speed_events', 0)

    try:
        prompt = f"""
        Translate these driver safety metrics into a brief, professional operation report explanation.
        
        Driver ID: {driver_id}
        Name: {driver_name}
        Risk Score: {risk_score} / 100
        Safety Category: {category}
        Total Distance: {distance:.2f} km
        Trips: {trips}
        Risky Trips: {risky_trips} ({pct_risky:.1f}%)
        Total Risk Events: {total_events} ({events_per_km:.3f} per km)
        
        Safety Event Breakdown:
        - Hard Braking: {hard_braking}
        - Sudden Acceleration: {sudden_accel}
        - Sharp Turns: {sharp_turns}
        - Sharp Lateral Movements: {sharp_lateral}
        - Speeding Instances: {high_speed}
        
        Constraints:
        - Write a concise paragraph (2-4 sentences).
        - Use ONLY the provided numbers. Do not invent any numbers.
        - Do not diagnose vehicle mechanical errors or driver psychological states.
        - State the facts, categories, and direct event metrics clearly.
        - Do not override or change the score or safety category.
        """
        return call_llm_api(prompt)
    except Exception:
        # Deterministic template fallback
        explanation = f"{driver_name} ({driver_id}) is categorized as '{category}' with a risk score of {risk_score:.1f}. "
        explanation += f"The driver accumulated {total_events} safety risk events over {distance:.1f} km, averaging {events_per_km:.2f} events/km. "
        explanation += f"Risky driving behavior was recorded on {risky_trips} of the {trips} total trips ({pct_risky:.1f}%). "
        
        contributors = []
        if high_speed > 0:
            contributors.append(f"speeding ({high_speed} instances)")
        if hard_braking > 0:
            contributors.append(f"hard braking ({hard_braking} instances)")
        if sudden_accel > 0:
            contributors.append(f"sudden acceleration ({sudden_accel} instances)")
        if sharp_turns > 0:
            contributors.append(f"sharp turns ({sharp_turns} instances)")
        if sharp_lateral > 0:
            contributors.append(f"lateral stability issues ({sharp_lateral} instances)")
            
        if contributors:
            explanation += f"The primary telemetry markers contributing to this score are {', '.join(contributors)}."
        else:
            explanation += "No significant safety infractions were recorded in telemetry."
            
        return explanation

def generate_vehicle_explanation(row: dict) -> str:
    """
    Generates a clear business description for a vehicle's health score using raw sensor metrics.
    Uses LLM (Groq/OpenAI) if available, else falls back to a template.
    """
    vehicle_id = row.get('Vehicle_ID', 'Unknown')
    make = row.get('Make', 'Unknown')
    model = row.get('Model', 'Unknown')
    score = row.get('Health_Score', 100.0)
    status = row.get('Health_Status', 'Healthy')
    
    trips = row.get('trips', 0)
    drivers = row.get('drivers', 0)
    mean_z = row.get('mean_accel_z_dev', 0.0)
    p95_z = row.get('p95_accel_z_dev', 0.0)
    mean_gyro_xy = row.get('mean_gyro_xy', 0.0)
    p95_gyro_xy = row.get('p95_gyro_xy', 0.0)
    gyro_z_spike_rate = row.get('gyro_z_spike_rate', 0.0)
    persistence = row.get('persistence_rate', 0.0)

    try:
        prompt = f"""
        Translate these vehicle sensor metrics into a brief, professional operation report explanation.
        
        Vehicle ID: {vehicle_id}
        Vehicle: {make} {model}
        Health Score: {score} / 100 (100 is healthiest)
        Status: {status}
        Trips Operated: {trips}
        Unique Drivers: {drivers}
        
        Sensor Metrics:
        - Mean Acceleration Z-axis Deviation: {mean_z:.4f}g (p95: {p95_z:.4f}g)
        - Mean Gyroscope XY Magnitude: {mean_gyro_xy:.2f} dps (p95: {p95_gyro_xy:.2f} dps)
        - Gyroscope Z Spike Rate: {gyro_z_spike_rate*100:.2f}%
        - Persistence Rate across trips: {persistence*100:.1f}%
        
        Constraints:
        - Write a concise paragraph (2-3 sentences).
        - Use ONLY the provided numbers. Do not invent any numbers.
        - DO NOT claim vehicle has a specific mechanical failure (e.g. suspension/brakes). 
        - Use terms like "abnormal sensor signature", "sensor concern", "inspection recommended".
        - State the facts, status, and direct metrics clearly.
        - Do not override or change the health score or status.
        """
        return call_llm_api(prompt)
    except Exception:
        # Deterministic template fallback
        explanation = f"Vehicle {vehicle_id} ({make} {model}) is evaluated as '{status}' with a health score of {score:.1f}. "
        explanation += f"Across {trips} trips operated by {drivers} driver(s), the vehicle recorded a mean vertical Accel-Z deviation of {mean_z:.4f}g (P95: {p95_z:.4f}g) and a gyroscope XY magnitude of {mean_gyro_xy:.2f} dps. "
        
        anomalies = []
        if mean_z > 0.05:
            anomalies.append(f"significant vertical acceleration deviation ({mean_z:.4f}g)")
        if gyro_z_spike_rate > 0.03:
            anomalies.append(f"elevated Z-axis rotational spike rate ({gyro_z_spike_rate*100:.1f}%)")
        if persistence > 0.3:
            anomalies.append(f"high recurrence of sensor anomalies ({persistence*100:.1f}% of trips)")
            
        if anomalies:
            explanation += f"The primary concerns are {', '.join(anomalies)}, making this vehicle a candidate for inspection."
        else:
            explanation += "The sensor signatures are consistent with fleet baselines, indicating normal operating conditions."
            
        return explanation

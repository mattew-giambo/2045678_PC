def normalize_rest_data(raw_data):
    """
    Transforms the raw JSON payload from various simulator schemas 
    into our Standard Event format.
    Handles: 'rest.scalar.v1', 'rest.chemistry.v1', 'rest.particulate.v1', 'rest.level.v1'
    """
    # 1. Base structure matching the exact keys required by our Standard Schema
    normalized_event = {
        "device_id": raw_data.get("sensor_id", "unknown_device"),
        "time": raw_data.get("captured_at", ""),  
        "status": raw_data.get("status", "ok"),   
        "metrics": [],                            
        "metadata": {}
    }

    # 2. Handle 'rest.scalar.v1' (e.g., temperature, humidity)
    if "metric" in raw_data and "value" in raw_data:
        metric_obj = {
            "metric_name": raw_data["metric"],
            "value": raw_data["value"]
        }
        if "unit" in raw_data:
            metric_obj["unit"] = raw_data["unit"]
            
        normalized_event["metrics"].append(metric_obj)

    # 3. Handle 'rest.chemistry.v1' (e.g., hydroponic_ph, air_quality_voc)
    
    elif "measurements" in raw_data:
        for item in raw_data["measurements"]:
            metric_name = item.get("metric")
            if metric_name and "value" in item:
                metric_obj = {
                    "metric_name": metric_name,
                    "value": item["value"]
                }
                if "unit" in item:
                    metric_obj["unit"] = item["unit"]
                    
                normalized_event["metrics"].append(metric_obj)

    
    # 4. Handle 'rest.particulate.v1' (e.g., air_quality_pm25)
    elif "pm1_ug_m3" in raw_data or "pm25_ug_m3" in raw_data or "pm10_ug_m3" in raw_data:
        # PM1
        if "pm1_ug_m3" in raw_data:
            normalized_event["metrics"].append({
                "metric_name": "pm1",
                "value": raw_data["pm1_ug_m3"],
                "unit": "ug/m3"
            })
        # PM2.5
        if "pm25_ug_m3" in raw_data:
            normalized_event["metrics"].append({
                "metric_name": "pm25",
                "value": raw_data["pm25_ug_m3"],
                "unit": "ug/m3"
            })
        # PM10
        if "pm10_ug_m3" in raw_data:
            normalized_event["metrics"].append({
                "metric_name": "pm10",
                "value": raw_data["pm10_ug_m3"],
                "unit": "ug/m3"
            })

    # 5. Handle 'rest.level.v1' (e.g., water_tank_level)

    elif "level_pct" in raw_data or "level_liters" in raw_data:
        # Level Percentage
        if "level_pct" in raw_data:
            normalized_event["metrics"].append({
                "metric_name": "level_pct",
                "value": raw_data["level_pct"],
                "unit": "%"
            })
        # Level in Liters
        if "level_liters" in raw_data:
            normalized_event["metrics"].append({
                "metric_name": "level_liters",
                "value": raw_data["level_liters"],
                "unit": "L"
            })

    return normalized_event
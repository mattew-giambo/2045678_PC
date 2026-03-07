from typing import Dict, Any

# Group topics by schema type for easier maintenance
POWER_TOPICS = {
    "mars/telemetry/solar_array",
    "mars/telemetry/power_bus",
    "mars/telemetry/power_consumption",
}

ENVIRONMENT_TOPICS = {
    "mars/telemetry/radiation",
    "mars/telemetry/life_support",
}

def normalize_telemetry(topic: str, raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Takes a raw telemetry payload from the simulator and normalizes it
    into the standard unified internal event schema.

    Args
        topic (str): The telemetry topic (e.g., "mars/telemetry/solar_array").
        raw_data (Dict[str, Any]): The raw telemetry data as received from the simulator for that topic.
    Returns
        Dict[str, Any]: A normalized event dictionary following the unified schema.
    """

    # 1. Initialize the base unified event
    unified_event = {
        "device_id": topic,
        "time": raw_data.get("event_time", ""),  # Using "time" to match your schema!
        "status": raw_data.get("status", "ok"),
        "metrics": [],  
        "metadata": {}
    }

    # Convenience references
    metrics = unified_event["metrics"]
    metadata = unified_event["metadata"]

    # 2. Handle Power Topics (topic.power.v1)
    if topic in POWER_TOPICS:
        metadata["subsystem"] = raw_data.get("subsystem", "unknown")

        power_map = {
            "power_kw": ("power", "kW"),
            "voltage_v": ("voltage", "V"),
            "current_a": ("current", "A"),
            "cumulative_kwh": ("cumulative_energy", "kWh")
        }

        for raw_key, (metric_name, unit) in power_map.items():
            value = raw_data.get(raw_key)
            if value is not None:
                metrics.append({
                    "metric_name": metric_name,
                    "value": value,
                    "unit": unit
                })

    # 3. Handle Environment Topics (topic.environment.v1)
    elif topic in ENVIRONMENT_TOPICS:
        # Keep source nested inside metadata
        source = raw_data.get("source", {})
        if source:
            metadata["source"] = {
                "system": source.get("system", "unknown"),
                "segment": source.get("segment", "unknown")
            }

        measurements = raw_data.get("measurements", [])
        for item in measurements:
            if not isinstance(item, dict):
                continue

            raw_metric_name = item.get("metric")
            value = item.get("value")

            if raw_metric_name and value is not None:
                metric_obj = {
                    "metric_name": raw_metric_name,
                    "value": value
                }
                if "unit" in item:
                    metric_obj["unit"] = item["unit"]
                metrics.append(metric_obj)

    # 4. Handle Thermal Loop Topic (topic.thermal_loop.v1)
    elif topic == "mars/telemetry/thermal_loop":
        metadata["loop"] = raw_data.get("loop", "unknown")

        thermal_map = {
            "temperature_c": ("temperature", "C"),
            "flow_l_min": ("flow", "L/min")
        }

        for raw_key, (metric_name, unit) in thermal_map.items():
            value = raw_data.get(raw_key)
            if value is not None:
                metrics.append({
                    "metric_name": metric_name,
                    "value": value,
                    "unit": unit
                })

    # 5. Handle Airlock Topic (topic.airlock.v1)
    elif topic == "mars/telemetry/airlock":
        metadata["airlock_id"] = raw_data.get("airlock_id", "unknown")
        metadata["last_state"] = raw_data.get("last_state", "UNKNOWN")

        value = raw_data.get("cycles_per_hour")
        if value is not None:
            metrics.append({
                "metric_name": "cycles",
                "value": value,
                "unit": "per_hour"
            })

    # 6. Print normalized event for debugging
    print(f"\n[NORMALIZED] topic={unified_event['device_id']}")
    print(f"  time      : {unified_event['time']}")
    print(f"  status    : {unified_event['status']}")
    print(f"  metrics   : {unified_event['metrics']}")
    print(f"  metadata  : {unified_event['metadata']}")

    return unified_event
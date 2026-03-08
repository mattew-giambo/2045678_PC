CREATE TABLE automation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    sensor_name VARCHAR(100) NOT NULL,
    operator ENUM('<', '<=', '=', '>', '>=') NOT NULL,
    threshold_value FLOAT NOT NULL,
    unit VARCHAR(20) DEFAULT NULL,
    
    actuator_name ENUM('cooling_fan', 'entrance_humidifier', 'hall_ventilation', 'habitat_heater') NOT NULL,
    action ENUM('ON', 'OFF') NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_sensor_actuator_action UNIQUE (sensor_name, actuator_name, action)
);
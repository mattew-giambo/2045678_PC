//actuators
function updateActuatorUI(actuatorName, action, timestampStr) {
    const row = document.querySelector(`.actuator-row[data-actuator="${actuatorName}"]`);
    
    if (!row) {
        console.warn(`Actuator not found in HTML: ${actuatorName}`);
        return;
    }
    const badge = row.querySelector('.actuator-status-badge');
    if (badge) {
        badge.innerText = action;
        if (action === "ON") {
            badge.classList.remove('off');
            badge.classList.add('on'); 
        } else {
            badge.classList.remove('on');
            badge.classList.add('off');
        }
    }
    if (timestampStr) {
        const timeDiv = row.querySelector('.act-toggled');
        if (timeDiv) {
            try {
                const dateObj = new Date(timestampStr);

                if (!isNaN(dateObj)) {
                    dateObj.setFullYear(dateObj.getFullYear() + 10);
                }
                if (!isNaN(dateObj)) {
                    timeDiv.innerText = `Last toggled: ${dateObj.toLocaleTimeString('it-IT')}`;
                }
            } catch (e) {
                timeDiv.innerText = `Last toggled: ${timestampStr}`;
            }
        }
    }
    updateActiveCount();
}

function updateActiveCount() {
    const activeBadges = document.querySelectorAll('.actuator-status-badge.on');
    const countSpan = document.getElementById('actuators-active-count');
    
    if (countSpan) {
        countSpan.innerText = `${activeBadges.length} active now`;
        
        if (activeBadges.length > 0) {
            countSpan.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'; 
            countSpan.style.color = '#10b981';
        } else {
            countSpan.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; 
            countSpan.style.color = '#cbd5e1';
        }
    }
}

async function fetchInitialActuators() {
    try {
        const response = await fetch("http://localhost:8080/api/actuators");
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        
        const data = await response.json();
        
        if (data && data.actuators) {
            for (const [name, state] of Object.entries(data.actuators)) {
                updateActuatorUI(name, state, null);
            }
        }
    } catch (error) {
        console.error("error during the load of the actuators:", error);
    }
}

fetchInitialActuators();

const wsActuators = new WebSocket('ws://localhost:8005/ws/update_actuators');

wsActuators.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateActuatorUI(data.actuator_name, data.action, data.timestamp);
};

// FORM RULES
document.addEventListener("DOMContentLoaded", () => {
    
    const btnSubmit = document.getElementById("btn-submit-rule");
    const feedbackMsg = document.getElementById("rule-feedback-msg");

    btnSubmit.addEventListener("click", async (e) => {
        e.preventDefault(); 

        const sensorSelect = document.getElementById("rule-sensor");
        const sensorName = sensorSelect.value;
        const operator = document.getElementById("rule-operator").value;
        const thresholdValue = document.getElementById("rule-value").value;
        const action = document.getElementById("rule-action").value;
        const actuatorName = document.getElementById("rule-target").value;

        if (!sensorName || !operator || !thresholdValue || !action || !actuatorName) {
            showFeedback("Please fill in all fields before creating the rule.", "error");
            return;
        }

        const selectedOptionText = sensorSelect.options[sensorSelect.selectedIndex].text;
        const unitMatch = selectedOptionText.match(/\(([^)]+)\)/); 
        const unit = unitMatch ? unitMatch[1] : ""; 
        const payload = {
            sensor_name: sensorName,
            operator: operator,
            threshold_value: parseFloat(thresholdValue), 
            unit: unit,
            actuator_name: actuatorName,
            action: action
        };

        try {
           
            btnSubmit.disabled = true;
            btnSubmit.innerText = "Creating...";

            const response = await fetch("/create_rule", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
               
                const errorData = await response.json();
                throw new Error(errorData.detail || `Server Error: ${response.status}`);
            }

            showFeedback("Rule created successfully!", "success");
            

            resetForm();
            loadRules();
        } catch (error) {
            console.error("Rule creation error:", error);
            showFeedback(error.message, "error");
        } finally {

            btnSubmit.disabled = false;
            btnSubmit.innerText = "Create Rule";
        }
    });


    function showFeedback(message, type) {
        feedbackMsg.innerText = message;
        feedbackMsg.style.display = "block";
        
        if (type === "error") {
            feedbackMsg.style.backgroundColor = "rgba(239, 68, 68, 0.2)"; 
            feedbackMsg.style.color = "#ef4444";
            feedbackMsg.style.border = "1px solid rgba(239, 68, 68, 0.3)";
        } else {
            feedbackMsg.style.backgroundColor = "rgba(16, 185, 129, 0.2)"; 
            feedbackMsg.style.color = "#10b981";
            feedbackMsg.style.border = "1px solid rgba(16, 185, 129, 0.3)";
        
            setTimeout(() => {
                feedbackMsg.style.display = "none";
            }, 3000);
        }
    }

    function resetForm() {
        document.getElementById("rule-sensor").value = "";
        document.getElementById("rule-operator").value = "";
        document.getElementById("rule-value").value = "";
        document.getElementById("rule-action").value = "";
        document.getElementById("rule-target").value = "";
    }

    document.getElementById("btn-cancel-rule").addEventListener("click", (e) => {
        e.preventDefault();
        resetForm();
        feedbackMsg.style.display = "none";
    });
});


// ACTIVE RULES TABLE
const rulesTbody = document.querySelector(".rules-table tbody");

async function loadRules() {
    try {
        const response = await fetch("http://localhost:8005/rules");
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        
        const rules = data?.rules || [];

        const countSpan = document.getElementById("rules_num");
        if (countSpan) countSpan.innerHTML = rules.length;

        rulesTbody.innerHTML = "";

        if (rules.length === 0) {
            rulesTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#64748b; font-style:italic;">No active rules defined.</td></tr>`;
            return;
        }

        rules.forEach(rule => {
            let dateStr = "N/A";
            if (rule.created_at) {
                const dateObj = new Date(rule.created_at);
            
                if (!isNaN(dateObj)) {
                    dateObj.setFullYear(dateObj.getFullYear() + 10);
                    dateStr = dateObj.toISOString().split("T")[0];
                }
            }

            const logicString = `IF ${rule.sensor_name} ${rule.operator} ${rule.threshold_value} ${rule.unit} THEN set ${rule.actuator_name} to ${rule.action}`;

            const tr = document.createElement("tr");
            
            tr.innerHTML = `
                <td>${rule.id}</td>
                <td class="rule-logic">${logicString}</td>
                <td>${dateStr}</td>
                <td>
                    <button class="btn-delete" data-id="${rule.id}">Delete</button>
                </td>
            `;

            rulesTbody.appendChild(tr);
        });

        attachDeleteListeners();

    } catch (error) {
        console.error("error during the rules load:", error);
        rulesTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#ef4444;">Failed to load rules.</td></tr>`;
    }
}

    function attachDeleteListeners() {
        const deleteButtons = rulesTbody.querySelectorAll(".btn-delete");
        
        deleteButtons.forEach(btn => {
            btn.addEventListener("click", async function() {
                const ruleId = this.getAttribute("data-id");
            
                const originalText = this.innerText;
                this.innerText = "Deleting...";
                this.disabled = true;

                await deleteRule(ruleId, this, originalText);
            });
        });
    }

    async function deleteRule(id, btnElement, originalText) {
        try {
            const response = await fetch(`http://localhost:8005/delete_rule/${id}`, {
                method: "POST"
            });

            if (!response.ok) {
                throw new Error("The rule could not be deleted");
            }

            await loadRules();

        } catch (error) {
            console.error("Error deleting rule.", error);
            alert("Error deleting rule. Please try again.");
            
            btnElement.innerText = originalText;
            btnElement.disabled = false;
        }
    }

    loadRules();



// Manually Activation of Actuators
greenhouse_temperature_ac = document.getElementById("cooling_fan");
entrance_humidifier_ac = document.getElementById("entrance_humidifier");
hall_ventilation_ac = document.getElementById("hall_ventilation");
habitat_heater_ac = document.getElementById("habitat_heater");

const actuators = [greenhouse_temperature_ac, entrance_humidifier_ac, hall_ventilation_ac, habitat_heater_ac];

actuators.forEach(actuator => {
    actuator.addEventListener("click", async () => {
        const actuatorName = actuator.getAttribute("id");
        const currentState = actuator.innerText;
        const newAction = currentState === "ON" ? "OFF" : "ON";

        try {
            const response = await fetch(`/toggle_actuator/${actuatorName}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    state: newAction
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            updateActuatorUI(responseData.actuator_name, responseData.action, responseData.timestamp);
        } catch (error) {
            console.error("Error updating actuator manually:", error);
            alert("Failed to update actuator. Please try again.");
        }
    });
});
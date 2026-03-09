// ==========================================
// GESTIONE ATTUATORI (REST + WEBSOCKET)
// ==========================================

// 1. Funzione centrale per aggiornare la UI di un singolo attuatore
function updateActuatorUI(actuatorName, action, timestampStr) {
    // Cerca la riga dell'attuatore usando l'attributo data-actuator
    const row = document.querySelector(`.actuator-row[data-actuator="${actuatorName}"]`);
    
    if (!row) {
        console.warn(`Attuatore non trovato nell'HTML: ${actuatorName}`);
        return;
    }

    // Aggiorna il badge (ON/OFF) e i colori
    const badge = row.querySelector('.actuator-status-badge');
    if (badge) {
        badge.innerText = action;
        if (action === "ON") {
            badge.classList.remove('off');
            badge.classList.add('on'); // Assicurati di avere una classe .on nel tuo CSS!
        } else {
            badge.classList.remove('on');
            badge.classList.add('off');
        }
    }

    // Aggiorna l'orario "Last toggled" (solo se fornito dal WebSocket)
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

    // Ricalcola quanti attuatori sono attivi in questo momento
    updateActiveCount();
}

// 2. Ricalcola il badge "X active now" in alto
function updateActiveCount() {
    // Conta quanti badge hanno la classe CSS "on"
    const activeBadges = document.querySelectorAll('.actuator-status-badge.on');
    const countSpan = document.getElementById('actuators-active-count');
    
    if (countSpan) {
        countSpan.innerText = `${activeBadges.length} active now`;
        
        // Opzionale: cambia colore al contatore se ci sono attuatori accesi
        if (activeBadges.length > 0) {
            countSpan.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'; // Verde
            countSpan.style.color = '#10b981';
        } else {
            countSpan.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; // Grigio di default
            countSpan.style.color = '#cbd5e1';
        }
    }
}

// 3. Inizializzazione: Prende lo stato iniziale dalla REST API
async function fetchInitialActuators() {
    try {
        // Nota: uso la porta 8080 come hai indicato per l'API
        const response = await fetch("http://localhost:8080/api/actuators");
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        
        const data = await response.json();
        
        if (data && data.actuators) {
            for (const [name, state] of Object.entries(data.actuators)) {
                updateActuatorUI(name, state, null);
            }
        }
    } catch (error) {
        console.error("❌ Errore nel caricamento iniziale degli attuatori:", error);
    }
}

// Avvia il caricamento iniziale
fetchInitialActuators();

// 4. Connessione WebSocket per gli aggiornamenti in Tempo Reale
// Nota: uso la porta 8005 come da tuo server FastAPI
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
        e.preventDefault(); // Evita ricaricamenti strani se il bottone fosse in un <form>

        // 1. Raccogli i valori dagli input
        const sensorSelect = document.getElementById("rule-sensor");
        const sensorName = sensorSelect.value;
        const operator = document.getElementById("rule-operator").value;
        const thresholdValue = document.getElementById("rule-value").value;
        const action = document.getElementById("rule-action").value;
        const actuatorName = document.getElementById("rule-target").value;

        // 2. Validazione base: controlla che tutti i campi siano compilati
        if (!sensorName || !operator || !thresholdValue || !action || !actuatorName) {
            showFeedback("Please fill in all fields before creating the rule.", "error");
            return;
        }

        // 3. Estrazione dell'Unità di Misura
        // Prende il testo visibile (es. "greenhouse_temperature (C)") ed estrae "C"
        const selectedOptionText = sensorSelect.options[sensorSelect.selectedIndex].text;
        const unitMatch = selectedOptionText.match(/\(([^)]+)\)/); 
        const unit = unitMatch ? unitMatch[1] : ""; // Se trova le parentesi prende il contenuto, altrimenti stringa vuota

        // 4. Prepara il payload corrispondente al modello Pydantic InputRule
        const payload = {
            sensor_name: sensorName,
            operator: operator,
            threshold_value: parseFloat(thresholdValue), // Pydantic vuole un float
            unit: unit,
            actuator_name: actuatorName,
            action: action
        };

        try {
            // Disabilita il pulsante per evitare doppi click
            btnSubmit.disabled = true;
            btnSubmit.innerText = "Creating...";

            // 5. Invia la richiesta POST a FastAPI
            const response = await fetch("/create_rule", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // Se il server risponde con un errore (es. 400 o 500)
                const errorData = await response.json();
                throw new Error(errorData.detail || `Server Error: ${response.status}`);
            }

            // 6. Successo!
            showFeedback("Rule created successfully!", "success");
            
            // Pulisce il form
            resetForm();
            loadRules();
        } catch (error) {
            console.error("Errore creazione regola:", error);
            showFeedback(error.message, "error");
        } finally {
            // Riabilita il bottone
            btnSubmit.disabled = false;
            btnSubmit.innerText = "Create Rule";
        }
    });

    // --- FUNZIONI DI AIUTO ---

    function showFeedback(message, type) {
        feedbackMsg.innerText = message;
        feedbackMsg.style.display = "block";
        
        if (type === "error") {
            feedbackMsg.style.backgroundColor = "rgba(239, 68, 68, 0.2)"; // Rosso chiaro
            feedbackMsg.style.color = "#ef4444";
            feedbackMsg.style.border = "1px solid rgba(239, 68, 68, 0.3)";
        } else {
            feedbackMsg.style.backgroundColor = "rgba(16, 185, 129, 0.2)"; // Verde chiaro
            feedbackMsg.style.color = "#10b981";
            feedbackMsg.style.border = "1px solid rgba(16, 185, 129, 0.3)";
            
            // Se è un successo, fai sparire il messaggio dopo 3 secondi
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

    // Gestione del tasto Cancel
    document.getElementById("btn-cancel-rule").addEventListener("click", (e) => {
        e.preventDefault();
        resetForm();
        feedbackMsg.style.display = "none";
    });
});


// ACTIVE RULES TABLE
// ==========================================
    // GESTIONE TABELLA REGOLE (LOAD & DELETE)
    // ==========================================

const rulesTbody = document.querySelector(".rules-table tbody");

// 1. Funzione per caricare e renderizzare la tabella
async function loadRules() {
    try {
        const response = await fetch("http://localhost:8005/rules");
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        
        // data.rules è la lista fornita dal tuo OutputListRules
        const rules = data?.rules || [];

        // Aggiorna anche il numeretto delle active rules in alto alla pagina (se lo hai ancora)
        const countSpan = document.getElementById("rules_num");
        if (countSpan) countSpan.innerHTML = rules.length;

        // Svuota la tabella
        rulesTbody.innerHTML = "";

        // Se non ci sono regole, mostra un messaggio pulito
        if (rules.length === 0) {
            rulesTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#64748b; font-style:italic;">No active rules defined.</td></tr>`;
            return;
        }

        // Popola la tabella
        rules.forEach(rule => {
            // Estrae la data. Supponiamo che il tuo modello Pydantic abbia un campo 'timestamp' o 'created_at'.
            // Se non ce l'ha, puoi ometterlo o usare una data fissa finché non lo aggiungi.
            let dateStr = "N/A";
            if (rule.created_at) {
                const dateObj = new Date(rule.created_at);
                
                // Controlliamo che la data sia valida
                if (!isNaN(dateObj)) {
                    // Viaggio nel futuro di +10 anni!
                    dateObj.setFullYear(dateObj.getFullYear() + 10);
                    
                    // Ora estraiamo la parte YYYY-MM-DD dalla nuova data
                    dateStr = dateObj.toISOString().split("T")[0];
                }
            }

            // Costruisce la stringa logica esatta richiesta
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

        // Aggiungi gli event listener ai nuovi bottoni "Delete"
        attachDeleteListeners();

    } catch (error) {
        console.error("❌ Errore nel caricamento delle regole:", error);
        rulesTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#ef4444;">Failed to load rules.</td></tr>`;
    }
}

    // 2. Funzione per agganciare i click ai bottoni Delete
    function attachDeleteListeners() {
        const deleteButtons = rulesTbody.querySelectorAll(".btn-delete");
        
        deleteButtons.forEach(btn => {
            btn.addEventListener("click", async function() {
                const ruleId = this.getAttribute("data-id");
                
                // Cambia il testo del bottone per dare feedback visivo
                const originalText = this.innerText;
                this.innerText = "Deleting...";
                this.disabled = true;

                await deleteRule(ruleId, this, originalText);
            });
        });
    }

    // 3. Funzione per cancellare la singola regola
    async function deleteRule(id, btnElement, originalText) {
        try {
            // Chiama l'endpoint FastAPI (POST /delete_rule/{id})
            const response = await fetch(`http://localhost:8005/delete_rule/${id}`, {
                method: "POST"
            });

            if (!response.ok) {
                throw new Error("Impossibile cancellare la regola");
            }

            // SUCCESSO! Ricarica l'intera tabella aggiornata
            await loadRules();

        } catch (error) {
            console.error("❌ Errore durante l'eliminazione:", error);
            alert("Error deleting rule. Please try again.");
            
            // Ripristina il bottone se la cancellazione fallisce
            btnElement.innerText = originalText;
            btnElement.disabled = false;
        }
    }

    // Avvia il caricamento iniziale appena la pagina si apre
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

const connectionSpan = document.getElementById('connection-date');
const now = new Date();
now.setFullYear(now.getFullYear() + 10);


const datePart = now.toISOString().split('T')[0]; 
const timePart = now.toTimeString().split(' ')[0].slice(0, 5); 
connectionSpan.innerHTML = `${datePart} &nbsp;&nbsp; ${timePart}`;

// ACTIVE RULES
async function updateActiveRulesCount() {
    try {
        const response = await fetch("http://localhost:8005/rules");
    
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        const rulesData = await response.json();

        const rulesNumSpan = document.getElementById("rules_num");
        
        rulesNumSpan.innerHTML = rulesData.rules.length;

    } catch (error) {
        document.getElementById("rules_num").innerHTML = "Error";
    }
}

updateActiveRulesCount();


// HISTORY
const historyCard = document.getElementById('action-history');
const MAX_HISTORY_ROWS = 10;

function addHistoryRow(data) {
    let timeString = data.timestamp;
    try {
        const dateObj = new Date(data.timestamp);
        if (!isNaN(dateObj)) {
            timeString = dateObj.toLocaleTimeString('it-IT');
        }
    } catch (e) {
        console.warn("Non-standard timestamps:", data.timestamp);
    }
    
    let actionText = "";
    if(data.id_rule != -1)
        actionText = `${data.actuator_name} set to ${data.action} by rule ${data.id_rule}`;
    else
        actionText = `${data.actuator_name} set to ${data.action} manually`;

    const existingRows = historyCard.querySelectorAll('.history-row');

    let isDuplicate = false;

    existingRows.forEach(row => {
        const rowTime = row.querySelector('.history-time').innerText;
        const rowText = row.querySelector('.history-text').innerText;
        
        if (rowText === actionText) {
            isDuplicate = true;
        }
    });

    if (isDuplicate) {
        return; 
    }

    const rowDiv = document.createElement('div');
    rowDiv.className = 'history-row';
    rowDiv.style.animation = "fadeIn 0.5s";

    rowDiv.innerHTML = `
        <span class="history-time">${timeString}</span>
        <span class="history-text">${actionText}</span>
    `;


    const title = historyCard.querySelector('h3');
    title.insertAdjacentElement('afterend', rowDiv);


    const allRows = historyCard.querySelectorAll('.history-row');
    if (allRows.length > MAX_HISTORY_ROWS) {
        allRows[allRows.length - 1].remove();
    }
}


// fech to load the initial history
async function loadInitialHistory() {
    try {
        const response = await fetch("http://localhost:8005/actions_queue");
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        const historyList = result.actions_queue;

        if (historyList && Array.isArray(historyList)) {
            const emptyMsg = document.getElementById('empty-history-msg');
            if (emptyMsg) emptyMsg.remove();
            historyList.forEach(item => {
                addHistoryRow(item);
            });
        }
    } catch (error) {
        console.error("Error loading history:", error);
    }
}

// 3. WEBSOCKET to update history in real-time
const wsActuators = new WebSocket('ws://localhost:8005/ws/update_actuators');

wsActuators.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    const emptyMsg = document.getElementById('empty-history-msg');
    if (emptyMsg) emptyMsg.remove();

    addHistoryRow(data);
};

wsActuators.onopen = () => console.log("WS History connected");
wsActuators.onerror = (e) => console.error("error WS History:", e);


loadInitialHistory();
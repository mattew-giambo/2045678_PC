// DATE
const connectionSpan = document.getElementById('connection-date');
const now = new Date();

// Aggiunge esattamente 10 anni alla data di oggi
now.setFullYear(now.getFullYear() + 10);

// Il resto del codice rimane identico
const datePart = now.toISOString().split('T')[0]; 
const timePart = now.toTimeString().split(' ')[0].slice(0, 5); 
connectionSpan.innerHTML = `${datePart} &nbsp;&nbsp; ${timePart}`;

// ACTIVE RULES
async function updateActiveRulesCount() {
    try {
        // 1. Fa la chiamata
        const response = await fetch("http://localhost:8005/rules");
        
        // 2. Controlla se il server ha risposto con un errore (es. 404 o 500)
        if (!response.ok) {
            throw new Error(`Errore del server: ${response.status}`);
        }

        // 3. Estrae e PARSA i dati in un colpo solo.
        // Se FastAPI restituisce una lista, rulesData sarà un vero e proprio array JS.
        const rulesData = await response.json();

        // 4. Aggiorna l'HTML
        const rulesNumSpan = document.getElementById("rules_num");
        
        // Essendo rulesData già un array, usiamo direttamente .length
        rulesNumSpan.innerHTML = rulesData.rules.length;

    } catch (error) {
        document.getElementById("rules_num").innerHTML = "Error";
    }
}

// Ricordati di chiamare la funzione!
updateActiveRulesCount();


// HISTORY
// Seleziona il contenitore
const historyCard = document.getElementById('action-history');
const MAX_HISTORY_ROWS = 10;

// 1. FUNZIONE CONDIVISA: Crea e inserisce una singola riga nella history
function addHistoryRow(data) {
    let timeString = data.timestamp;
    try {
        const dateObj = new Date(data.timestamp);
        if (!isNaN(dateObj)) {
            timeString = dateObj.toLocaleTimeString('it-IT');
        }
    } catch (e) {
        console.warn("Timestamp non standard:", data.timestamp);
    }
    
    let actionText = "";
    if(data.id_rule != -1)
        actionText = `${data.actuator_name} set to ${data.action} by rule ${data.id_rule}`;
    else
        actionText = `${data.actuator_name} set to ${data.action} manually`;

    // ==========================================
    // NUOVO: CONTROLLO ANTI-DUPLICATI
    // ==========================================
    const existingRows = historyCard.querySelectorAll('.history-row');
    let isDuplicate = false;

    // Controlla ogni riga già presente
    existingRows.forEach(row => {
        const rowTime = row.querySelector('.history-time').innerText;
        const rowText = row.querySelector('.history-text').innerText;
        
        // Se testo e orario combaciano esattamente, segna come duplicato
        if (rowText === actionText) {
            isDuplicate = true;
        }
    });

    // Se è un duplicato, interrompiamo la funzione qui. Niente verrà aggiunto.
    if (isDuplicate) {
        return; 
    }
    // ==========================================

    const rowDiv = document.createElement('div');
    rowDiv.className = 'history-row';
    rowDiv.style.animation = "fadeIn 0.5s";

    rowDiv.innerHTML = `
        <span class="history-time">${timeString}</span>
        <span class="history-text">${actionText}</span>
    `;

    // Inserisce sempre sotto il titolo (in cima)
    const title = historyCard.querySelector('h3');
    title.insertAdjacentElement('afterend', rowDiv);

    // Rimuove gli elementi in eccesso
    const allRows = historyCard.querySelectorAll('.history-row');
    if (allRows.length > MAX_HISTORY_ROWS) {
        allRows[allRows.length - 1].remove();
    }
}

// 2. FETCH INIZIALE: Carica la history passata tramite API REST
async function loadInitialHistory() {
    try {
        const response = await fetch("http://localhost:8005/actions_queue");
        if (!response.ok) {
            throw new Error(`Errore API: ${response.status}`);
        }
        
        const result = await response.json();
        const historyList = result.actions_queue;

        if (historyList && Array.isArray(historyList)) {
            const emptyMsg = document.getElementById('empty-history-msg');
            if (emptyMsg) emptyMsg.remove();
            // Se il server manda la lista in ordine cronologico (dal più vecchio al più nuovo)
            // ciclandola e inserendola sempre "in cima", il più nuovo finirà automaticamente in prima posizione!
            historyList.forEach(item => {
                addHistoryRow(item);
            });
        }
    } catch (error) {
        console.error("❌ Errore nel caricamento della history:", error);
    }
}

// 3. WEBSOCKET: Aggiorna in real-time
const wsActuators = new WebSocket('ws://localhost:8005/ws/update_actuators');

wsActuators.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // Rimuove l'eventuale messaggio "Empty History" se presente (vedi messaggi precedenti)
    const emptyMsg = document.getElementById('empty-history-msg');
    if (emptyMsg) emptyMsg.remove();

    // Usa la stessa funzione di prima!
    addHistoryRow(data);
};

wsActuators.onopen = () => console.log("✅ WebSocket History connesso");
wsActuators.onerror = (e) => console.error("❌ Errore WS History:", e);

// Avvia il caricamento iniziale appena il codice viene letto

loadInitialHistory();
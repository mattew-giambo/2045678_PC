// MarsOps Dashboard JavaScript

// ============== TRACCIAMENTO MIN/MAX SENSORI ==============

/**
 * Oggetto per tracciare min/max di ogni sensore
 * Struttura: { sensor_name: { min: number, max: number, unit: string } }
 */
const sensorStats = {};

/**
 * Unità di misura per ogni sensore
 */
const sensorUnits = {
  'greenhouse_temperature': '°C',
  'entrance_humidity': '%',
  'co2_hall': 'ppm',
  'corridor_pressure': 'kPa',
  'water_tank_level': '%',
  'hydroponic_ph': 'pH',
  'air_quality_pm25': 'μg/m³',
  'air_quality_voc': 'ppb'
};

/**
 * Aggiorna le statistiche min/max per un sensore
 * @param {string} sensorName - Nome del sensore
 * @param {number} value - Valore corrente
 */
function updateSensorStats(sensorName, value) {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return;
  
  const unit = sensorUnits[sensorName] || '';
  
  if (!sensorStats[sensorName]) {
    // Prima lettura: inizializza min e max
    sensorStats[sensorName] = { min: numValue, max: numValue, unit: unit };
  } else {
    // Aggiorna min/max
    if (numValue < sensorStats[sensorName].min) {
      sensorStats[sensorName].min = numValue;
    }
    if (numValue > sensorStats[sensorName].max) {
      sensorStats[sensorName].max = numValue;
    }
  }
  
  // Aggiorna l'elemento HTML
  const minmaxEl = document.getElementById(`sensor-minmax-${sensorName}`);
  if (minmaxEl) {
    const stats = sensorStats[sensorName];
    minmaxEl.textContent = `Min ${stats.min} ${stats.unit} / Max ${stats.max} ${stats.unit} this session`;
  }
}

/**
 * Mostra una pagina e aggiorna la navigazione
 * @param {string} name - Nome della pagina (home, sensors, rules)
 * @param {HTMLElement} el - Elemento di navigazione cliccato
 */
function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  el.classList.add('active');
}

/**
 * Focus su una riga di telemetria - mostra i dettagli nel pannello laterale
 * @param {HTMLElement} row - Riga di telemetria cliccata
 */
function focusTelemetry(row) {
  // Rimuovi selezione precedente
  document.querySelectorAll('.telem-row').forEach(r => r.classList.remove('selected'));
  
  // Aggiungi selezione alla riga cliccata
  row.classList.add('selected');
  
  // Estrai i dati dalla riga
  const topic = row.dataset.topic;
  const value = row.dataset.value;
  const peak = row.dataset.peak;
  const status = row.dataset.status;
  const points = row.dataset.points;
  
  // Aggiorna il pannello focused
  document.getElementById('focused-value').textContent = value;
  document.getElementById('focused-topic').textContent = topic;
  document.getElementById('focused-peak').textContent = peak;
  document.getElementById('focused-status').textContent = status;
  
  // Aggiorna il grafico
  document.getElementById('focused-polyline').setAttribute('points', points);
  
  // Effetto visivo sul pannello
  const focusedCard = document.getElementById('focused-card');
  focusedCard.style.borderColor = '#3b82f6';
  setTimeout(() => { focusedCard.style.borderColor = ''; }, 500);
}

/**
 * Toggle stato di un actuator
 * @param {HTMLElement} toggleBtn - Bottone toggle cliccato
 */
function toggleActuator(toggleBtn) {
  toggleBtn.classList.toggle('on');
  toggleBtn.classList.toggle('off');
}

/**
 * Apre il popup della storia completa
 */
function openHistoryPopup() {
  const popup = document.getElementById('history-popup');
  popup.classList.add('active');
  document.body.style.overflow = 'hidden'; // Blocca scroll del body
}

/**
 * Chiude il popup della storia
 * @param {Event} event - Evento click (opzionale)
 */
function closeHistoryPopup(event) {
  // Se l'evento esiste, controlla se è stato cliccato l'overlay
  if (event && event.target !== event.currentTarget) return;
  
  const popup = document.getElementById('history-popup');
  popup.classList.remove('active');
  document.body.style.overflow = ''; // Ripristina scroll
}

/**
 * Chiude il popup con tasto ESC
 */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeHistoryPopup();
  }
});

// WebSocket connection per real-time updates
let ws = null;

/**
 * Inizializza la connessione WebSocket
 */
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = function() {
    console.log('WebSocket connected');
  };
  
  ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    handleRealtimeUpdate(data);
  };
  
  ws.onclose = function() {
    console.log('WebSocket disconnected, reconnecting...');
    setTimeout(initWebSocket, 3000);
  };
  
  ws.onerror = function(error) {
    console.error('WebSocket error:', error);
  };
}

/**
 * Gestisce gli aggiornamenti real-time dal WebSocket
 * @param {Object} data - Dati ricevuti dal WebSocket
 */
function handleRealtimeUpdate(data) {
  console.log('[WS] Ricevuto:', data);
  
  if (data.type === 'initial') {
    // Dati iniziali ricevuti alla connessione
    handleInitialData(data.data);
  } else if (data.type === 'update') {
    // Aggiornamento da broker
    handleBrokerUpdate(data.source, data.data);
  } else if (data.type === 'actuator_response') {
    // Risposta a comando attuatore
    handleActuatorResponse(data);
  } else if (data.type === 'actuator_update') {
    // Attuatore attivato da una regola automatica
    console.log('[WS] Attuatore attivato da regola:', data);
    updateActuatorState(data.actuator, data.state);
    addToHistory(`${data.actuator} set to ${data.action} by rule #${data.rule_id}`);
  }
}

/**
 * Gestisce i dati iniziali ricevuti alla connessione WebSocket
 * @param {Object} data - Oggetto con tutti i dati correnti
 */
function handleInitialData(data) {
  console.log('[WS] Dati iniziali ricevuti:', Object.keys(data).length, 'chiavi');
  
  // Lista degli attuatori conosciuti
  const actuatorNames = ['cooling_fan', 'entrance_humidifier', 'hall_ventilation', 'habitat_heater'];
  
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('mars/telemetry/')) {
      // È un topic di telemetria
      const topic = key.replace('mars/telemetry/', '');
      updateTelemetryRow(topic, value);
    } else if (actuatorNames.includes(key)) {
      // È un attuatore
      console.log('[WS] Stato attuatore:', key, value);
      const state = value.state === true || value.state === 'ON' || value.action === 'ON';
      updateActuatorState(key, state);
    } else {
      // È un sensore REST
      updateSensorCard(key, value);
    }
  }
}

/**
 * Gestisce un aggiornamento dal message broker
 * @param {string} source - Sorgente del messaggio (topic o nome sensore)
 * @param {Object} data - Dati del messaggio
 */
function handleBrokerUpdate(source, data) {
  console.log('[WS] handleBrokerUpdate:', source, data);
  
  if (source.startsWith('mars/telemetry/')) {
    const topic = source.replace('mars/telemetry/', '');
    updateTelemetryRow(topic, data);
    addToHistory(`${topic}: ${data.value} ${data.unit || ''}`);
  } else if (source.startsWith('mars/sensors/')) {
    const sensor = source.replace('mars/sensors/', '');
    updateSensorCard(sensor, data);
    addToHistory(`${sensor}: ${data.value} ${data.unit || ''}`);
  } else if (source.startsWith('/topic/sensors.')) {
    // Formato dal polling del simulatore
    const sensor = source.replace('/topic/sensors.', '');
    console.log('[WS] Aggiorno sensore:', sensor, data);
    updateSensorCard(sensor, data);
  } else if (source.startsWith('/topic/telemetry.')) {
    // Formato dal polling del simulatore
    const topic = source.replace('/topic/telemetry.', '');
    updateTelemetryRow(topic, data);
  } else if (source.startsWith('mars/actuators/')) {
    const actuator = source.replace('mars/actuators/', '');
    updateActuatorState(actuator, data.state);
    addToHistory(`${actuator} set to ${data.state ? 'ON' : 'OFF'} by rule`);
  }
}

/**
 * Gestisce la risposta a un comando attuatore
 * @param {Object} response - Risposta dal backend
 */
function handleActuatorResponse(response) {
  if (response.success) {
    console.log(`[Actuator] ${response.actuator} → ${response.action} OK`);
    addToHistory(`${response.actuator} set to ${response.action} manually`);
  } else {
    console.error(`[Actuator] Errore: ${response.message}`);
    alert(`Errore: ${response.message}`);
  }
}

/**
 * Aggiorna una card sensore con nuovo valore
 * @param {string} sensorName - Nome del sensore
 * @param {Object|string} data - Dati del sensore {value, unit} o valore stringa
 */
function updateSensorCard(sensorName, data) {
  // Estrai valore e unità
  let displayValue;
  let numericValue;
  if (typeof data === 'object' && data !== null) {
    displayValue = `${data.value} ${data.unit || ''}`;
    numericValue = parseFloat(data.value);
  } else {
    displayValue = String(data);
    numericValue = parseFloat(data);
  }

  // Aggiorna statistiche min/max
  updateSensorStats(sensorName, numericValue);

  // Aggiorna sparkline solo se il valore è valido
  if (!sensorHistory[sensorName]) sensorHistory[sensorName] = Array(SENSOR_SPARKLINE_POINTS).fill(null);
  if (!isNaN(numericValue)) {
    sensorHistory[sensorName].push(numericValue);
    if (sensorHistory[sensorName].length > SENSOR_SPARKLINE_POINTS) {
      sensorHistory[sensorName].shift();
    }
  } else {
    // Se il valore non è valido, aggiungi null per mantenere la lunghezza
    sensorHistory[sensorName].push(null);
    if (sensorHistory[sensorName].length > SENSOR_SPARKLINE_POINTS) {
      sensorHistory[sensorName].shift();
    }
  }
  updateSensorSparkline(sensorName, sensorHistory[sensorName]);

  // Aggiorna usando gli ID
  const valueEl = document.getElementById(`sensor-value-${sensorName}`);
  const badgeEl = document.getElementById(`sensor-badge-${sensorName}`);
  if (valueEl) {
    valueEl.textContent = displayValue;
  }
  if (badgeEl) {
    badgeEl.textContent = displayValue;
  }
  console.log(`[Sensor] ${sensorName} → ${displayValue}`);
}

// Inizializza lo storico dei sensori a zeri e aggiorna le polylines SVG
const SENSOR_SPARKLINE_POINTS = 8;

// Storico per sensori e telemetry
const sensorHistory = {};
function updateSensorSparkline(sensorName, historyArr) {
    const width = 300;
    const height = 80;
    const margin = 16;
    // Calcolo max/min ignorando valori nulli o non numerici
    const valid = historyArr.filter(v => typeof v === 'number' && !isNaN(v));
    const poly = document.getElementById(`chart-${sensorName}`);
     if (!poly) return;
        if (valid.length === 0) {
            poly.setAttribute('points', '');
    poly.setAttribute('stroke', 'none');
    return;
  }
    let max = Math.max(...valid);
    let min = Math.min(...valid);
    if (max === min) { max += 1; min -= 1; }
    const range = max - min;
    const step = width / (SENSOR_SPARKLINE_POINTS - 1);
    const points = historyArr.map((v, i) => {
        if (typeof v !== 'number' || isNaN(v)) return '';
        const y = height - margin - ((v - min) / range) * (height - 2 * margin);
        const x = i * step;
        return `${x},${y.toFixed(1)}`;
    }).filter(Boolean).join(' ');
    poly.setAttribute('points', points);
    poly.setAttribute('stroke-width', '2.5');
    poly.setAttribute('stroke', '#2563eb');
    poly.setAttribute('fill', 'none');
  // Aggiorna o crea la linea di base
    let base = document.getElementById(`chart-base-${sensorName}`);
  const baseY = height - margin;
  const baseLine = `0,${baseY} ${width},${baseY}`;
  if (!base) {
    const svg = poly && poly.parentElement;
    if (svg) {
      base = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      base.setAttribute('id', `chart-base-${sensorName}`);
      base.setAttribute('stroke', '#e5e7eb');
      base.setAttribute('stroke-width', '2');
      base.setAttribute('fill', 'none');
      svg.insertBefore(base, poly);
    }
  }
  if (base) {
    base.setAttribute('points', baseLine);
  }
}

// Inizializza storici a zeri
Object.keys(sensorUnits).forEach(sensorName => {
  sensorHistory[sensorName] = Array(SENSOR_SPARKLINE_POINTS).fill(0);
  updateSensorSparkline(sensorName, sensorHistory[sensorName]);
});

/**
 * Aggiorna una riga di telemetria con nuovo valore
 * @param {string} topic - Topic della telemetria (senza prefisso mars/telemetry/)
 * @param {Object|string} data - Dati {value, unit} o valore
 */
function updateTelemetryRow(topic, data) {
  // Estrai valore
  let displayValue;
  let numericValue;
  if (typeof data === 'object' && data !== null) {
    displayValue = `${data.value} ${data.unit || ''}`;
    numericValue = parseFloat(data.value);
  } else {
    displayValue = String(data);
    numericValue = parseFloat(data);
  }

  // Trova la riga per topic
  const row = document.querySelector(`.telem-row[data-topic="${topic}"]`);
  if (row) {
    const valueEl = row.querySelector('.telem-value');
    if (valueEl) {
      valueEl.textContent = displayValue;
    }
    row.dataset.value = displayValue;

    // Aggiorna sparkline
    if (!telemetryHistory[topic]) telemetryHistory[topic] = [];
    if (!isNaN(numericValue)) {
      telemetryHistory[topic].push(numericValue);
      if (telemetryHistory[topic].length > SPARKLINE_POINTS) {
        telemetryHistory[topic].shift();
      }
      updateSparkline(row, telemetryHistory[topic]);
    }

    updateTelemetrySparkline(topic, telemetryHistory[topic]);

    // Se questa riga è selezionata, aggiorna anche il pannello focused
    if (row.classList.contains('selected')) {
      document.getElementById('focused-value').textContent = displayValue;
    }
  }

  console.log(`[Telemetry] ${topic} → ${displayValue}`);
}

/**
 * Aggiorna lo stato di un actuator
 * @param {string} actuatorName - Nome dell'actuator
 * @param {boolean} state - Stato (true = ON, false = OFF)
 */
function updateActuatorState(actuatorName, state) {
  // Trova la row dell'attuatore usando data-actuator
  const row = document.querySelector(`.actuator-row[data-actuator="${actuatorName}"]`);
  if (row) {
    // Aggiorna il badge di stato
    const badge = row.querySelector('.actuator-status-badge');
    if (badge) {
      badge.classList.remove('on', 'off');
      badge.classList.add(state ? 'on' : 'off');
      badge.textContent = state ? 'ON' : 'OFF';
    }
    
    // Aggiorna timestamp
    const toggledEl = row.querySelector('.act-toggled');
    if (toggledEl) {
      const now = new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
      toggledEl.textContent = `Last toggled: ${now}`;
    }
    
    // Effetto flash
    row.classList.add('updated');
    setTimeout(() => row.classList.remove('updated'), 500);
  }
  
  // Aggiorna il conteggio degli attuatori attivi
  updateActiveActuatorsCount();
}

/**
 * Aggiorna il conteggio degli attuatori attivi
 */
function updateActiveActuatorsCount() {
  const activeBadges = document.querySelectorAll('.actuator-status-badge.on');
  const countEl = document.getElementById('actuators-active-count');
  if (countEl) {
    const count = activeBadges.length;
    countEl.textContent = `${count} active now`;
  }
}

/**
 * Aggiunge un evento alla storia
 * @param {string} text - Testo dell'evento
 */
function addToHistory(text) {
  const historyCard = document.querySelector('.history-card');
  if (!historyCard) return;
  
  const now = new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
  
  // Crea nuova riga
  const newRow = document.createElement('div');
  newRow.className = 'history-row';
  newRow.innerHTML = `<span class="history-time">${now}</span><span class="history-text">${text}</span>`;
  
  // Inserisci dopo l'h3
  const h3 = historyCard.querySelector('h3');
  if (h3 && h3.nextSibling) {
    historyCard.insertBefore(newRow, h3.nextSibling);
  }
  
  // Aggiungi anche al popup
  const popupList = document.getElementById('history-list');
  if (popupList) {
    const popupRow = newRow.cloneNode(true);
    popupList.insertBefore(popupRow, popupList.firstChild);
  }
  
  // Limita a 6 righe visibili nella card principale (escluso h3 e button)
  const allRows = historyCard.querySelectorAll('.history-row');
  if (allRows.length > 6) {
    // Rimuovi le ultime oltre le 6
    for (let i = 6; i < allRows.length; i++) {
      allRows[i].remove();
    }
  }
}

/**
 * Invia un comando all'attuatore tramite WebSocket
 * @param {string} actuatorName - Nome dell'attuatore
 * @param {string} action - Azione (ON o OFF)
 */
function sendActuatorCommand(actuatorName, action) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(`actuator:${actuatorName}:${action}`);
    console.log(`[WS] Inviato comando: ${actuatorName} → ${action}`);
  } else {
    console.error('[WS] WebSocket non connesso');
    alert('Connessione persa. Ricarica la pagina.');
  }
}


// ============== GESTIONE REGOLE ==============

/**
 * Carica le regole dal backend
 */
async function loadRules() {
  try {
    const response = await fetch('/api/rules');
    const data = await response.json();
    
    if (data.rules) {
      renderRulesTable(data.rules);
      updateRulesCount(data.rules.length);
    }
  } catch (error) {
    console.error('[Rules] Errore caricamento:', error);
  }
}

/**
 * Renderizza la tabella delle regole
 * @param {Array} rules - Array di regole
 */
function renderRulesTable(rules) {
  const tbody = document.querySelector('.rules-table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (rules.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#9ca3af;">Nessuna regola definita</td></tr>';
    return;
  }
  
  rules.forEach(rule => {
    const tr = document.createElement('tr');
    tr.dataset.ruleId = rule.id;
    
    // Costruisci la logica leggibile
    const logic = `IF ${rule.sensor_name} ${rule.operator} ${rule.threshold_value} ${rule.unit} THEN ${rule.actuator_name} → ${rule.action}`;
    
    // Formatta la data
    const date = rule.timestamp ? new Date(rule.timestamp).toLocaleDateString('it-IT') : 'N/A';
    
    tr.innerHTML = `
      <td class="rule-logic">${logic}</td>
      <td>${date}</td>
      <td><button class="btn-delete" onclick="deleteRule(${rule.id})">Delete</button></td>
    `;
    
    tbody.appendChild(tr);
  });
}

/**
 * Aggiorna il conteggio delle regole nella home
 */
function updateRulesCount(count) {
  const countEl = document.querySelector('.rules-num .num');
  if (countEl) {
    countEl.textContent = count;
  }
}

/**
 * Crea una nuova regola
 */
async function createRule() {
  // Ottieni i valori dal form
  const sensorName = document.getElementById('rule-sensor').value;
  const operator = document.getElementById('rule-operator').value;
  const thresholdValue = parseFloat(document.getElementById('rule-value').value);
  const action = document.getElementById('rule-action').value;
  const actuatorName = document.getElementById('rule-target').value;
  
  // Validazione
  if (!sensorName || !operator || isNaN(thresholdValue) || !action || !actuatorName) {
    alert('Compila tutti i campi!');
    return;
  }
  
  // Mappa sensore → unità
  const sensorUnits = {
    'greenhouse_temperature': '°C',
    'entrance_humidity': '%',
    'co2_hall': 'ppm',
    'corridor_pressure': 'kPa',
    'water_tank_level': '%',
    'hydroponic_ph': 'pH',
    'air_quality_pm25': 'μg/m³',
    'air_quality_voc': 'ppb'
  };
  
  const rule = {
    sensor_name: sensorName,
    operator: operator,
    threshold_value: thresholdValue,
    unit: sensorUnits[sensorName] || '',
    actuator_name: actuatorName,
    action: action
  };
  
  try {
    const response = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Regola creata con successo!');
      clearRuleForm();
      loadRules();
      addToHistory(`Nuova regola creata: ${sensorName} ${operator} ${thresholdValue}`);
    } else {
      alert('Errore: ' + (result.error || 'Impossibile creare la regola'));
    }
  } catch (error) {
    console.error('[Rules] Errore creazione:', error);
    alert('Errore di connessione');
  }
}

/**
 * Elimina una regola
 * @param {number} ruleId - ID della regola da eliminare
 */
async function deleteRule(ruleId) {
  if (!confirm('Sei sicuro di voler eliminare questa regola?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/rules/${ruleId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      loadRules();
      addToHistory(`Regola #${ruleId} eliminata`);
    } else {
      alert('Errore: ' + (result.error || 'Impossibile eliminare la regola'));
    }
  } catch (error) {
    console.error('[Rules] Errore eliminazione:', error);
    alert('Errore di connessione');
  }
}

/**
 * Pulisce il form delle regole
 */
function clearRuleForm() {
  document.getElementById('rule-sensor').selectedIndex = 0;
  document.getElementById('rule-operator').selectedIndex = 0;
  document.getElementById('rule-value').value = '';
  document.getElementById('rule-action').selectedIndex = 0;
  document.getElementById('rule-target').selectedIndex = 0;
}


// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
  // Inizializza le statistiche min/max con i valori correnti dal template
  initSensorStats();
  
  // Inizializza WebSocket
  initWebSocket();
  
  // Carica le regole
  loadRules();
  
  console.log('🚀 MarsOps Dashboard initialized');
});

/**
 * Inizializza le statistiche min/max leggendo i valori correnti dal DOM
 */
function initSensorStats() {
  const sensors = Object.keys(sensorUnits);
  
  sensors.forEach(sensorName => {
    const valueEl = document.getElementById(`sensor-value-${sensorName}`);
    if (valueEl) {
      // Estrai il valore numerico dal testo (es. "24.5 °C" -> 24.5)
      const text = valueEl.textContent.trim();
      const match = text.match(/^([\d.]+)/);
      if (match) {
        const value = parseFloat(match[1]);
        updateSensorStats(sensorName, value);
        console.log(`[Stats] Initialized ${sensorName}: ${value}`);
      }
    }
  });
}

// Inizializza lo storico dei sensori a zeri
Object.keys(sensorUnits).forEach(sensorName => {
  sensorHistory[sensorName] = Array(SENSOR_SPARKLINE_POINTS).fill(0);
  updateSensorSparkline(sensorName, sensorHistory[sensorName]);
});

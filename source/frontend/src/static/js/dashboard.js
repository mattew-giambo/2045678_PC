// MarsOps Dashboard JavaScript

// ============== COSTANTI GLOBALI ==============

const SENSOR_SPARKLINE_POINTS = 8;
const SPARKLINE_POINTS = 8;

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

// ============== STORICI ==============

const sensorHistory = {};
const telemetryHistory = {};

// ============== TRACCIAMENTO MIN/MAX SENSORI ==============

const sensorStats = {};

function updateSensorStats(sensorName, value) {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return;

  const unit = sensorUnits[sensorName] || '';

  if (!sensorStats[sensorName]) {
    sensorStats[sensorName] = { min: numValue, max: numValue, unit: unit };
  } else {
    if (numValue < sensorStats[sensorName].min) sensorStats[sensorName].min = numValue;
    if (numValue > sensorStats[sensorName].max) sensorStats[sensorName].max = numValue;
  }

  const minmaxEl = document.getElementById(`sensor-minmax-${sensorName}`);
  if (minmaxEl) {
    const stats = sensorStats[sensorName];
    minmaxEl.textContent = `Min ${stats.min} ${stats.unit} / Max ${stats.max} ${stats.unit} this session`;
  }
}


// ============== NAVIGAZIONE ==============

function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  el.classList.add('active');
}


// ============== TELEMETRY FOCUS ==============

function focusTelemetry(row) {
  document.querySelectorAll('.telem-row').forEach(r => r.classList.remove('selected'));
  row.classList.add('selected');

  const topic = row.dataset.topic;
  const value = row.dataset.value;
  const peak = row.dataset.peak;
  const status = row.dataset.status;
  const points = row.dataset.points;

  document.getElementById('focused-value').textContent = value;
  document.getElementById('focused-topic').textContent = topic;
  document.getElementById('focused-peak').textContent = peak;
  document.getElementById('focused-status').textContent = status;
  document.getElementById('focused-polyline').setAttribute('points', points);

  const focusedCard = document.getElementById('focused-card');
  focusedCard.style.borderColor = '#3b82f6';
  setTimeout(() => { focusedCard.style.borderColor = ''; }, 500);
}


// ============== ACTUATOR TOGGLE ==============

function toggleActuator(toggleBtn) {
  toggleBtn.classList.toggle('on');
  toggleBtn.classList.toggle('off');
}


// ============== HISTORY POPUP ==============

function openHistoryPopup() {
  const popup = document.getElementById('history-popup');
  popup.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeHistoryPopup(event) {
  if (event && event.target !== event.currentTarget) return;
  const popup = document.getElementById('history-popup');
  popup.classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeHistoryPopup();
});


// ============== WEBSOCKET ==============

let ws = null;

function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = function () {
    console.log('[WS] Connected');
  };

  ws.onmessage = function (event) {
    const data = JSON.parse(event.data);
    handleRealtimeUpdate(data);
  };

  ws.onclose = function () {
    console.log('[WS] Disconnected, reconnecting in 3s...');
    setTimeout(initWebSocket, 3000);
  };

  ws.onerror = function (error) {
    console.error('[WS] Error:', error);
  };
}

function handleRealtimeUpdate(data) {
  if (data.type === 'initial') {
    handleInitialData(data.data);
  } else if (data.type === 'update') {
    handleBrokerUpdate(data.source, data.data);
  } else if (data.type === 'actuator_response') {
    handleActuatorResponse(data);
  } else if (data.type === 'actuator_update') {
    console.log('[WS] actuator_update:', data);
    updateActuatorState(data.actuator, data.state);
    addToHistory(`${data.actuator} set to ${data.action} by rule #${data.rule_id}`);
  }
}

function handleInitialData(data) {
  console.log('[WS] Initial data:', Object.keys(data).length, 'keys');

  const actuatorNames = ['cooling_fan', 'entrance_humidifier', 'hall_ventilation', 'habitat_heater'];

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('mars/telemetry/')) {
      const topic = key.replace('mars/telemetry/', '');
      // ✅ telemetria normalizzata
      const normalized = normalizeTelemetryData(topic, value);
      updateTelemetryRow(topic, normalized);
    } else if (actuatorNames.includes(key)) {
      const state = value.state === true || value.state === 'ON' || value.action === 'ON';
      updateActuatorState(key, state);
    } else {
      // ✅ sensori normalizzati
      const normalized = normalizeSensorData(key, value);
      updateSensorCard(key, normalized);
    }
  }
}

function handleBrokerUpdate(source, data) {
  console.log('[WS] handleBrokerUpdate:', source, data);

  if (source.startsWith('mars/telemetry/')) {
    const topic = source.replace('mars/telemetry/', '');
    // ✅ normalizza telemetria
    const normalized = normalizeTelemetryData(topic, data);
    updateTelemetryRow(topic, normalized);
    addToHistory(`${topic}: ${normalized.value} ${normalized.unit || ''}`);

  } else if (source.startsWith('mars/sensors/')) {
    const sensor = source.replace('mars/sensors/', '');
    // ✅ normalizza sensori
    const normalized = normalizeSensorData(sensor, data);
    updateSensorCard(sensor, normalized);
    addToHistory(`${sensor}: ${normalized.value} ${normalized.unit || ''}`);

  } else if (source.startsWith('/topic/sensors.')) {
    const sensor = source.replace('/topic/sensors.', '');
    // ✅ normalizza sensori dal polling
    const normalized = normalizeSensorData(sensor, data);
    updateSensorCard(sensor, normalized);

  } else if (source.startsWith('/topic/telemetry.')) {
    const topic = source.replace('/topic/telemetry.', '');
    const normalized = normalizeTelemetryData(topic, data);
    updateTelemetryRow(topic, normalized);

  } else if (source.startsWith('mars/actuators/')) {
    const actuator = source.replace('mars/actuators/', '');
    updateActuatorState(actuator, data.state);
    addToHistory(`${actuator} set to ${data.state ? 'ON' : 'OFF'} by rule`);
  }
}

function handleActuatorResponse(response) {
  if (response.success) {
    console.log(`[Actuator] ${response.actuator} → ${response.action} OK`);
    addToHistory(`${response.actuator} set to ${response.action} manually`);
  } else {
    console.error(`[Actuator] Error: ${response.message}`);
    alert(`Errore: ${response.message}`);
  }
}


// ============== NORMALIZZAZIONE DATI ==============

/**
 * Normalizza i dati raw dei SENSORI in formato {value, unit}
 * Gestisce i vari formati del simulatore
 */
function normalizeSensorData(sensorName, raw) {
  if (!raw || typeof raw !== 'object') return { value: raw, unit: sensorUnits[sensorName] || '' };

  // Già nel formato corretto {value, unit}
  if (raw.value !== undefined) return raw;

  // Formato con "measurements" array (hydroponic_ph, air_quality_voc)
  if (raw.measurements && Array.isArray(raw.measurements) && raw.measurements.length > 0) {
    const first = raw.measurements[0];
    return { value: first.value, unit: first.unit || sensorUnits[sensorName] || '' };
  }

  // Formati custom per ogni sensore
  const customMap = {
    'water_tank_level':       { field: 'level_pct',      unit: '%'     },
    'air_quality_pm25':       { field: 'pm1_ug_m3',      unit: 'μg/m³' },
    'corridor_pressure':      { field: 'pressure_kpa',   unit: 'kPa'   },
    'co2_hall':               { field: 'co2_ppm',        unit: 'ppm'   },
    'entrance_humidity':      { field: 'humidity_pct',   unit: '%'     },
    'greenhouse_temperature': { field: 'temperature_c',  unit: '°C'    },
    'hydroponic_ph':          { field: 'ph',             unit: 'pH'    },
  };

  if (customMap[sensorName]) {
    const { field, unit } = customMap[sensorName];
    if (raw[field] !== undefined) {
      return { value: raw[field], unit };
    }
  }

  // Fallback: cerca il primo campo numerico non-metadata
  const skipFields = new Set(['sensor_id', 'device_id', 'captured_at', 'timestamp']);
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === 'number' && !skipFields.has(key)) {
      return { value: val, unit: sensorUnits[sensorName] || '' };
    }
  }

  console.warn(`[Normalize] Impossibile normalizzare sensore ${sensorName}:`, raw);
  return { value: 'N/A', unit: '' };
}

/**
 * Normalizza i dati raw della TELEMETRIA in formato {value, unit}
 */
function normalizeTelemetryData(topic, raw) {
  if (!raw || typeof raw !== 'object') return { value: raw, unit: '' };

  // Già nel formato corretto
  if (raw.value !== undefined) return raw;

  // ✅ Formato con "measurements" array (radiation, life_support)
  if (raw.measurements && Array.isArray(raw.measurements) && raw.measurements.length > 0) {
    const first = raw.measurements[0];
    return { value: first.value, unit: first.unit || '' };
  }

  // ✅ Mappa aggiornata con i field name reali del simulatore
  const telemMap = {
    'solar_array':       { field: 'power_kw',        unit: 'kW'    },
    'thermal_loop':      { field: 'temperature_c',   unit: '°C'    },
    'power_bus':         { field: 'power_kw',        unit: 'kW'    },
    'power_consumption': { field: 'power_kw',        unit: 'kW'    },
    'airlock':           { field: 'cycles_per_hour', unit: 'cyc/h' },
  };

  if (telemMap[topic]) {
    const { field, unit } = telemMap[topic];
    if (raw[field] !== undefined) {
      return { value: raw[field], unit };
    }
  }

  // Fallback: primo campo numerico non-metadata
  const skipFields = new Set(['airlock_id', 'event_time', 'topic', 'subsystem', 'loop', 'cumulative_kwh']);
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === 'number' && !skipFields.has(key)) {
      return { value: val, unit: '' };
    }
  }

  console.warn(`[Normalize] Impossibile normalizzare telemetria ${topic}:`, raw);
  return { value: 'N/A', unit: '' };
}

// ============== SENSOR CARDS ==============

function updateSensorCard(sensorName, data) {
  let displayValue;
  let numericValue;

  if (typeof data === 'object' && data !== null) {
    displayValue = `${data.value} ${data.unit || ''}`.trim();
    numericValue = parseFloat(data.value);
  } else {
    displayValue = String(data);
    numericValue = parseFloat(data);
  }

  updateSensorStats(sensorName, numericValue);

  if (!sensorHistory[sensorName]) sensorHistory[sensorName] = Array(SENSOR_SPARKLINE_POINTS).fill(null);
  sensorHistory[sensorName].push(!isNaN(numericValue) ? numericValue : null);
  if (sensorHistory[sensorName].length > SENSOR_SPARKLINE_POINTS) sensorHistory[sensorName].shift();

  updateSensorSparkline(sensorName, sensorHistory[sensorName]);

  const valueEl = document.getElementById(`sensor-value-${sensorName}`);
  const badgeEl = document.getElementById(`sensor-badge-${sensorName}`);
  if (valueEl) valueEl.textContent = displayValue;
  if (badgeEl) badgeEl.textContent = displayValue;

  console.log(`[Sensor] ${sensorName} → ${displayValue}`);
}

function updateSensorSparkline(sensorName, historyArr) {
  const width = 300;
  const height = 80;
  const margin = 16;

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
  const step = width / (SENSOR_SPARKLINE_POINTS - 1);

  const points = historyArr.map((v, i) => {
    if (typeof v !== 'number' || isNaN(v)) return '';
    const y = height - margin - ((v - min) / (max - min)) * (height - 2 * margin);
    const x = i * step;
    return `${x},${y.toFixed(1)}`;
  }).filter(Boolean).join(' ');

  poly.setAttribute('points', points);
  poly.setAttribute('stroke-width', '2.5');
  poly.setAttribute('stroke', '#2563eb');
  poly.setAttribute('fill', 'none');

  let base = document.getElementById(`chart-base-${sensorName}`);
  const baseY = height - margin;
  if (!base) {
    const svg = poly.parentElement;
    if (svg) {
      base = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      base.setAttribute('id', `chart-base-${sensorName}`);
      base.setAttribute('stroke', '#e5e7eb');
      base.setAttribute('stroke-width', '2');
      base.setAttribute('fill', 'none');
      svg.insertBefore(base, poly);
    }
  }
  if (base) base.setAttribute('points', `0,${baseY} ${width},${baseY}`);
}


// ============== TELEMETRY ROWS ==============

function updateTelemetryRow(topic, data) {
  let displayValue;
  let numericValue;

  if (typeof data === 'object' && data !== null) {
    displayValue = `${data.value} ${data.unit || ''}`.trim();
    numericValue = parseFloat(data.value);
  } else {
    displayValue = String(data);
    numericValue = parseFloat(data);
  }

  const row = document.querySelector(`.telem-row[data-topic="${topic}"]`);
  if (row) {
    const valueEl = row.querySelector('.telem-value');
    if (valueEl) valueEl.textContent = displayValue;
    row.dataset.value = displayValue;

    if (!telemetryHistory[topic]) telemetryHistory[topic] = [];
    if (!isNaN(numericValue)) {
      telemetryHistory[topic].push(numericValue);
      if (telemetryHistory[topic].length > SPARKLINE_POINTS) telemetryHistory[topic].shift();
      updateTelemetrySparkline(topic, telemetryHistory[topic]);
    }

    if (row.classList.contains('selected')) {
      document.getElementById('focused-value').textContent = displayValue;
    }
  }

  console.log(`[Telemetry] ${topic} → ${displayValue}`);
}

function updateTelemetrySparkline(topic, historyArr) {
  const row = document.querySelector(`.telem-row[data-topic="${topic}"]`);
  if (!row) return;

  const svg = row.querySelector('.sparkline svg');
  if (!svg) return;

  let poly = svg.querySelector('polyline');
  if (!poly) {
    poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('class', 'sparkline-path');
    svg.appendChild(poly);
  }

  const valid = historyArr.filter(v => !isNaN(v));
  if (valid.length < 2) return;

  // ✅ Dimensioni sparkline piccola (nella riga)
  const W = 100, H = 24, M = 2;

  let max = Math.max(...valid);
  let min = Math.min(...valid);
  if (max === min) { max += 1; min -= 1; }

  const step = W / (historyArr.length - 1);
  const points = historyArr.map((v, i) => {
    const y = H - M - ((v - min) / (max - min)) * (H - 2 * M);
    const x = i * step;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  poly.setAttribute('points', points);
  poly.setAttribute('fill', 'none');
  poly.setAttribute('stroke', '#3b82f6');
  poly.setAttribute('stroke-width', '1.5');

  // ✅ Aggiorna focused chart con viewBox 200x80
  if (row.classList.contains('selected')) {
    const FW = 200, FH = 80, FM = 8;
    const fStep = FW / (historyArr.length - 1);
    const focusedPoints = historyArr.map((v, i) => {
      const y = FH - FM - ((v - min) / (max - min)) * (FH - 2 * FM);
      const x = i * fStep;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    document.getElementById('focused-polyline').setAttribute('points', focusedPoints);
  }
}


// ============== ACTUATORS ==============

function updateActuatorState(actuatorName, state) {
  const row = document.querySelector(`.actuator-row[data-actuator="${actuatorName}"]`);
  if (row) {
    const badge = row.querySelector('.actuator-status-badge');
    if (badge) {
      badge.classList.remove('on', 'off');
      badge.classList.add(state ? 'on' : 'off');
      badge.textContent = state ? 'ON' : 'OFF';
    }

    const toggledEl = row.querySelector('.act-toggled');
    if (toggledEl) {
      const now = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      toggledEl.textContent = `Last toggled: ${now}`;
    }

    row.classList.add('updated');
    setTimeout(() => row.classList.remove('updated'), 500);
  }
  updateActiveActuatorsCount();
}

function updateActiveActuatorsCount() {
  const activeBadges = document.querySelectorAll('.actuator-status-badge.on');
  const countEl = document.getElementById('actuators-active-count');
  if (countEl) countEl.textContent = `${activeBadges.length} active now`;
}

function sendActuatorCommand(actuatorName, action) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(`actuator:${actuatorName}:${action}`);
    console.log(`[WS] Sent command: ${actuatorName} → ${action}`);
  } else {
    console.error('[WS] Not connected');
    alert('Connessione persa. Ricarica la pagina.');
  }
}


// ============== HISTORY ==============

function addToHistory(text) {
  const historyCard = document.querySelector('.history-card');
  if (!historyCard) return;

  const now = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const newRow = document.createElement('div');
  newRow.className = 'history-row';
  newRow.innerHTML = `<span class="history-time">${now}</span><span class="history-text">${text}</span>`;

  const h3 = historyCard.querySelector('h3');
  if (h3 && h3.nextSibling) historyCard.insertBefore(newRow, h3.nextSibling);

  const popupList = document.getElementById('history-list');
  if (popupList) {
    popupList.insertBefore(newRow.cloneNode(true), popupList.firstChild);
  }

  const allRows = historyCard.querySelectorAll('.history-row');
  if (allRows.length > 6) {
    for (let i = 6; i < allRows.length; i++) allRows[i].remove();
  }
}


// ============== RULES ==============

async function loadRules() {
  try {
    const response = await fetch('/api/rules');
    const data = await response.json();
    if (data.rules) {
      renderRulesTable(data.rules);
      updateRulesCount(data.rules.length);
    }
  } catch (error) {
    console.error('[Rules] Load error:', error);
  }
}

function renderRulesTable(rules) {
  const tbody = document.querySelector('.rules-table tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (rules.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Nessuna regola definita</td></tr>';
    return;
  }

  rules.forEach(rule => {
    const tr = document.createElement('tr');
    tr.dataset.ruleId = rule.id;
    const logic = `IF ${rule.sensor_name} ${rule.operator} ${rule.threshold_value} ${rule.unit} THEN ${rule.actuator_name} → ${rule.action}`;
    const date = rule.timestamp ? new Date(rule.timestamp).toLocaleDateString('it-IT') : 'N/A';
    tr.innerHTML = `
      <td class="rule-logic">${logic}</td>
      <td>${date}</td>
      <td><button class="btn-delete" onclick="deleteRule(${rule.id})">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function updateRulesCount(count) {
  const countEl = document.querySelector('.rules-num .num');
  if (countEl) countEl.textContent = count;
}

async function createRule() {
  const sensorName = document.getElementById('rule-sensor').value;
  const operator = document.getElementById('rule-operator').value;
  const thresholdValue = parseFloat(document.getElementById('rule-value').value);
  const action = document.getElementById('rule-action').value;
  const actuatorName = document.getElementById('rule-target').value;

  if (!sensorName || !operator || isNaN(thresholdValue) || !action || !actuatorName) {
    alert('Compila tutti i campi!');
    return;
  }

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
    console.error('[Rules] Create error:', error);
    alert('Errore di connessione');
  }
}

async function deleteRule(ruleId) {
  if (!confirm('Sei sicuro di voler eliminare questa regola?')) return;

  try {
    const response = await fetch(`/api/rules/${ruleId}`, { method: 'DELETE' });
    const result = await response.json();

    if (result.success) {
      loadRules();
      addToHistory(`Regola #${ruleId} eliminata`);
    } else {
      alert('Errore: ' + (result.error || 'Impossibile eliminare la regola'));
    }
  } catch (error) {
    console.error('[Rules] Delete error:', error);
    alert('Errore di connessione');
  }
}

function clearRuleForm() {
  document.getElementById('rule-sensor').selectedIndex = 0;
  document.getElementById('rule-operator').selectedIndex = 0;
  document.getElementById('rule-value').value = '';
  document.getElementById('rule-action').selectedIndex = 0;
  document.getElementById('rule-target').selectedIndex = 0;
}


// ============== INIT ==============

function initSensorStats() {
  Object.keys(sensorUnits).forEach(sensorName => {
    const valueEl = document.getElementById(`sensor-value-${sensorName}`);
    if (valueEl) {
      const text = valueEl.textContent.trim();
      const match = text.match(/^([\d.]+)/);
      if (match) updateSensorStats(sensorName, parseFloat(match[1]));
    }
  });
}

// Inizializza storici sensori
Object.keys(sensorUnits).forEach(sensorName => {
  sensorHistory[sensorName] = Array(SENSOR_SPARKLINE_POINTS).fill(0);
  updateSensorSparkline(sensorName, sensorHistory[sensorName]);
});

document.addEventListener('DOMContentLoaded', function () {
  initSensorStats();
  initWebSocket();
  loadRules();
  console.log('🚀 MarsOps Dashboard initialized');
});

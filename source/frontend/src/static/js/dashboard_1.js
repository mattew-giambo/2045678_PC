const charts = {};
const container = document.getElementById('charts-container');

const socket = new WebSocket('ws://localhost:8005/ws/data_stream');

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const id = data.device_id;
    const value = data.value;
    const label = data.metric_name;

    if (!charts[id]) {
        createChart(id, label, data.unit);
    }

    // Aggiungiamo il dato al grafico corrispondente
    charts[id].data.datasets[0].data.push({
        x: Date.now(),
        y: value
    });

    charts[id].update('quiet'); // Aggiorna il grafico senza animazioni pesanti
};

function createChart(id, metricName, unit) {
    const card = document.createElement('div');
    card.style = "width: 400px; border: 1px solid #ccc; padding: 10px; border-radius: 8px;";
    card.innerHTML = `<h4>${id} (${metricName})</h4><canvas id="canvas-${id}"></canvas>`;
    container.appendChild(card);

    const ctx = document.getElementById(`canvas-${id}`).getContext('2d');

    // 2. Inizializza Chart.js con il plugin streaming
    charts[id] = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `${metricName} (${unit})`,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                data: []
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'realtime', // Magia del plugin streaming
                    realtime: {
                        duration: 20000,  // Mostra gli ultimi 20 secondi
                        refresh: 1000,    // Controlla nuovi dati ogni secondo
                        delay: 1000       // Ritardo per rendere lo scorrimento fluido
                    }
                },
                y: { beginAtZero: false }
            },
            plugins: {
                streaming: { frameRate: 30 } // Ottimizza le performance
            }
        }
    });
}
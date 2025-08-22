// Global state
const state = {
    origin: null,
    token: null,
    spots: [],
    selectedSpot: null
};

// Map instances and markers
let mapSearch, mapResults, mapNav;
let originMarker = null;
let resultsMarkers = [];
let navPolyline = null;

// DOM elements
const screens = {
    search: document.getElementById('search'),
    results: document.getElementById('results'),
    details: document.getElementById('details'),
    nav: document.getElementById('nav')
};

const placeInput = document.getElementById('placeInput');
const btnGeocode = document.getElementById('btnGeocode');
const btnGPS = document.getElementById('btnGPS');
const spotsList = document.getElementById('spotsList');
const spotsCount = document.getElementById('spotsCount');
const btnBackToSearch = document.getElementById('btnBackToSearch');
const detailsMetaEl = document.getElementById('detailsMeta');
const fishProbEl = document.getElementById('fishProb');
const fishKvsEl = document.getElementById('fishKvs');
const weatherKvsEl = document.getElementById('weatherKvs');
const weatherSourceEl = document.getElementById('weatherSource');
const btnSelectSpot = document.getElementById('btnSelectSpot');
const btnBackToResults = document.getElementById('btnBackToResults');
const externalNav = document.getElementById('externalNav');
const btnBackToDetails = document.getElementById('btnBackToDetails');

// Initialize maps
function initMaps() {
    mapSearch = L.map('mapSearch').setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapSearch);

    mapResults = L.map('mapResults').setView([51.505, -0.09], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapResults);

    mapNav = L.map('mapNav').setView([51.505, -0.09], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapNav);
}

// Show a specific screen
function show(screenName) {
    Object.keys(screens).forEach(key => {
        screens[key].classList.add('hidden');
    });
    screens[screenName].classList.remove('hidden');
}

// Geocode a place name (mock implementation)
async function geocodePlace(q) {
    // In a real app, you would use a geocoding service like Nominatim
    // This is a mock implementation that returns fixed coordinates
    const mockLocations = {
        'london': { lat: 51.5074, lon: -0.1278, name: 'London' },
        'new york': { lat: 40.7128, lon: -74.0060, name: 'New York' },
        'tokyo': { lat: 35.6895, lon: 139.6917, name: 'Tokyo' },
        'paris': { lat: 48.8566, lon: 2.3522, name: 'Paris' },
        'sydney': { lat: -33.8688, lon: 151.2093, name: 'Sydney' }
    };

    const normalizedQuery = q.toLowerCase().trim();
    return mockLocations[normalizedQuery] || { lat: 51.5074, lon: -0.1278, name: q };
}

// Set the origin point
function setOrigin(lat, lon, label) {
    state.origin = { lat, lon, label };
    
    if (originMarker) originMarker.remove();
    originMarker = L.marker([lat, lon]).addTo(mapSearch).bindPopup(label).openPopup();
    mapSearch.setView([lat, lon], 12);
}

// Event listeners
btnGeocode.addEventListener('click', async () => {
    const q = placeInput.value.trim(); 
    if (!q) return;
    
    const res = await geocodePlace(q);
    if (res) { 
        setOrigin(res.lat, res.lon, res.name); 
        await fetchHotspots(); 
    } else {
        alert('Place not found. Try another search.');
    }
});

btnGPS.addEventListener('click', () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    
    navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude, longitude } = pos.coords;
        setOrigin(latitude, longitude, 'My Location');
        await fetchHotspots();
    }, err => alert('Failed to get location: ' + err.message));
});

// Fetch hotspots from the server
async function fetchHotspots() {
    const res = await fetch('/api/hotspots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: state.origin })
    });
    
    const js = await res.json();
    if (!res.ok) return alert(js.error || 'Failed to fetch hotspots');
    
    state.token = js.token; 
    state.spots = js.spots;
    
    // Clear previous markers
    resultsMarkers.forEach(m => m.remove()); 
    resultsMarkers = [];
    
    // Set map view to origin
    mapResults.setView([state.origin.lat, state.origin.lon], 9);
    
    // Add origin marker
    L.marker([state.origin.lat, state.origin.lon])
        .addTo(mapResults)
        .bindPopup('Start');
    
    // Add hotspots markers
    js.spots.forEach(s => {
        const m = L.marker([s.lat, s.lon])
            .addTo(mapResults)
            .bindPopup(`${s.id}`);
        resultsMarkers.push(m);
    });
    
    // Update spots list
    spotsList.innerHTML = '';
    spotsCount.textContent = js.spots.length;
    
    js.spots.sort((a, b) => a.distance_km - b.distance_km)
        .forEach(s => {
            const li = document.createElement('li');
            const left = document.createElement('div');
            const right = document.createElement('div');
            
            left.innerHTML = `<div class="title">${s.id}</div>`;
            right.textContent = `${s.distance_km} km`;
            
            li.appendChild(left);
            li.appendChild(right);
            li.addEventListener('click', () => selectSpot(s));
            
            spotsList.appendChild(li);
        });
    
    show('results');
}

// Select a spot and fetch its details
async function selectSpot(s) {
    state.selectedSpot = s;
    
    const res = await fetch(`/api/spot/${state.token}/${s.id}`);
    const js = await res.json();
    
    if (!res.ok) return alert(js.error || 'Failed to fetch spot details');
    
    // Update details view
    detailsMetaEl.innerHTML = `
        <div class="card">
            Selected: <strong>${s.id}</strong> — 
            Distance: <strong>${s.distance_km} km</strong><br>
            Coords: ${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}
        </div>
    `;
    
    fishProbEl.textContent = js.fish_card.probability + '%';
    
    fishKvsEl.innerHTML = '';
    const f = js.fish_card.details;
    Object.entries(f).forEach(([k, v]) => {
        const div = document.createElement('div');
        div.className = 'kv';
        div.textContent = `${k}: ${v}`;
        fishKvsEl.appendChild(div);
    });
    
    weatherKvsEl.innerHTML = '';
    const w = js.weather_card;
    const wkvs = {
        'Wind speed (m/s)': w.wind_speed,
        'Temp (°C)': w.temp,
        'Condition': w.condition
    };
    
    Object.entries(wkvs).forEach(([k, v]) => {
        const div = document.createElement('div');
        div.className = 'kv';
        div.textContent = `${k}: ${v}`;
        weatherKvsEl.appendChild(div);
    });
    
    weatherSourceEl.textContent = `Source: ${w.source}`;
    
    show('details');
}

// Navigation functions
btnSelectSpot.addEventListener('click', () => {
    if (!state.origin || !state.selectedSpot) return;
    
    if (navPolyline) navPolyline.remove();
    
    navPolyline = L.polyline([
        [state.origin.lat, state.origin.lon],
        [state.selectedSpot.lat, state.selectedSpot.lon]
    ]).addTo(mapNav);
    
    mapNav.fitBounds(navPolyline.getBounds(), { padding: [30, 30] });
    
    externalNav.href = `https://www.google.com/maps/dir/${state.origin.lat},${state.origin.lon}/${state.selectedSpot.lat},${state.selectedSpot.lon}`;
    externalNav.textContent = 'Open turn-by-turn in Google Maps';
    
    show('nav');
});

// Back navigation
btnBackToSearch.addEventListener('click', () => show('search'));
btnBackToResults.addEventListener('click', () => show('results'));
btnBackToDetails.addEventListener('click', () => show('details'));

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initMaps();
    show('search');
});
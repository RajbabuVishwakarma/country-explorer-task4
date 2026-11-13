const form = document.getElementById('form');
const input = document.getElementById('q');
const out = document.getElementById('out');
const recent = document.getElementById('recent');
const STORAGE_KEY = 'recentCities';

// Weather code -> [highest code in group, icon, text]
const WEATHER = [
  [0, '☀️', 'Clear sky'], [2, '⛅', 'Partly cloudy'], [3, '☁️', 'Overcast'],
  [48, '🌫️', 'Foggy'], [57, '🌦️', 'Drizzle'], [67, '🌧️', 'Rain'],
  [77, '❄️', 'Snow'], [82, '🌧️', 'Rain showers'], [86, '🌨️', 'Snow showers'],
  [99, '⛈️', 'Thunderstorm']
];
const describe = code => WEATHER.find(w => code <= w[0]) || WEATHER[0];

// ----- localStorage: last three searches -----
const loadRecent = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
};
function saveRecent(name) {
  const list = [name, ...loadRecent().filter(n => n !== name)].slice(0, 3);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
  drawRecent();
}
function drawRecent() {
  const list = loadRecent();
  recent.replaceChildren(...list.map(name => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.addEventListener('click', () => { input.value = name; search(name); });
    return b;
  }));
  document.getElementById('recent-wrap').hidden = !list.length;
}

// ----- UI states -----
function showMessage(text, isError) {
  const p = document.createElement('p');
  p.className = 'msg' + (isError ? ' error' : '');
  p.textContent = text;
  out.replaceChildren(p);
}
function showLoading() {
  out.innerHTML = '<div class="spinner" role="status" aria-label="Loading"></div>';
}
function showWeather(place, now, units) {
  const [, icon, text] = describe(now.weather_code);
  const where = [place.admin1, place.country].filter(Boolean).join(', ');
  out.innerHTML = `
    <article class="card">
      <h2>${place.name}</h2>
      <p class="place">${where}</p>
      <div class="main">
        <span class="icon" aria-hidden="true">${icon}</span>
        <div><div class="temp">${Math.round(now.temperature_2m)}${units.temperature_2m}</div><div class="cond">${text}</div></div>
      </div>
      <dl>
        <dt>Feels like</dt><dd>${Math.round(now.apparent_temperature)}${units.apparent_temperature}</dd>
        <dt>Humidity</dt><dd>${now.relative_humidity_2m}${units.relative_humidity_2m}</dd>
        <dt>Wind speed</dt><dd>${now.wind_speed_10m} ${units.wind_speed_10m}</dd>
      </dl>
    </article>`;
}

// ----- Fetch with async/await -----
async function search(query) {
  query = query.trim();
  if (!query) return showMessage('Type a city name to start searching.', true);
  showLoading();
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
    if (!geoRes.ok) throw new Error('Geocoding failed');
    const geo = await geoRes.json();
    if (!geo.results) return showMessage(`No city found for "${query}". Check the spelling and try again.`, true);
    const place = geo.results[0];

    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`);
    if (!wRes.ok) throw new Error('Weather request failed');
    const data = await wRes.json();

    showWeather(place, data.current, data.current_units);
    saveRecent(place.name);
  } catch (err) {
    showMessage('Could not load weather. Check your internet connection and try again.', true);
  }
}

form.addEventListener('submit', e => { e.preventDefault(); search(input.value); });
drawRecent();

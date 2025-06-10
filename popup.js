const API_KEY = "d559fb325173c9587ae81282375ae182"; // Remplace par ta clé API

function showCurrentWeather(data) {
  const currentWeatherDiv = document.getElementById("current-weather");
  if (!data || !data.weather) {
    currentWeatherDiv.innerHTML = "<p>Ville inconnue ou erreur météo.</p>";
    return;
  }
  const icon = data.weather[0].icon;
  const temp = Math.round(data.main.temp);
  const desc = data.weather[0].description;
  const city = data.name;
  const feelsLike = Math.round(data.main.feels_like);
  const humidity = data.main.humidity;
  
  currentWeatherDiv.innerHTML = `
    <div style="text-align:center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" style="width: 80px; height: 80px;" />
      <h2 style="margin: 5px 0;">${temp}°C</h2>
      <p style="margin: 5px 0; text-transform: capitalize;">${desc}</p>
      <p style="font-size:0.9em;color:#888; margin: 5px 0;">${city}</p>
      <div style="display: flex; justify-content: space-around; font-size: 0.8em; color: #666; margin-top: 8px;">
        <span>Ressenti: ${feelsLike}°C</span>
        <span>Humidité: ${humidity}%</span>
      </div>
    </div>
  `;
}

function show7DaysForecast(data) {
  const forecastDiv = document.getElementById("forecast");

  if (!data || !data.list) {
    forecastDiv.innerHTML = "<p>Prévisions indisponibles.</p>";
    return;
  }

  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  let forecastHTML = '';

  // Regrouper les prévisions par jour (clé: YYYY-MM-DD)
  const dailyForecasts = {};
  data.list.forEach(forecast => {
    const date = new Date(forecast.dt * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;
    if (!dailyForecasts[key]) {
      dailyForecasts[key] = {
        date: new Date(Date.UTC(y, date.getUTCMonth(), date.getUTCDate())),
        temps: [],
        icons: [],
        descriptions: []
      };
    }
    dailyForecasts[key].temps.push(forecast.main.temp);
    dailyForecasts[key].icons.push(forecast.weather[0].icon);
    dailyForecasts[key].descriptions.push(forecast.weather[0].description);
  });

  // Récupérer la date du jour en UTC
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Trier les dates
  const sortedDays = Object.values(dailyForecasts).sort((a, b) => a.date - b.date);

  sortedDays.forEach((forecast, index) => {
    const date = forecast.date;
    let dayName;
    if (date.getTime() === todayUTC.getTime()) {
      dayName = "Aujourd'hui";
    } else {
      dayName = days[date.getUTCDay()];
    }
    const tempMax = Math.round(Math.max(...forecast.temps));
    const tempMin = Math.round(Math.min(...forecast.temps));
    const icon = forecast.icons[Math.floor(forecast.icons.length / 2)];
    const desc = forecast.descriptions[Math.floor(forecast.descriptions.length / 2)];

    forecastHTML += `
      <div class="forecast-item">
        <div class="day-name">${dayName}</div>
        <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}" />
        <div class="desc">${desc}</div>
        <div class="temps"><strong>${tempMax}°</strong> <span style="color: #888;">${tempMin}°</span></div>
      </div>
    `;
  });

  forecastDiv.innerHTML = forecastHTML;
}

function fetchWeather(city) {
  document.getElementById("current-weather").innerHTML = "<p>Chargement...</p>";
  fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=fr&appid=${API_KEY}`
  )
    .then((res) => res.json())
    .then(showCurrentWeather)
    .catch(() => {
      document.getElementById("weather").innerHTML = "<p>Erreur de connexion.</p>";
    });
}

function fetchWeatherAndForecast(city) {
  document.getElementById("forecast").innerHTML = "";
  document.getElementById("current-weather").innerHTML = "<p>Chargement...</p>";

  // D'abord récupérer les coordonnées de la ville
  fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
  )
    .then((res) => res.json())
    .then((geoData) => {
      if (!geoData || geoData.length === 0) {
        throw new Error("Ville non trouvée");
      }
      
      const lat = geoData[0].lat;
      const lon = geoData[0].lon;
      
      // Récupérer la météo actuelle
      const currentWeatherPromise = fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${API_KEY}`
      ).then(res => res.json());
      
      // Récupérer les prévisions 5 jours
      const forecastPromise = fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${API_KEY}`
      ).then(res => res.json());
      
      return Promise.all([currentWeatherPromise, forecastPromise]);
    })
    .then(([currentData, forecastData]) => {
      showCurrentWeather(currentData);
      show7DaysForecast(forecastData);
    })
    .catch(() => {
      document.getElementById("current-weather").innerHTML = "<p>Erreur de connexion ou ville introuvable.</p>";
      document.getElementById("forecast").innerHTML = "";
    });
}

// --- AUTOCOMPLETE ---
const cityInput = document.getElementById("city-input");
const autocompleteList = document.getElementById("autocomplete-list");

cityInput.addEventListener("input", function () {
  const query = this.value.trim();
  if (query.length < 2) {
    autocompleteList.innerHTML = "";
    return;
  }
  fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
  )
    .then((res) => res.json())
    .then((results) => {
      autocompleteList.innerHTML = "";
      results.forEach((place) => {
        const li = document.createElement("li");
        li.textContent = `${place.name}${place.state ? ', ' + place.state : ''}, ${place.country}`;
        li.addEventListener("click", () => {
          cityInput.value = place.name;
          autocompleteList.innerHTML = "";
          fetchWeatherAndForecast(place.name);
        });
        autocompleteList.appendChild(li);
      });
    });
});

// Fermer la liste si on clique ailleurs
document.addEventListener("click", (e) => {
  if (!cityInput.contains(e.target) && !autocompleteList.contains(e.target)) {
    autocompleteList.innerHTML = "";
  }
});

document.getElementById("city-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) {
    fetchWeatherAndForecast(city);
    autocompleteList.innerHTML = "";
  }
});
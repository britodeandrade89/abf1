// ... (rest of the file content until updateWeather function)

// Fix: Declare feather variable to resolve TypeScript error
declare var feather: any;

function updateWeather() {
    // Função auxiliar para renderizar o widget
    const renderWidget = (temp: number, max: number, min: number, location: string, code: number) => {
        let weatherIcon = 'sun';
        if (code >= 1 && code <= 3) weatherIcon = 'cloud';
        if (code >= 45 && code <= 48) weatherIcon = 'menu'; // fog
        if (code >= 51 && code <= 67) weatherIcon = 'cloud-drizzle';
        if (code >= 71 && code <= 77) weatherIcon = 'cloud-snow';
        if (code >= 80 && code <= 82) weatherIcon = 'cloud-rain';
        if (code >= 95) weatherIcon = 'cloud-lightning';

        const weatherWidget = document.getElementById('weather-widget');
        if (weatherWidget) {
            weatherWidget.innerHTML = `
                 <div class="flex flex-col items-end">
                     <div class="flex items-center gap-1 mb-1">
                        <i data-feather="map-pin" class="w-3 h-3 text-red-500"></i>
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide max-w-[100px] truncate text-right">${location}</span>
                     </div>
                     <div class="weather-item">
                        <i data-feather="${weatherIcon}" class="w-4 h-4 mr-1 text-yellow-400"></i>
                        <span class="text-xs font-bold text-white">${Math.round(temp)}°C</span>
                    </div>
                    <span class="text-[10px] text-gray-400 mt-1">Máx: ${Math.round(max)}° / Mín: ${Math.round(min)}°</span>
                </div>
            `;
            if (typeof feather !== 'undefined') feather.replace();
        }
    };

    // Dados de Fallback (Rio de Janeiro)
    const fallbackData = {
        lat: -22.9068,
        lon: -43.1729,
        location: "Rio de Janeiro"
    };

    const fetchWeatherData = (lat: number, lon: number, locationName: string) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                const currentTemp = data.current.temperature_2m;
                const maxTemp = data.daily.temperature_2m_max[0];
                const minTemp = data.daily.temperature_2m_min[0];
                const weatherCode = data.current.weather_code;
                renderWidget(currentTemp, maxTemp, minTemp, locationName, weatherCode);
            })
            .catch(error => {
                console.error('Erro ao obter clima:', error);
                // Mesmo se falhar o fetch, tenta renderizar algo fixo ou 'Erro'
            });
    };

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async function (position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Fetch Location Name
            let locationName = "Minha Localização";
            try {
                const geoResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`);
                const geoData = await geoResponse.json();
                locationName = geoData.locality || geoData.city || geoData.principalSubdivision || "Local Desconhecido";
            } catch (error) {
                console.warn("Erro ao obter nome da localização, usando coords");
            }

            fetchWeatherData(lat, lon, locationName);

        }, function(error) {
            console.warn("Geolocalização negada ou falhou. Usando Rio de Janeiro como padrão.");
            fetchWeatherData(fallbackData.lat, fallbackData.lon, fallbackData.location);
        });
    } else {
        // Browser não suporta
        fetchWeatherData(fallbackData.lat, fallbackData.lon, fallbackData.location);
    }
}
// Export updateWeather to global scope for PWA re-focus or manual triggers if needed
(window as any).updateWeather = updateWeather;

// --- MISSING SCREEN RENDER FUNCTIONS ---
// ... (rest of the file remains unchanged)
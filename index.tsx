import { GoogleGenAI } from "@google/genai";

// Globals defined by imported scripts
declare var feather: any;
declare var Chart: any;
declare var marked: any;
declare var L: any; // Leaflet global

// Timer Variables (Indoor)
let workoutTimerInterval: number | null = null;
let workoutStartTime: Date | null = null;

// Outdoor Tracking Variables
let map: any = null;
let mapPolyline: any = null;
let trackingPath: any[] = [];
let trackingWatchId: number | null = null;
let trackingTimerInterval: number | null = null;
let trackingStartTime: number = 0;
let trackingElapsedTime: number = 0; // ms
let trackingDistance: number = 0; // meters
let isTrackingPaused: boolean = false;
let currentActivityType: string = "";

let currentCalendarDate = new Date(); // Track calendar state

// --- DATABASE ---
const database = {
    users: [
        { id: 1, name: 'André Brito', email: 'britodeandrade@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3Zy4n6ZmWp9DW98VtXpO.jpeg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: '2025-01-15', stressData: { assessments: [] } }
    ],
    trainingPlans: { treinosA: {}, treinosB: {}, periodizacao: {} },
    userRunningWorkouts: {},
    completedWorkouts: {},
    activeSessions: {},
    raceCalendar: []
};

// --- STORAGE ---
const STORAGE_KEYS = {
    DATABASE: 'abfit_database_v2',
    CURRENT_USER: 'abfit_current_user'
};

function getDatabase() {
    const saved = localStorage.getItem(STORAGE_KEYS.DATABASE);
    return saved ? JSON.parse(saved) : database;
}

function saveDatabase(db: any) {
    localStorage.setItem(STORAGE_KEYS.DATABASE, JSON.stringify(db));
}

function getCurrentUser() { return localStorage.getItem(STORAGE_KEYS.CURRENT_USER); }
function setCurrentUser(email: string) { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, email); }

// Helper: Get Monday of the current week
function getMonday(d: Date) {
  d = new Date(d);
  var day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

// Helper: Format date as DD/MM/YYYY
function formatDate(d: Date) {
    return d.toLocaleDateString('pt-BR');
}

// Helper: Format Duration (HH:MM:SS)
function formatDuration(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// Helper: Calculate Pace (min/km)
function calculatePace(ms: number, meters: number) {
    if (meters === 0) return "--:--";
    const km = meters / 1000;
    const minutes = ms / 1000 / 60;
    const paceDec = minutes / km;
    const paceMin = Math.floor(paceDec);
    const paceSec = Math.floor((paceDec - paceMin) * 60).toString().padStart(2, '0');
    return `${paceMin}:${paceSec}`;
}

// --- INITIALIZATION ---
function initializeDatabase() {
    const db = getDatabase();
    const email = 'britodeandrade@gmail.com';
    
    // Default Workout Data (André Brito)
    const treinosA = [
        { name: 'Agachamento livre com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/77Uth2fQUxtPXvqu1UCb.png', sets: '3', reps: '10', carga: '12', obs: 'Método Simples' },
        { name: 'Leg press horizontal', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '10', carga: '40', obs: 'Método Simples' },
        { name: 'Leg press horizontal unilateral', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '10', carga: '20', obs: 'Método Simples' },
        { name: 'Cadeira extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ZEcYnpswJBmu24PWZXwq.jpg', sets: '3', reps: '10', carga: '10', obs: 'Método Simples' },
        { name: 'Cadeira extensora unilateral', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ZEcYnpswJBmu24PWZXwq.jpg', sets: '3', reps: '10', carga: '5', obs: 'Método Simples' },
        { name: 'Supino aberto com HBC no banco inclinado', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '10', carga: '12', obs: 'Método Simples' },
        { name: 'Crucifixo aberto com HBC no banco inclinado', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '10', carga: '8', obs: 'Método Simples' },
        { name: 'Desenvolvimento aberto com HBC no banco 75 graus', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/TYYs8dYewPrOA5MB0LKt.png', sets: '3', reps: '10', carga: '8', obs: 'Método Simples' },
        { name: 'Extensão de cotovelos aberto no solo', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '10', carga: '0', obs: 'Método Simples' },
        { name: 'Extensão de cotovelos fechado no solo', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '10', carga: '0', obs: 'Método Simples' },
        { name: 'Abdominal remador no solo', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/sGz9YqGUPf7lIqX8vULE.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples' }
    ];

    const treinosB = [
        { name: 'Agachamento sumô com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/sGz9YqGUPf7lIqX8vULE.png', sets: '3', reps: '12', carga: '16', obs: 'Método Simples' },
        { name: 'Extensão de quadril com caneleira', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '12', carga: '5', obs: 'Método Simples' },
        { name: 'Flexão de joelho em pé com caneleira', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ZEcYnpswJBmu24PWZXwq.jpg', sets: '3', reps: '12', carga: '5', obs: 'Método Simples' },
        { name: 'Cadeira flexora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ZEcYnpswJBmu24PWZXwq.jpg', sets: '3', reps: '12', carga: '15', obs: 'Método Simples' },
        { name: 'Cadeira abdutora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '12', carga: '20', obs: 'Método Simples' },
        { name: 'Remada declinado no smith', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '12', carga: '10', obs: 'Método Simples' },
        { name: 'Remada curvada supinada no cross', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '12', carga: '15', obs: 'Método Simples' },
        { name: 'Bíceps em pé no cross barra reta', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/TYYs8dYewPrOA5MB0LKt.png', sets: '3', reps: '12', carga: '10', obs: 'Método Simples' },
        { name: 'Puxada aberta no pulley alto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '12', carga: '25', obs: 'Método Simples' },
        { name: 'Puxada supinada no pulley alto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '12', carga: '25', obs: 'Método Simples' },
        { name: 'Abdominal remador no solo', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/sGz9YqGUPf7lIqX8vULE.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples' }
    ];

    // UPDATED RUNNING WORKOUTS (Structured)
    const runningWorkouts = [
        { 
            title: 'Tiros de 400m', 
            type: 'Intervalado', 
            duration: '45 min', 
            distance: '6-7 km', 
            aquecimento: '10\' de trote leve (Z1/Z2) para elevar a FC.',
            principal: '10x 400m em ritmo forte (Z4/Z5).<br>Intervalo de 1\'30" caminhando entre os tiros.',
            desaquecimento: '10\' de trote regenerativo (Z1) para soltar.' 
        },
        { 
            title: 'Longo de Rodagem', 
            type: 'Volume', 
            duration: '1h 10min', 
            distance: '12 km', 
            aquecimento: '5\' de caminhada rápida.',
            principal: '12km em ritmo constante e confortável (Z2/Z3).<br>Foco na constância e respiração.',
            desaquecimento: '5\' de caminhada leve.' 
        },
        { 
            title: 'Tempo Run', 
            type: 'Ritmo', 
            duration: '50 min', 
            distance: '8 km', 
            aquecimento: '15\' de trote progressivo.',
            principal: '20\' em ritmo de prova (Limiar de Lactato - Z4).<br>Sustentar o desconforto.',
            desaquecimento: '15\' de trote leve.' 
        },
        { 
            title: 'Regenerativo', 
            type: 'Recuperação', 
            duration: '30 min', 
            distance: '4-5 km', 
            aquecimento: 'N/A',
            principal: '30\' de corrida muito leve (Z1/Z2).<br>Apenas para circular sangue.',
            desaquecimento: 'Alongamento leve.' 
        }
    ];

    // UPDATED RACE CALENDAR 2026 (RJ)
    const raceCalendar = [
        { name: 'Corrida de São Sebastião', date: '2026-01-20', location: 'Aterro do Flamengo', distance: '5km / 10km' },
        { name: 'Circuito das Estações - Outono', date: '2026-03-15', location: 'Aterro do Flamengo', distance: '5km / 10km' },
        { name: 'Corrida da Ponte', date: '2026-05-24', location: 'Niterói -> Rio', distance: '21km' },
        { name: 'Maratona do Rio', date: '2026-06-14', location: 'Aterro do Flamengo', distance: '5km / 10km / 21km / 42km' },
        { name: 'Circuito das Estações - Inverno', date: '2026-07-12', location: 'Aterro do Flamengo', distance: '5km / 10km' },
        { name: 'Meia Maratona Internacional do Rio', date: '2026-08-16', location: 'Leblon -> Flamengo', distance: '21km' },
        { name: 'Circuito das Estações - Primavera', date: '2026-09-13', location: 'Copacabana', distance: '5km / 10km' },
        { name: 'Night Run - Etapa Rio', date: '2026-10-24', location: 'Aterro do Flamengo', distance: '5km / 10km' },
        { name: 'Rio S-21K', date: '2026-11-22', location: 'Praia do Leblon', distance: '10km / 21km' },
        { name: 'Circuito das Estações - Verão', date: '2026-12-06', location: 'Aterro do Flamengo', distance: '5km / 10km' }
    ];

    // Periodization History Data - DYNAMIC DATES
    const startDate = getMonday(new Date());
    
    const addWeeks = (date: Date, weeks: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + (weeks * 7));
        return result;
    };

    const p1Start = startDate;
    const p1End = addWeeks(p1Start, 2); 
    const p2Start = new Date(p1End);
    p2Start.setDate(p2Start.getDate() + 1);
    const p2End = addWeeks(p2Start, 2); 
    const p3Start = new Date(p2End);
    p3Start.setDate(p3Start.getDate() + 1);
    const p3End = addWeeks(p3Start, 2); 
    const p4Start = new Date(p3End);
    p4Start.setDate(p4Start.getDate() + 1);
    const p4End = addWeeks(p4Start, 2);

    const periodizacaoTemplate = [
        { 
            id: 1, 
            fase: 'Adaptação', 
            inicio: formatDate(p1Start), 
            fim: formatDate(p1End), 
            objetivo: 'Resistência Muscular', 
            status: 'Não Começou', 
            series: '3',
            repeticoes: '10', 
            detalhes: 'Fase de adaptação anatômica. Foco na execução correta e cadência controlada. Utilize cargas moderadas para preparar as articulações.' 
        },
        { 
            id: 2, 
            fase: 'Hipertrofia I', 
            inicio: formatDate(p2Start), 
            fim: formatDate(p2End), 
            objetivo: 'Ganho de Massa', 
            status: 'Não Começou', 
            series: '3',
            repeticoes: '10',
            detalhes: 'Fase principal de construção muscular. Volume de treino moderado a alto. Carga desafiadora, buscando a falha próxima da décima repetição.' 
        },
        { 
            id: 3, 
            fase: 'Hipertrofia II', 
            inicio: formatDate(p3Start), 
            fim: formatDate(p3End), 
            objetivo: 'Definição e Volume', 
            status: 'Não Começou', 
            series: '3',
            repeticoes: '10',
            detalhes: 'Intensificação do treino para refinar a musculatura. Uso de técnicas avançadas como dropsets na última série para aumentar o estresse metabólico.' 
        },
        { 
            id: 4, 
            fase: 'Força Pura', 
            inicio: formatDate(p4Start), 
            fim: formatDate(p4End), 
            objetivo: 'Aumento de Carga', 
            status: 'Não Começou', 
            series: '4',
            repeticoes: '4-6',
            detalhes: 'Foco no aumento de força bruta e tensão mecânica. Cargas altas e descanso maior entre séries (2 a 3 minutos).' 
        }
    ];

    // Ensure plans exist for user
    if (!db.trainingPlans.treinosA[email]) db.trainingPlans.treinosA[email] = treinosA;
    if (!db.trainingPlans.treinosB[email]) db.trainingPlans.treinosB[email] = treinosB;
    
    // FORCE UPDATE RUNNING WORKOUTS (to fix structure issues)
    db.userRunningWorkouts[email] = runningWorkouts;
    
    // FORCE UPDATE RACE CALENDAR FOR 2026
    db.raceCalendar = raceCalendar;
    
    // Merge existing status with new dates/template
    const existingPeriodization = db.trainingPlans.periodizacao[email] || [];
    
    const mergedPeriodization = periodizacaoTemplate.map(newItem => {
        const existingItem = existingPeriodization.find((oldItem: any) => oldItem.id === newItem.id);
        if (existingItem) {
            return { ...newItem, status: existingItem.status };
        }
        return newItem;
    });

    db.trainingPlans.periodizacao[email] = mergedPeriodization;
    
    saveDatabase(db);
}

// --- WEATHER FETCHING ---
async function fetchWeather() {
    const widget = document.getElementById('weather-widget');
    if (!widget) return;

    // Default to Rio
    let lat = -22.9068;
    let lon = -43.1729;
    let city = "Rio de Janeiro";

    try {
        const position: any = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        
        // Simple reverse geocode attempt
        try {
             const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`);
             const geoData = await geoRes.json();
             if(geoData.city) city = geoData.city;
             else if (geoData.locality) city = geoData.locality;
        } catch(e) {
            console.log("Geo lookup failed, using coordinates or default");
        }

    } catch (e) {
        console.log("Geolocation denied or error, using default Rio");
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();

        const currentTemp = Math.round(data.current.temperature_2m);
        const minTemp = Math.round(data.daily.temperature_2m_min[0]);
        const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
        const weatherCode = data.current.weather_code;

        // Map WMO code to icon/color
        let iconName = 'sun';
        let iconColor = 'text-yellow-400';
        
        if (weatherCode >= 1 && weatherCode <= 3) { iconName = 'cloud'; iconColor = 'text-gray-300'; }
        else if (weatherCode >= 45 && weatherCode <= 48) { iconName = 'align-justify'; iconColor = 'text-gray-400'; } // Fog approximation
        else if (weatherCode >= 51 && weatherCode <= 67) { iconName = 'cloud-drizzle'; iconColor = 'text-blue-400'; }
        else if (weatherCode >= 71) { iconName = 'cloud-rain'; iconColor = 'text-blue-500'; }
        else if (weatherCode >= 95) { iconName = 'cloud-lightning'; iconColor = 'text-yellow-600'; }
        
        widget.innerHTML = `
            <div class="flex items-center justify-end gap-2">
                <i data-feather="${iconName}" class="${iconColor} w-6 h-6"></i>
                <span class="text-xl font-bold text-white">${currentTemp}°C</span>
            </div>
            <p class="text-[10px] text-gray-400 font-medium">${city}</p>
            <div class="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                <span class="flex items-center"><i class="fas fa-arrow-down text-blue-400 text-[8px] mr-0.5"></i> ${minTemp}°</span>
                <span class="flex items-center"><i class="fas fa-arrow-up text-red-400 text-[8px] mr-0.5"></i> ${maxTemp}°</span>
            </div>
        `;
        if (typeof feather !== 'undefined') feather.replace();

    } catch (err) {
        console.error("Weather fetch error", err);
        widget.innerHTML = '<span class="text-xs text-red-500">Erro ao carregar clima</span>';
    }
}

// --- AI ANALYSIS LOGIC ---
async function generateAIAnalysis() {
    const btn = document.getElementById('generate-analysis-btn');
    const spinner = document.getElementById('ai-analysis-spinner');
    const resultDiv = document.getElementById('ai-analysis-result');
    const db = getDatabase();
    const email = getCurrentUser();

    if (!btn || !spinner || !resultDiv) return;

    btn.classList.add('hidden');
    spinner.classList.remove('hidden');
    resultDiv.classList.add('hidden');

    try {
        const userPlans = db.trainingPlans.periodizacao?.[email] || [];
        // Construct a simple context
        const context = {
            periodization: userPlans.map((p: any) => `${p.fase}: ${p.status} (Obj: ${p.objetivo})`).join('\n')
        };

        const prompt = `
            Analise o progresso deste aluno de musculação com base no seguinte histórico de periodização:
            ${context.periodization}

            Forneça 3 insights curtos e motivacionais sobre o que esperar das próximas fases e como otimizar os resultados.
            Use formatação HTML simples (negrito, quebras de linha). Responda em português do Brasil, tom de treinador experiente.
        `;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        resultDiv.innerHTML = response.text;
        resultDiv.classList.remove('hidden');

    } catch (error) {
        console.error("AI Error:", error);
        resultDiv.innerHTML = "<p class='text-red-400'>Erro ao gerar análise. Tente novamente.</p>";
        resultDiv.classList.remove('hidden');
    } finally {
        spinner.classList.add('hidden');
        btn.classList.remove('hidden');
        btn.innerHTML = `<i data-feather="refresh-cw"></i> <span>Gerar Nova Análise</span>`;
        if (typeof feather !== 'undefined') feather.replace();
    }
}

// --- NAVIGATION ---
function showScreen(screenId: string) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
        s.classList.remove('active');
        (s as HTMLElement).style.display = 'none';
    });

    const target = document.getElementById(screenId);
    if (target) {
        target.style.display = 'block';
        requestAnimationFrame(() => target.classList.add('active'));
    }
    window.scrollTo(0, 0);
}

// Alias for compatibility if needed
const transitionScreen = showScreen;

// --- CALENDAR LOGIC ---
function renderCalendar(date: Date) {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('calendar-month-year');
    if (!grid || !label) return;

    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    label.textContent = `${monthNames[month]} ${year}`;

    grid.innerHTML = '';

    // Calculate days
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Fill Empty Slots
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day opacity-0 pointer-events-none';
        grid.appendChild(empty);
    }

    // Fill Days
    const db = getDatabase();
    const email = getCurrentUser();

    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day transition-all hover:bg-gray-700 cursor-default';
        cell.textContent = d.toString();
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        // Highlight Today
        if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
            cell.classList.add('today');
        }

        // Highlight Workouts
        if (db.trainingPlans && email) {
            let hasA = db.trainingPlans.treinosA?.[email]?.some((ex: any) => ex.checkIns && ex.checkIns.includes(dateStr));
            let hasB = db.trainingPlans.treinosB?.[email]?.some((ex: any) => ex.checkIns && ex.checkIns.includes(dateStr));

            if (hasA && hasB) cell.classList.add('treino-A-B-completed');
            else if (hasA) cell.classList.add('treino-A-completed');
            else if (hasB) cell.classList.add('treino-B-completed');
        }

        grid.appendChild(cell);
    }
}

// --- TRAINING SCREEN LOGIC (METALLIC LAYOUT) ---
function loadTrainingScreen(type: string, email?: string) {
    const userEmail = email || getCurrentUser();
    if (!userEmail) return;

    const db = getDatabase();
    const plan = db.trainingPlans[`treinos${type}`]?.[userEmail] || [];
    
    // 1. Setup Header & Timer
    const titleEl = document.getElementById('training-title');
    if (titleEl) {
        titleEl.textContent = `TREINO ${type}`;
    }

    const timerEl = document.getElementById('workout-timer');
    if (timerEl) {
        if (workoutTimerInterval) clearInterval(workoutTimerInterval);
        workoutStartTime = new Date();
        timerEl.textContent = "00:00:00";
        
        workoutTimerInterval = window.setInterval(() => {
            if (!workoutStartTime) return;
            const diff = new Date().getTime() - workoutStartTime.getTime();
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            timerEl.textContent = `${h}:${m}:${s}`;
        }, 1000);
    }

    // 2. Render List with Metallic Cards & Connectors
    const listContainer = document.getElementById('training-content-wrapper');
    if (listContainer) {
        listContainer.innerHTML = '';
        const todayStr = new Date().toISOString().split('T')[0];

        // Pre-process list to identify groups and connector types
        const renderedItems = plan.map((ex: any, i: number, arr: any[]) => {
            const conjugadoMatch = ex.name.match(/\(CONJUGADO\s+(\d+)\)/i);
            const conjugadoId = conjugadoMatch ? conjugadoMatch[1] : null;
            let lineType = null;

            if (conjugadoId) {
                const prevId = arr[i - 1]?.name.match(/\(CONJUGADO\s+(\d+)\)/i)?.[1];
                const nextId = arr[i + 1]?.name.match(/\(CONJUGADO\s+(\d+)\)/i)?.[1];

                const isPrevSame = prevId === conjugadoId;
                const isNextSame = nextId === conjugadoId;

                if (!isPrevSame && isNextSame) lineType = 'start';
                else if (isPrevSame && isNextSame) lineType = 'middle';
                else if (isPrevSame && !isNextSame) lineType = 'end';
            }

            const cleanName = ex.name.replace(/\(CONJUGADO\s+\d+\)/i, '').trim();
            const label = conjugadoId ? `(CONJUGADO ${conjugadoId})` : '';
            const isChecked = ex.checkIns && ex.checkIns.includes(todayStr);

            // Container Wrapper (Handles line positioning)
            const wrapper = document.createElement('div');
            // If it's a superset, add wrapper class for indentation
            if (conjugadoId) wrapper.className = 'superset-wrapper';

            let lineHTML = '';
            if (lineType) {
                lineHTML = `<div class="superset-line ${lineType}"></div>`;
            }

            wrapper.innerHTML = `
                ${lineHTML}
                <div class="metal-card-exercise flex-col !items-stretch !gap-3 h-auto" onclick="openExerciseModal(${i}, '${type}')">
                    <!-- Row 1: Image, Title, Toggle -->
                    <div class="flex items-start gap-3 relative">
                        <!-- Image -->
                        <div class="relative shrink-0">
                            <img src="${ex.img}" class="exercise-thumbnail w-16 h-16 object-cover rounded-lg shadow-sm border border-gray-400">
                            <div class="absolute inset-0 flex items-center justify-center">
                                <i data-feather="play-circle" class="text-white w-6 h-6 drop-shadow-md opacity-80"></i>
                            </div>
                        </div>

                        <!-- Title -->
                        <div class="flex-grow min-w-0 pt-0.5">
                            <h3 class="font-black text-gray-900 text-sm leading-tight pr-10 uppercase tracking-tight">
                                ${i + 1}. ${cleanName}
                            </h3>
                            ${label ? `<p class="text-[10px] font-bold text-red-600 mt-0.5 tracking-wider">${label}</p>` : ''}
                        </div>

                        <!-- Toggle Switch (Absolute top right of container) -->
                        <div class="toggle-switch absolute top-0 right-0" onclick="event.stopPropagation()">
                            <label>
                                <input type="checkbox" class="exercise-check" data-idx="${i}" ${isChecked ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- Row 2: Data Grid (The Big Change) -->
                    <div class="grid grid-cols-3 gap-2">
                         <!-- Sets -->
                         <div class="bg-gray-300/60 rounded-lg p-1.5 border border-gray-400 flex flex-col items-center justify-center shadow-inner">
                            <span class="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Séries</span>
                            <span class="text-xl font-black text-blue-800 leading-none">${ex.sets}</span>
                         </div>
                         <!-- Reps -->
                         <div class="bg-gray-300/60 rounded-lg p-1.5 border border-gray-400 flex flex-col items-center justify-center shadow-inner">
                            <span class="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Reps</span>
                            <span class="text-xl font-black text-orange-700 leading-none">${ex.reps}</span>
                         </div>
                         <!-- Load -->
                         <div class="bg-gray-300/60 rounded-lg p-1.5 border border-gray-400 flex flex-col items-center justify-center shadow-inner">
                            <span class="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Carga</span>
                            <span class="text-xl font-black text-red-700 leading-none">${ex.carga}<span class="text-xs ml-0.5 font-bold">kg</span></span>
                         </div>
                    </div>
                </div>
            `;
            return wrapper;
        });

        renderedItems.forEach((el: HTMLElement) => listContainer.appendChild(el));
        
        // Add Checkbox Listeners
        document.querySelectorAll('.exercise-check').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const idx = parseInt(target.dataset.idx || '0');
                const exercise = plan[idx];
                
                if (!exercise.checkIns) exercise.checkIns = [];
                if (target.checked) {
                    if (!exercise.checkIns.includes(todayStr)) exercise.checkIns.push(todayStr);
                } else {
                    exercise.checkIns = exercise.checkIns.filter((d: string) => d !== todayStr);
                }
                saveDatabase(db);
                // Refresh calendar if visible
                if (document.getElementById('studentProfileScreen')?.style.display === 'block') {
                    renderCalendar(currentCalendarDate);
                }
            });
        });

        if (typeof feather !== 'undefined') feather.replace();
    }

    showScreen('trainingScreen');
}

// --- RUNNING WORKOUTS LOGIC ---
function loadRunningScreen() {
    const db = getDatabase();
    const email = getCurrentUser();
    const workouts = db.userRunningWorkouts[email] || [];
    const container = document.getElementById('running-workouts-list');

    if (container) {
        container.innerHTML = '';
        if (workouts.length === 0) {
            container.innerHTML = '<p class="text-white text-center mt-4">Nenhum treino de corrida encontrado.</p>';
        } else {
            workouts.forEach((w: any) => {
                const card = document.createElement('div');
                card.className = 'bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden mb-4 relative';
                card.innerHTML = `
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                    <div class="p-4 pl-5">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h3 class="text-lg font-bold text-white leading-tight">${w.title}</h3>
                                <div class="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                    <span class="flex items-center gap-1"><i class="fas fa-clock text-orange-500"></i> ${w.duration}</span>
                                    <span class="flex items-center gap-1"><i class="fas fa-route text-orange-500"></i> ${w.distance}</span>
                                </div>
                            </div>
                            <span class="text-[10px] font-black uppercase tracking-wider text-gray-900 bg-orange-500 px-2 py-1 rounded-md shadow-sm border border-orange-400">${w.type}</span>
                        </div>
                        
                        <div class="space-y-3 pt-2 border-t border-gray-700/50">
                            <div class="flex items-start gap-3">
                                <div class="w-6 flex justify-center mt-0.5"><i class="fas fa-fire-alt text-yellow-500 text-sm"></i></div>
                                <div>
                                    <p class="text-xs font-bold text-gray-300 uppercase tracking-wide">Aquecimento</p>
                                    <p class="text-sm text-gray-200 leading-snug">${w.aquecimento || 'Consultar descrição'}</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start gap-3 relative">
                                <div class="absolute left-3 top-0 bottom-0 w-px bg-gray-700 -z-10"></div>
                                <div class="w-6 flex justify-center mt-0.5"><i class="fas fa-running text-orange-500 text-lg animate-pulse"></i></div>
                                <div class="bg-gray-700/50 p-2 rounded-lg border border-gray-600 w-full">
                                    <p class="text-xs font-bold text-orange-400 uppercase tracking-wide mb-1">Principal</p>
                                    <p class="text-sm font-medium text-white leading-snug">${w.principal || w.description}</p>
                                </div>
                            </div>

                            <div class="flex items-start gap-3">
                                <div class="w-6 flex justify-center mt-0.5"><i class="fas fa-snowflake text-blue-400 text-sm"></i></div>
                                <div>
                                    <p class="text-xs font-bold text-gray-300 uppercase tracking-wide">Desaquecimento</p>
                                    <p class="text-sm text-gray-200 leading-snug">${w.desaquecimento || 'Consultar descrição'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    }
    showScreen('runningScreen');
}

// --- RACE CALENDAR LOGIC (REDESIGNED) ---
function loadRaceCalendarScreen() {
    const db = getDatabase();
    const races = db.raceCalendar || [];
    const container = document.getElementById('race-calendar-list');

    if (container) {
        container.innerHTML = '';
        if (races.length === 0) {
            container.innerHTML = '<p class="text-white text-center mt-4">Nenhuma prova agendada.</p>';
        } else {
            races.forEach((r: any) => {
                 const parts = r.date.split('-');
                 const day = parts[2];
                 const monthNum = parseInt(parts[1], 10);
                 const monthNamesShort = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
                 const month = monthNamesShort[monthNum - 1];
                 const year = parts[0];

                 // "TICKET" STYLE CARD
                 const card = document.createElement('div');
                 card.className = 'bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-xl relative';
                 card.innerHTML = `
                    <!-- Background Accent -->
                    <div class="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-blob"></div>
                    <div class="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-600 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-blob animation-delay-2000"></div>

                    <div class="flex">
                        <!-- Left Stub (Date) -->
                        <div class="w-24 bg-gradient-to-b from-gray-900 to-gray-800 border-r-2 border-dashed border-gray-600 flex flex-col items-center justify-center p-2 relative">
                             <!-- Punch holes -->
                            <div class="absolute -top-3 -right-3 w-6 h-6 bg-[#000000] rounded-full z-10"></div>
                            <div class="absolute -bottom-3 -right-3 w-6 h-6 bg-[#000000] rounded-full z-10"></div>
                            
                            <span class="text-xs text-gray-400 font-bold tracking-widest">${year}</span>
                            <span class="text-3xl font-black text-white leading-none mt-1">${day}</span>
                            <span class="text-sm font-bold text-blue-400 uppercase tracking-wider mt-1">${month}</span>
                        </div>

                        <!-- Main Content -->
                        <div class="flex-1 p-4 relative z-10 flex flex-col justify-center">
                            <h3 class="font-bold text-white text-lg leading-tight mb-2">${r.name}</h3>
                            
                            <div class="flex flex-col gap-1.5">
                                <div class="flex items-center gap-2 text-xs text-gray-300">
                                    <div class="w-5 flex justify-center"><i class="fas fa-map-marker-alt text-red-500"></i></div>
                                    <span>${r.location}</span>
                                </div>
                                <div class="flex items-center gap-2 text-xs text-gray-300">
                                    <div class="w-5 flex justify-center"><i class="fas fa-flag-checkered text-green-500"></i></div>
                                    <span class="font-bold text-white">${r.distance}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                 `;
                 container.appendChild(card);
            });
        }
    }
    showScreen('raceCalendarScreen');
}

// --- OUTDOOR TRACKING LOGIC ---
function loadOutdoorTrackingScreen(activity: string) {
    currentActivityType = activity;
    const titleEl = document.getElementById('tracking-activity-title');
    if(titleEl) titleEl.textContent = activity;

    // Reset State
    trackingPath = [];
    trackingElapsedTime = 0;
    trackingDistance = 0;
    isTrackingPaused = false;
    if (trackingWatchId) navigator.geolocation.clearWatch(trackingWatchId);
    if (trackingTimerInterval) clearInterval(trackingTimerInterval);
    
    // Reset UI
    document.getElementById('tracking-distance')!.textContent = "0.00 km";
    document.getElementById('tracking-time')!.textContent = "00:00:00";
    document.getElementById('tracking-pace')!.textContent = "--:-- /km";
    
    // Buttons
    document.getElementById('start-tracking-btn')!.classList.remove('hidden');
    document.getElementById('pause-tracking-btn')!.classList.add('hidden');
    document.getElementById('stop-tracking-btn')!.classList.add('hidden');

    showScreen('outdoorTrackingScreen');

    // Init Map (Leaflet)
    // We need a slight delay or resize event because the div was hidden
    setTimeout(() => {
        if (!map) {
            map = L.map('map').setView([-22.9068, -43.1729], 13); // Default Rio
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
            mapPolyline = L.polyline([], { color: 'red', weight: 4 }).addTo(map);
        } else {
            map.invalidateSize();
            mapPolyline.setLatLngs([]);
        }
        
        // Locate user initially without tracking
        map.locate({setView: true, maxZoom: 16});
    }, 300);
}

function startOutdoorTracking() {
    if (!isTrackingPaused) {
        trackingStartTime = Date.now();
    } else {
        // Resuming: Adjust start time to account for pause
        trackingStartTime = Date.now() - trackingElapsedTime;
    }
    isTrackingPaused = false;

    // UI Buttons
    document.getElementById('start-tracking-btn')!.classList.add('hidden');
    document.getElementById('pause-tracking-btn')!.classList.remove('hidden');
    document.getElementById('stop-tracking-btn')!.classList.remove('hidden');

    // Timer
    trackingTimerInterval = window.setInterval(() => {
        trackingElapsedTime = Date.now() - trackingStartTime;
        document.getElementById('tracking-time')!.textContent = formatDuration(trackingElapsedTime);
        document.getElementById('tracking-pace')!.textContent = calculatePace(trackingElapsedTime, trackingDistance) + " /km";
    }, 1000);

    // Geo Location
    trackingWatchId = navigator.geolocation.watchPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        const latLng = [latitude, longitude];

        // If we have previous points, calculate distance
        if (trackingPath.length > 0) {
            const lastPoint = trackingPath[trackingPath.length - 1];
            // Leaflet map.distance returns meters
            const dist = map.distance(lastPoint, latLng); 
            // Filter noise: ignore very small movements (e.g. < 5 meters)
            if (dist > 5) {
                 trackingDistance += dist;
                 trackingPath.push(latLng);
                 mapPolyline.setLatLngs(trackingPath);
                 map.setView(latLng);
                 
                 document.getElementById('tracking-distance')!.textContent = (trackingDistance / 1000).toFixed(2) + " km";
            }
        } else {
            // First point
            trackingPath.push(latLng);
            map.setView(latLng, 16);
        }
    }, (err) => {
        console.error("GPS Error", err);
    }, {
        enableHighAccuracy: true
    });
}

function pauseOutdoorTracking() {
    isTrackingPaused = true;
    if (trackingTimerInterval) clearInterval(trackingTimerInterval);
    if (trackingWatchId) navigator.geolocation.clearWatch(trackingWatchId);
    
    document.getElementById('pause-tracking-btn')!.classList.add('hidden');
    document.getElementById('start-tracking-btn')!.classList.remove('hidden');
}

function stopOutdoorTracking() {
    if (trackingTimerInterval) clearInterval(trackingTimerInterval);
    if (trackingWatchId) navigator.geolocation.clearWatch(trackingWatchId);
    
    // Save workout to DB? (Simplified for now, just reset or alert)
    alert(`Treino finalizado!\nAtividade: ${currentActivityType}\nDistância: ${(trackingDistance/1000).toFixed(2)} km\nTempo: ${formatDuration(trackingElapsedTime)}`);
    
    loadOutdoorTrackingScreen(currentActivityType); // Reset UI for next run
}

// --- PERIODIZATION LOGIC ---
function togglePeriodizationStatus(id: number) {
    const userEmail = getCurrentUser();
    if (!userEmail) return;
    
    const db = getDatabase();
    const periodizacao = db.trainingPlans.periodizacao[userEmail];
    
    if (!periodizacao) return;

    const item = periodizacao.find((p: any) => p.id === id);
    if (item) {
        // Cycle Status
        if (item.status === 'Não Começou') item.status = 'Em Andamento';
        else if (item.status === 'Em Andamento') item.status = 'Concluído';
        else item.status = 'Não Começou';
        
        saveDatabase(db);
        loadPeriodizationScreen(); // Refresh
    }
}

function openPeriodizationModal(id: number) {
    const userEmail = getCurrentUser();
    if (!userEmail) return;
    
    const db = getDatabase();
    const periodizacao = db.trainingPlans.periodizacao[userEmail];
    const item = periodizacao.find((p: any) => p.id === id);
    
    if (item) {
        const modal = document.getElementById('periodizationDetailModal');
        const content = document.getElementById('periodization-modal-content');
        
        document.getElementById('modal-periodization-phase')!.textContent = item.fase;
        document.getElementById('modal-periodization-dates')!.innerHTML = `<i data-feather="calendar" class="w-4 h-4 text-red-500"></i> ${item.inicio} - ${item.fim}`;
        document.getElementById('modal-periodization-goal')!.innerHTML = `<i data-feather="target" class="w-4 h-4 text-red-500"></i> ${item.objetivo}`;
        
        // Construct the detailed HTML with the new series/reps cards
        const detailsContainer = document.getElementById('modal-periodization-details');
        if (detailsContainer) {
            detailsContainer.innerHTML = `
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="bg-gray-800 p-3 rounded-lg text-center border border-gray-600">
                        <p class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Séries</p>
                        <p class="text-2xl font-black text-white">${item.series || '-'}</p>
                    </div>
                    <div class="bg-gray-800 p-3 rounded-lg text-center border border-gray-600">
                        <p class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Repetições</p>
                        <p class="text-2xl font-black text-white">${item.repeticoes || '-'}</p>
                    </div>
                </div>
                <div class="text-gray-200 text-sm leading-relaxed border-t border-gray-600 pt-3 mt-2">
                    ${item.detalhes || 'Sem detalhes disponíveis'}
                </div>
            `;
        }
        
        if (typeof feather !== 'undefined') feather.replace();
        
        modal?.classList.remove('hidden');
        content?.classList.remove('scale-95', 'opacity-0');
        content?.classList.add('scale-100', 'opacity-100');
    }
}

function loadPeriodizationScreen() {
    const userEmail = getCurrentUser();
    if (!userEmail) return;

    const db = getDatabase();
    const periodizacao = db.trainingPlans.periodizacao[userEmail] || [];
    const container = document.getElementById('periodization-content-wrapper');

    if (container) {
        container.innerHTML = '';
        
        if (periodizacao.length === 0) {
            container.innerHTML = '<p class="text-white text-center mt-10">Nenhum histórico de periodização encontrado.</p>';
        } else {
            // Sort by ID to ensure chronological order: Adaptacao -> Hipertrofia I -> Hipertrofia II -> Forca
            const sortedPeriodization = [...periodizacao].sort((a, b) => a.id - b.id);

            sortedPeriodization.forEach((p: any, index: number) => {
                // LOCKING LOGIC: Locked if it's not the first one AND the previous one is not 'Concluído'
                const isLocked = index > 0 && sortedPeriodization[index - 1].status !== 'Concluído';

                let statusColor = 'text-gray-400';
                let statusBg = 'bg-gray-700';
                let borderColor = 'bg-gray-600';
                let statusIcon = 'circle';
                let cardOpacity = 'opacity-100';
                let pointerEvents = 'cursor-pointer hover:border-gray-500 active:scale-[0.98]';

                if (isLocked) {
                    cardOpacity = 'opacity-60 grayscale';
                    pointerEvents = 'cursor-not-allowed';
                    borderColor = 'bg-gray-700';
                } else {
                    if (p.status === 'Concluído') {
                        statusColor = 'text-green-400';
                        statusBg = 'bg-green-900/30 border-green-600/50';
                        borderColor = 'bg-green-500';
                        statusIcon = 'check-circle';
                    } else if (p.status === 'Em Andamento') {
                        statusColor = 'text-yellow-400';
                        statusBg = 'bg-yellow-900/30 border-yellow-600/50';
                        borderColor = 'bg-yellow-500';
                        statusIcon = 'clock';
                    }
                }

                const card = document.createElement('div');
                card.className = `bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg relative overflow-hidden transition-all duration-300 ${pointerEvents} ${cardOpacity}`;
                
                if (!isLocked) {
                    card.onclick = () => openPeriodizationModal(p.id);
                }
                
                let actionButton = '';
                if (isLocked) {
                    actionButton = `
                        <div class="text-xs font-bold px-3 py-1.5 rounded-full border bg-gray-800 text-gray-500 border-gray-600 flex items-center gap-1.5 shadow-md z-10">
                            <i data-feather="lock" class="w-3.5 h-3.5"></i> Bloqueado
                        </div>
                    `;
                } else {
                    actionButton = `
                        <button onclick="event.stopPropagation(); togglePeriodizationStatus(${p.id})" class="text-xs font-bold px-3 py-1.5 rounded-full border ${statusBg} ${statusColor} flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md z-10">
                            <i data-feather="${statusIcon}" class="w-3.5 h-3.5"></i> ${p.status}
                        </button>
                    `;
                }

                card.innerHTML = `
                    <div class="absolute top-0 left-0 w-1.5 h-full ${borderColor}"></div>
                    <div class="flex justify-between items-start mb-2 pl-3">
                        <h3 class="text-lg font-bold text-white">${p.fase}</h3>
                        ${actionButton}
                    </div>
                    <div class="pl-3 space-y-2">
                        <div class="flex items-center gap-2 text-sm text-gray-300">
                            <i data-feather="calendar" class="w-4 h-4 text-gray-500"></i>
                            <span>${p.inicio} - ${p.fim}</span>
                        </div>
                        <div class="flex items-center gap-2 text-sm text-gray-300">
                            <i data-feather="target" class="w-4 h-4 text-red-500"></i>
                            <span class="font-medium text-gray-200">Objetivo:</span> ${p.objetivo}
                        </div>
                         <div class="flex items-center gap-4 mt-2 pt-2 border-t border-gray-700/50">
                            <div class="flex items-center gap-1.5">
                                <span class="text-xs text-gray-500 uppercase font-bold">Séries</span>
                                <span class="text-sm font-bold text-white">${p.series || '-'}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="text-xs text-gray-500 uppercase font-bold">Reps</span>
                                <span class="text-sm font-bold text-white">${p.repeticoes || '-'}</span>
                            </div>
                        </div>
                        ${!isLocked ? `
                         <div class="flex items-center gap-2 text-xs text-blue-400 mt-2">
                            <i data-feather="info" class="w-3 h-3"></i>
                            <span>Toque para ver detalhes</span>
                        </div>` : ''}
                    </div>
                `;
                container.appendChild(card);
            });
            if (typeof feather !== 'undefined') feather.replace();
        }
    }

    showScreen('periodizationScreen');
}

// --- PROFILE & DASHBOARD ---
function loadStudentProfile(email: string) {
    const db = getDatabase();
    const user = db.users.find((u: any) => u.email === email);
    
    if (!user) return; 

    // Update Profile Info
    const profileInfo = document.getElementById('student-profile-info');
    if (profileInfo) {
        profileInfo.innerHTML = `
            <img src="${user.photo}" class="w-14 h-14 rounded-full border-2 border-red-600 object-cover">
            <div>
                <h2 class="text-lg font-bold text-white">Olá, ${user.name.split(' ')[0]}</h2>
                <p class="text-xs text-gray-400">Aluno(a) ABFIT</p>
            </div>
        `;
        profileInfo.classList.remove('hidden');
    }

    // Render Buttons - UPDATED LAYOUT AND ORDER
    const btnContainer = document.getElementById('student-profile-buttons');
    if (btnContainer) {
        // Change grid to 2 cols mobile, 4 cols desktop
        btnContainer.className = "grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 mt-4";
        
        btnContainer.innerHTML = `
            <!-- ROW 1 -->
            <button onclick="loadTrainingScreen('A')" class="metal-btn-highlight p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28">
                <i class="fas fa-dumbbell text-2xl"></i>
                <span class="text-sm font-bold">TREINO A</span>
            </button>
            <button onclick="loadTrainingScreen('B')" class="metal-btn-highlight p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28">
                <i class="fas fa-dumbbell text-2xl"></i>
                <span class="text-sm font-bold">TREINO B</span>
            </button>
            <button onclick="loadRunningScreen()" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28">
                <i class="fas fa-running text-orange-500 text-2xl"></i>
                <span class="text-sm font-bold">CORRIDA</span>
            </button>
            <button onclick="loadPeriodizationScreen()" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28">
                <i class="fas fa-calendar-alt text-yellow-500 text-2xl"></i>
                <span class="text-sm font-bold">PERIODIZAÇÃO</span>
            </button>

            <!-- ROW 2 -->
            <button onclick="showScreen('outdoorSelectionScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28">
                <i class="fas fa-map-marked-alt text-green-500 text-2xl"></i>
                <span class="text-sm font-bold">OUTDOOR</span>
            </button>
            <button onclick="loadRaceCalendarScreen()" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28">
                <i class="fas fa-flag-checkered text-blue-500 text-2xl"></i>
                <span class="text-sm font-bold">PROVAS</span>
            </button>
             <button onclick="showScreen('physioAssessmentScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28">
                <i class="fas fa-clipboard-user text-red-400 text-2xl"></i>
                <span class="text-sm font-bold">AVALIAÇÃO</span>
            </button>
             <button onclick="showScreen('aiAnalysisScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28">
                <i class="fas fa-brain text-teal-400 text-2xl"></i>
                <span class="text-sm font-bold">ANÁLISE IA</span>
            </button>
        `;
    }

    // Initialize Calendar for Student
    renderCalendar(currentCalendarDate);
    
    // Fetch and display weather
    fetchWeather();

    showScreen('studentProfileScreen');
}

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    initializeDatabase();
    
    // Feather Icons
    if (typeof feather !== 'undefined') feather.replace();

    // Login Check
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) splash.classList.add('fade-out');
        
        const container = document.getElementById('appContainer');
        if (container) container.classList.remove('init-hidden', 'hidden');

        const user = getCurrentUser();
        if (user) {
            loadStudentProfile(user);
        } else {
            showScreen('loginScreen');
        }
        
        if (splash) setTimeout(() => splash.style.display = 'none', 500);
    }, 2000);

    // Event Listeners
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = (document.getElementById('login-email') as HTMLInputElement).value;
        const db = getDatabase();
        if (db.users.find((u: any) => u.email === email)) {
            setCurrentUser(email);
            loadStudentProfile(email);
        } else {
            const err = document.getElementById('login-error');
            if (err) err.textContent = 'Email não encontrado';
        }
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        location.reload();
    });

    // Calendar Navigation Listeners
    document.getElementById('prev-month-btn')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar(currentCalendarDate);
    });

    document.getElementById('next-month-btn')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar(currentCalendarDate);
    });

    // Global Back Button
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if (target) {
                // If returning to profile, refresh calendar to ensure checkmarks are up to date
                if (target === 'studentProfileScreen') renderCalendar(currentCalendarDate);
                showScreen(target);
            }
        });
    });

    // Outdoor Specific Back Buttons (Since they use class selector and different logic in some apps, but here generalized)
    document.querySelectorAll('.outdoor-back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if(target) {
                // If leaving tracking, maybe stop tracking? For now just go back.
                if(target === 'outdoorSelectionScreen') {
                     if(trackingWatchId) {
                         // Alert user or auto stop?
                     }
                }
                showScreen(target);
            }
        });
    });

    // OUTDOOR ACTIVITY BUTTONS
    document.querySelectorAll('.outdoor-activity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const activity = btn.getAttribute('data-activity');
            if(activity) loadOutdoorTrackingScreen(activity);
        });
    });

    // OUTDOOR CONTROLS
    document.getElementById('start-tracking-btn')?.addEventListener('click', startOutdoorTracking);
    document.getElementById('pause-tracking-btn')?.addEventListener('click', pauseOutdoorTracking);
    document.getElementById('stop-tracking-btn')?.addEventListener('click', stopOutdoorTracking);
    
    // Exercise Modal Logic
    (window as any).openExerciseModal = (idx: number, type: string) => {
        const db = getDatabase();
        const email = getCurrentUser();
        const exercise = db.trainingPlans[`treinos${type}`][email][idx];
        
        // Populate modal
        document.getElementById('modal-exercise-name')!.textContent = exercise.name;
        (document.getElementById('modal-exercise-img') as HTMLImageElement).src = exercise.img;
        document.getElementById('exerciseDetailModal')!.classList.remove('hidden');
        document.getElementById('exercise-modal-content')!.classList.remove('scale-95', 'opacity-0');
        document.getElementById('exercise-modal-content')!.classList.add('scale-100', 'opacity-100');
    };

    document.getElementById('closeExerciseModalBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('exerciseDetailModal');
        const content = document.getElementById('exercise-modal-content');
        if (content) {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
        }
        setTimeout(() => modal?.classList.add('hidden'), 200);
    });

    // Periodization Modal Logic
    document.getElementById('closePeriodizationModalBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('periodizationDetailModal');
        const content = document.getElementById('periodization-modal-content');
        if (content) {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
        }
        setTimeout(() => modal?.classList.add('hidden'), 200);
    });

    // AI Analysis Listener
    document.getElementById('generate-analysis-btn')?.addEventListener('click', generateAIAnalysis);

    // --- ASSESSMENT FIX (Force listeners) ---
    // Ensure tabs work even if loaded late or statically
    const tabProfessor = document.getElementById('tab-professor');
    const tabAluno = document.getElementById('tab-aluno');
    const viewProfessor = document.getElementById('view-professor');
    const viewAluno = document.getElementById('view-aluno');
    const modalAddAluno = document.getElementById('modal-add-aluno');
    const modalContentAluno = document.getElementById('modal-content');

    if (tabProfessor && tabAluno && viewProfessor && viewAluno) {
        tabProfessor.addEventListener('click', () => {
            tabProfessor.classList.add('tab-active');
            tabAluno.classList.remove('tab-active');
            viewProfessor.classList.remove('hidden');
            viewAluno.classList.add('hidden');
        });

        tabAluno.addEventListener('click', () => {
            tabProfessor.classList.remove('tab-active');
            tabAluno.classList.add('tab-active');
            viewProfessor.classList.add('hidden');
            viewAluno.classList.remove('hidden');
        });
    }

    // Force Open Modal logic inside main app scope
    const btnAddAluno = document.getElementById('btn-add-aluno');
    if (btnAddAluno && modalAddAluno && modalContentAluno) {
        // Remove existing to avoid dupes if any
        const newBtn = btnAddAluno.cloneNode(true);
        btnAddAluno.parentNode?.replaceChild(newBtn, btnAddAluno);
        
        newBtn.addEventListener('click', () => {
            modalAddAluno.classList.remove('hidden');
            setTimeout(() => {
                modalContentAluno.classList.remove('scale-95', 'opacity-0');
                modalContentAluno.classList.add('scale-100', 'opacity-100');
            }, 10);
        });
    }

    const btnCancelModal = document.getElementById('btn-cancel-modal');
    if (btnCancelModal && modalAddAluno && modalContentAluno) {
        btnCancelModal.addEventListener('click', () => {
             modalContentAluno.classList.remove('scale-100', 'opacity-100');
             modalContentAluno.classList.add('scale-95', 'opacity-0');
             setTimeout(() => {
                modalAddAluno.classList.add('hidden');
             }, 200);
        });
    }
});

// Expose globals for HTML clicks
(window as any).loadTrainingScreen = loadTrainingScreen;
(window as any).loadPeriodizationScreen = loadPeriodizationScreen;
(window as any).togglePeriodizationStatus = togglePeriodizationStatus;
(window as any).openPeriodizationModal = openPeriodizationModal;
(window as any).showScreen = showScreen;
(window as any).loadRunningScreen = loadRunningScreen;
(window as any).loadRaceCalendarScreen = loadRaceCalendarScreen;
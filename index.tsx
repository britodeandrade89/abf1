import { GoogleGenAI } from "@google/genai";

// Globals defined by imported scripts
declare var feather: any;
declare var Chart: any;
declare var marked: any;
declare var L: any; // Leaflet global

// Timer Variables
let workoutTimerInterval: number | null = null;
let workoutStartTime: Date | null = null;
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

    // RESTORED RUNNING WORKOUTS
    const runningWorkouts = [
        { title: 'Tiros de 400m', type: 'Intervalado', duration: '45 min', distance: '6-7 km', description: 'Aquecimento 10\' trote leve. <br> 10x 400m em ritmo forte (Z4/Z5) com intervalo de 1\'30" caminhando. <br> Desaquecimento 10\' trote regenerativo.' },
        { title: 'Longo de Rodagem', type: 'Volume', duration: '1h 10min', distance: '12 km', description: 'Ritmo constante e confortável (Z2/Z3). Foco em manter a frequência cardíaca estável. Não exceder o pace alvo.' },
        { title: 'Tempo Run', type: 'Ritmo', duration: '50 min', distance: '8 km', description: '15\' Aquecimento. <br> 20\' em ritmo de prova (Limiar de Lactato - Z4). <br> 15\' Desaquecimento.' },
        { title: 'Regenerativo', type: 'Recuperação', duration: '30 min', distance: '4-5 km', description: 'Corrida muito leve, apenas para soltar a musculatura. Z1/Z2 estrito.' }
    ];

    // RESTORED RACE CALENDAR
    const raceCalendar = [
        { name: 'Corrida das Estações - Outono', date: '2025-03-16', location: 'Aterro do Flamengo', distance: '10km' },
        { name: 'Maratona do Rio', date: '2025-06-02', location: 'Rio de Janeiro', distance: '21km / 42km' },
        { name: 'Night Run SP', date: '2025-08-10', location: 'USP - São Paulo', distance: '5km / 10km' }
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
    if (!db.userRunningWorkouts[email]) db.userRunningWorkouts[email] = runningWorkouts;
    if (!db.raceCalendar || db.raceCalendar.length === 0) db.raceCalendar = raceCalendar;
    
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
                <div class="metal-card-exercise" onclick="openExerciseModal(${i}, '${type}')">
                    <!-- Image -->
                    <div class="relative">
                        <img src="${ex.img}" class="exercise-thumbnail">
                        <div class="absolute inset-0 flex items-center justify-center">
                            <i data-feather="play-circle" class="text-white w-6 h-6 drop-shadow-md"></i>
                        </div>
                    </div>

                    <!-- Info -->
                    <div class="flex-grow min-w-0">
                        <h3 class="font-bold text-sm leading-tight pr-2 whitespace-normal">
                            ${i + 1}. ${cleanName}
                        </h3>
                        ${label ? `<p class="text-[10px] font-bold text-gray-700 mt-0.5">${label}</p>` : ''}
                        <div class="flex items-center gap-3 mt-1 text-[11px] font-bold text-gray-800">
                             <span class="flex items-center gap-1"><i class="fas fa-layer-group text-xs text-gray-600"></i> ${ex.sets}</span>
                             <span class="flex items-center gap-1"><i class="fas fa-dumbbell text-xs text-gray-600"></i> ${ex.reps}</span>
                             <span class="flex items-center gap-1"><i class="fas fa-weight-hanging text-xs text-gray-600"></i> ${ex.carga}kg</span>
                        </div>
                    </div>

                    <!-- Toggle Switch -->
                    <div class="toggle-switch" onclick="event.stopPropagation()">
                        <label>
                            <input type="checkbox" class="exercise-check" data-idx="${i}" ${isChecked ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
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
                card.className = 'bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md mb-3 relative overflow-hidden';
                card.innerHTML = `
                    <div class="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                    <div class="flex justify-between items-start mb-2 pl-2">
                        <h3 class="font-bold text-white text-lg">${w.title}</h3>
                        <span class="text-xs font-bold px-2 py-1 rounded bg-gray-700 text-orange-400 border border-orange-500/30">${w.type}</span>
                    </div>
                    <div class="text-gray-300 text-sm mb-3 pl-2">
                        <div class="flex items-center gap-3 mb-1">
                            <span class="flex items-center gap-1"><i class="fas fa-stopwatch w-4 text-gray-500"></i> ${w.duration}</span>
                            <span class="flex items-center gap-1"><i class="fas fa-road w-4 text-gray-500"></i> ${w.distance}</span>
                        </div>
                    </div>
                    <div class="bg-gray-900/50 p-3 rounded-lg border border-gray-700 text-sm text-gray-400 leading-relaxed ml-2">
                        ${w.description}
                    </div>
                `;
                container.appendChild(card);
            });
        }
    }
    showScreen('runningScreen');
}

// --- RACE CALENDAR LOGIC ---
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
                 const dateObj = new Date(r.date);
                 // Fix date display off-by-one error by handling timezone or just parsing strings directly if YYYY-MM-DD
                 // Simple split fix for YYYY-MM-DD
                 const parts = r.date.split('-');
                 const day = parts[2];
                 const monthNum = parseInt(parts[1], 10);
                 const monthNamesShort = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
                 const month = monthNamesShort[monthNum - 1];

                 const card = document.createElement('div');
                 card.className = 'bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg flex';
                 card.innerHTML = `
                    <div class="bg-blue-900 w-20 flex flex-col items-center justify-center p-2 border-r border-gray-700">
                        <span class="text-2xl font-black text-white">${day}</span>
                        <span class="text-xs font-bold text-blue-300 uppercase">${month}</span>
                    </div>
                    <div class="p-4 flex-1">
                        <h3 class="font-bold text-white text-base mb-1">${r.name}</h3>
                        <div class="flex flex-col gap-1 text-xs text-gray-400 mt-2">
                            <span class="flex items-center gap-2"><i class="fas fa-map-marker-alt w-4 text-center"></i> ${r.location}</span>
                            <span class="flex items-center gap-2"><i class="fas fa-route w-4 text-center"></i> ${r.distance}</span>
                        </div>
                    </div>
                 `;
                 container.appendChild(card);
            });
        }
    }
    showScreen('raceCalendarScreen');
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

    // Render Buttons
    const btnContainer = document.getElementById('student-profile-buttons');
    if (btnContainer) {
        btnContainer.innerHTML = `
            <button onclick="loadTrainingScreen('A')" class="metal-btn-highlight p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-24">
                <i class="fas fa-dumbbell text-2xl"></i>
                <span>TREINO A</span>
            </button>
            <button onclick="loadTrainingScreen('B')" class="metal-btn-highlight p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-24">
                <i class="fas fa-fire text-2xl"></i>
                <span>TREINO B</span>
            </button>
            <button onclick="loadPeriodizationScreen()" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-24">
                <i class="fas fa-calendar-alt text-yellow-500 text-2xl"></i>
                <span>PERIODIZAÇÃO</span>
            </button>
            <button onclick="loadRunningScreen()" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-24">
                <i class="fas fa-running text-orange-500 text-2xl"></i>
                <span>CORRIDA</span>
            </button>
            <button onclick="showScreen('outdoorSelectionScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-24">
                <i class="fas fa-map-marked-alt text-green-500 text-2xl"></i>
                <span>OUTDOOR</span>
            </button>
            <button onclick="loadRaceCalendarScreen()" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-24">
                <i class="fas fa-flag-checkered text-blue-500 text-2xl"></i>
                <span>PROVAS</span>
            </button>
             <button onclick="showScreen('physioAssessmentScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-24">
                <i class="fas fa-clipboard-user text-red-400 text-2xl"></i>
                <span>AVALIAÇÃO</span>
            </button>
             <button onclick="showScreen('aiAnalysisScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-24">
                <i class="fas fa-brain text-teal-400 text-2xl"></i>
                <span>ANÁLISE IA</span>
            </button>
             <button onclick="showScreen('exerciciosScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-24">
                <i class="fas fa-book-open text-purple-400 text-2xl"></i>
                <span>BIBLIOTECA</span>
            </button>
        `;
    }

    // Initialize Calendar for Student
    renderCalendar(currentCalendarDate);

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
});

// Expose globals for HTML clicks
(window as any).loadTrainingScreen = loadTrainingScreen;
(window as any).loadPeriodizationScreen = loadPeriodizationScreen;
(window as any).togglePeriodizationStatus = togglePeriodizationStatus;
(window as any).openPeriodizationModal = openPeriodizationModal;
(window as any).showScreen = showScreen;
(window as any).loadRunningScreen = loadRunningScreen;
(window as any).loadRaceCalendarScreen = loadRaceCalendarScreen;
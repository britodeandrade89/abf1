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

// --- FINISH WORKOUT STATE ---
let tempWorkoutData: any = {};
let tempWorkoutImage: string | null = null;

// --- FOOTER CONTENT (AI Generated Responses) ---
const footerContent: any = {
    'sobre': {
        title: 'Sobre a ABFIT',
        body: `
            <p><strong>Missão:</strong> Transformar vidas através do movimento consciente e da ciência do treinamento físico.</p>
            <p>A ABFIT, fundada pelo treinador André Brito, não é apenas uma assessoria esportiva, é uma filosofia de vida. Acreditamos que o corpo humano é uma máquina perfeita que precisa de manutenção adequada, desafio constante e respeito aos seus limites.</p>
            <p>Nossa metodologia combina periodização baseada em evidências científicas com um acompanhamento humano e personalizado. Seja para alta performance, estética ou saúde, nosso compromisso é entregar resultados reais e duradouros, longe de promessas milagrosas.</p>
            <p>Junte-se à nossa comunidade e descubra sua melhor versão.</p>
        `
    },
    'carreiras': {
        title: 'Carreiras',
        body: `
            <p>Estamos sempre em busca de profissionais apaixonados por saúde e performance.</p>
            <p>Se você é Personal Trainer, Nutricionista ou Fisioterapeuta e se identifica com uma metodologia séria e baseada em dados, queremos conhecer você.</p>
            <p class="mt-4"><strong>Vagas Abertas:</strong></p>
            <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>Estagiário em Educação Física (Remoto/Híbrido)</li>
                <li>Treinador Assistente (Foco em Correção de Movimento)</li>
                <li>Desenvolvedor Full Stack (Foco em React/PWA)</li>
            </ul>
            <p class="mt-4">Envie seu currículo e portfólio para: <strong>carreiras@abfit.com.br</strong></p>
        `
    },
    'imprensa': {
        title: 'Imprensa',
        body: `
            <p>Bem-vindo à sala de imprensa da ABFIT.</p>
            <p>Aqui você encontra nossos releases oficiais, kit de mídia e contatos para solicitações de entrevistas com André Brito.</p>
            <p class="mt-2">André Brito está disponível para comentar sobre:</p>
            <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>Tendências do Fitness em 2025</li>
                <li>Periodização e Hipertrofia</li>
                <li>Tecnologia aplicada ao esporte</li>
            </ul>
            <p class="mt-4">Contato para jornalistas: <strong>imprensa@abfit.com.br</strong></p>
        `
    },
    'fale': {
        title: 'Fale Conosco',
        body: `
            <p>Tem alguma dúvida, sugestão ou feedback? Nossa equipe está pronta para te ouvir.</p>
            <p class="mt-4"><strong>Canais de Atendimento:</strong></p>
            <div class="mt-2 space-y-2">
                <div class="flex items-center gap-2"><i data-feather="mail" class="text-red-500"></i> britodeandrade@gmail.com</div>
                <div class="flex items-center gap-2"><i data-feather="phone" class="text-red-500"></i> +55 21 994 527 694</div>
                <div class="flex items-center gap-2"><i data-feather="instagram" class="text-red-500"></i> @andrebrito.personal</div>
            </div>
            <p class="mt-4 text-xs text-gray-500">Horário de atendimento: Seg a Sex, das 08h às 20h.</p>
        `
    },
    'suporte': {
        title: 'Suporte Técnico',
        body: `
            <p>Encontrou algum problema no app? Não se preocupe, vamos resolver.</p>
            <p class="mt-2">Antes de abrir um chamado, verifique:</p>
            <ul class="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                <li>Sua conexão com a internet está ativa?</li>
                <li>Você está usando a versão mais recente do app (v1.3)?</li>
                <li>Tente limpar o cache do navegador.</li>
            </ul>
            <p class="mt-4">Se o problema persistir, envie um print do erro para o nosso WhatsApp de suporte.</p>
            <button class="mt-4 w-full bg-green-600 text-white py-2 rounded font-bold">Abrir Chat no WhatsApp</button>
        `
    },
    'privacidade': {
        title: 'Política de Privacidade',
        body: `
            <p><strong>Última atualização: Janeiro de 2025</strong></p>
            <p class="mt-2">A ABFIT leva sua privacidade a sério. Esta política descreve como coletamos e usamos seus dados.</p>
            <p class="mt-2"><strong>1. Coleta de Dados:</strong> Coletamos informações como nome, e-mail, dados de saúde (peso, medidas) e localização (apenas durante o uso do rastreamento outdoor) para fornecer nossos serviços.</p>
            <p class="mt-2"><strong>2. Uso das Informações:</strong> Seus dados são usados exclusivamente para personalizar seus treinos e gerar relatórios de progresso. Não vendemos seus dados para terceiros.</p>
            <p class="mt-2"><strong>3. Segurança:</strong> Utilizamos criptografia de ponta a ponta e servidores seguros para proteger suas informações.</p>
            <p class="mt-2"><strong>4. LGPD:</strong> Você tem o direito de solicitar a exclusão ou cópia dos seus dados a qualquer momento através do canal de suporte.</p>
        `
    },
    'termos': {
        title: 'Termos e Condições',
        body: `
            <p>Ao utilizar o aplicativo ABFIT, você concorda com os seguintes termos:</p>
            <ol class="list-decimal pl-5 mt-2 space-y-2">
                <li><strong>Responsabilidade Médica:</strong> O usuário declara estar apto fisicamente para a prática de exercícios. A ABFIT recomenda consultar um médico antes de iniciar qualquer programa.</li>
                <li><strong>Uso Pessoal:</strong> O plano de treino é individual e intransferível. O compartilhamento de conta pode resultar em bloqueio.</li>
                <li><strong>Propriedade Intelectual:</strong> Todo o conteúdo (vídeos, textos, métodos) é propriedade exclusiva da ABFIT.</li>
                <li><strong>Cancelamento:</strong> O serviço pode ser cancelado a qualquer momento, respeitando as regras do plano contratado.</li>
            </ol>
            <p class="mt-4 text-xs text-gray-500">Ao clicar em "Aceitar" no cadastro, você confirmou a leitura destes termos.</p>
        `
    }
};

// --- DATABASE ---
const database = {
    users: [
        { id: 1, name: 'André Brito', email: 'britodeandrade@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3Zy4n6ZmWp9DW98VtXpO.jpeg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: '2025-01-15', stressData: { assessments: [] } },
        { id: 2, name: 'Marcelly Bispo', email: 'Marcellybispo92@gmail.com', photo: 'marcelly.jpg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: '2025-01-15', stressData: { assessments: [] } }
    ],
    trainingPlans: { treinosA: {}, treinosB: {}, periodizacao: {} },
    userRunningWorkouts: {},
    completedWorkouts: {}, // Stores detailed history { date: 'YYYY-MM-DD', type: 'Treino A', duration: '50 min', photo: 'base64...' }
    activeSessions: {},
    raceCalendar: []
};

// --- STORAGE ---
const STORAGE_KEYS = {
    DATABASE: 'abfit_database_v7', 
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
    
    const usersToInit = ['britodeandrade@gmail.com', 'Marcellybispo92@gmail.com'];
    
    // Ensure Marcelly is in the user list if loaded from old DB
    const marcelly = db.users.find((u: any) => u.email === 'Marcellybispo92@gmail.com');
    if (!marcelly) {
        db.users.push({ id: 2, name: 'Marcelly Bispo', email: 'Marcellybispo92@gmail.com', photo: 'marcelly.jpg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: '2025-01-15', stressData: { assessments: [] } });
    } else {
        marcelly.photo = 'marcelly.jpg';
    }

    // Default Workout Data (André Brito's Template)
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

    const runningWorkouts = [
        { name: 'Corrida Leve', distance: '5km', duration: '30min' },
        { name: 'Tiro de Velocidade', distance: '3km', duration: '20min' }
    ];

    usersToInit.forEach(email => {
        if (email === 'Marcellybispo92@gmail.com') {
             let tA = JSON.parse(JSON.stringify(treinosA));
             let tB = JSON.parse(JSON.stringify(treinosB));
             if(tA.length >= 10) tA.splice(9, 1);
             if(tB.length >= 10) tB.splice(9, 1);
             db.trainingPlans.treinosA[email] = tA;
             db.trainingPlans.treinosB[email] = tB;
        } else {
            if (!db.trainingPlans.treinosA[email]) db.trainingPlans.treinosA[email] = treinosA;
            if (!db.trainingPlans.treinosB[email]) db.trainingPlans.treinosB[email] = treinosB;
        }
        db.userRunningWorkouts[email] = runningWorkouts;

        // History injection (keep requested history)
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const todayStr = now.toISOString().split('T')[0];

        const historyData = [
            { date: `${y}-${m}-08`, type: 'Treino A', duration: '50 min' },
            { date: `${y}-${m}-09`, type: 'Treino B', duration: '50 min' },
            { date: `${y}-${m}-10`, type: 'Treino A', duration: '37 min' },
            { date: todayStr, type: 'Treino A', duration: '54 min' } // INJECTED WORKOUT TODAY
        ];

        if (!db.completedWorkouts[email]) db.completedWorkouts[email] = [];
        historyData.forEach(item => {
            // Updated logic: Check if a workout of same type exists on date, or just add it if it's the requested injection
            const exists = db.completedWorkouts[email].some((w:any) => w.date === item.date && w.type === item.type);
            
            if (!exists) {
                db.completedWorkouts[email].push(item);
                const planKey = item.type === 'Treino A' ? 'treinosA' : (item.type === 'Treino B' ? 'treinosB' : null);
                if (planKey) {
                    const plan = db.trainingPlans[planKey][email];
                    if(plan && plan.length > 0) {
                        if(!plan[0].checkIns) plan[0].checkIns = [];
                        if(!plan[0].checkIns.includes(item.date)) plan[0].checkIns.push(item.date);
                    }
                }
            }
        });
    });

    // Periodization
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
        { id: 1, fase: 'Adaptação', inicio: formatDate(p1Start), fim: formatDate(p1End), objetivo: 'Resistência Muscular', status: 'Não Começou', series: '3', repeticoes: '10', detalhes: 'Fase de adaptação anatômica.' },
        { id: 2, fase: 'Hipertrofia I', inicio: formatDate(p2Start), fim: formatDate(p2End), objetivo: 'Ganho de Massa', status: 'Não Começou', series: '3', repeticoes: '10', detalhes: 'Fase principal de construção muscular.' },
        { id: 3, fase: 'Hipertrofia II', inicio: formatDate(p3Start), fim: formatDate(p3End), objetivo: 'Definição e Volume', status: 'Não Começou', series: '3', repeticoes: '10', detalhes: 'Intensificação do treino.' },
        { id: 4, fase: 'Força Pura', inicio: formatDate(p4Start), fim: formatDate(p4End), objetivo: 'Aumento de Carga', status: 'Não Começou', series: '4', repeticoes: '4-6', detalhes: 'Foco no aumento de força bruta.' }
    ];

    usersToInit.forEach(email => {
        const existing = db.trainingPlans.periodizacao[email] || [];
        const merged = periodizacaoTemplate.map(newItem => {
            const old = existing.find((o: any) => o.id === newItem.id);
            return old ? { ...newItem, status: old.status } : newItem;
        });
        db.trainingPlans.periodizacao[email] = merged;
    });
    
    saveDatabase(db);
}

// --- WEATHER FETCHING ---
async function fetchWeather() {
    const widget = document.getElementById('weather-widget');
    if (!widget) return;
    
    // Default Rio coords
    let lat = -22.9068;
    let lon = -43.1729;
    let locationName = "Rio de Janeiro";

    try {
        const position: any = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true, 
                timeout: 5000
            });
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
    } catch (error) {
        console.log("Using default location");
    }

    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
        const data = await response.json();
        
        const temp = data.current.temperature_2m;
        const code = data.current.weather_code;
        const min = data.daily.temperature_2m_min[0];
        const max = data.daily.temperature_2m_max[0];
        
        let icon = 'sun';
        if (code > 3) icon = 'cloud';
        if (code > 50) icon = 'cloud-rain';
        if (code > 95) icon = 'cloud-lightning';

        widget.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-3xl font-bold">${temp}°C</div>
                    <div class="text-sm text-gray-500">${min}° / ${max}°</div>
                </div>
                <i data-feather="${icon}" class="text-gray-400" style="width: 32px; height: 32px;"></i>
            </div>
            <div class="text-xs text-gray-400 mt-2">${locationName}</div>
        `;
        if (typeof feather !== 'undefined') feather.replace();

    } catch (e) {
        widget.innerHTML = '<div class="text-sm text-gray-500">Clima indisponível</div>';
    }
}
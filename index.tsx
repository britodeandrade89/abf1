import { GoogleGenAI } from "@google/genai";

// Globals defined by imported scripts
declare var feather: any;
declare var Chart: any;
declare var marked: any;
declare var L: any; // Leaflet global

// Fix: Correctly type workoutTimerInterval
let workoutTimerInterval: number | null = null;
let workoutStartTime: Date | null = null;

// Global chart instances to manage updates
let weightChartInstance: any = null;

// --- OUTDOOR TRACKING GLOBALS ---
let outdoorTrackingState = {
    isTracking: false,
    isPaused: false,
    activityType: '',
    startTime: 0,
    elapsedTime: 0,
    timerInterval: null as number | null,
    watchId: null as number | null,
    totalDistance: 0, // in meters
    positions: [] as { lat: number, lng: number }[],
    map: null as any, // Leaflet map instance
    polyline: null as any, // Leaflet polyline instance
};

// --- STRESS ASSESSMENT GLOBALS ---
let stressChart: any = null;
let stressAssessmentState = {
    currentQuestionIndex: 0,
    answers: [] as number[],
};

const stressAssessmentQuestions = [
    {
        question: "Nos últimos dias, com que frequência você se sentiu incapaz de controlar as coisas importantes da sua vida?",
        options: [
            { text: "Nunca", score: 0 },
            { text: "Quase Nunca", score: 1 },
            { text: "Às Vezes", score: 2 },
            { text: "Com Frequência", score: 3 },
            { text: "Sempre", score: 4 }
        ]
    },
    {
        question: "Nos últimos dias, com que frequência você se sentiu confiante sobre sua capacidade de lidar com seus problemas pessoais?",
        options: [ // Reverse scored
            { text: "Nunca", score: 4 },
            { text: "Quase Nunca", score: 3 },
            { text: "Às Vezes", score: 2 },
            { text: "Com Frequência", score: 1 },
            { text: "Sempre", score: 0 }
        ]
    },
    {
        question: "Nos últimos dias, com que frequência você sentiu que as coisas estavam indo do seu jeito?",
        options: [ // Reverse scored
            { text: "Nunca", score: 4 },
            { text: "Quase Nunca", score: 3 },
            { text: "Às Vezes", score: 2 },
            { text: "Com Frequência", score: 0 },
            { text: "Sempre", score: 0 }
        ]
    },
    {
        question: "Nos últimos dias, com que frequência você sentiu que as dificuldades estavam se acumulando tanto que você não conseguia superá-las?",
        options: [
            { text: "Nunca", score: 0 },
            { text: "Quase Nunca", score: 1 },
            { text: "Às Vezes", score: 2 },
            { text: "Com Frequência", score: 3 },
            { text: "Sempre", score: 4 }
        ]
    },
    {
        question: "Nos últimos dias, com que frequência você se sentiu irritado(a) ou nervoso(a)?",
        options: [
            { text: "Nunca", score: 0 },
            { text: "Quase Nunca", score: 1 },
            { text: "Às Vezes", score: 2 },
            { text: "Com Frequência", score: 3 },
            { text: "Sempre", score: 4 }
        ]
    }
];


// --- DATABASE ---
const database = {
    users: [
        { id: 1, name: 'André Brito', email: 'britodeandrade@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3Zy4n6ZmWp9DW98VtXpO.jpeg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: new Date().toISOString().split('T')[0], stressData: { assessments: [] } },
        { id: 2, name: 'Marcelly Bispo', email: 'marcellybispo92@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/2VWhNV4eSyDNkwEzPGvq.jpeg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: null, stressData: { assessments: [] } },
        { id: 3, name: 'Marcia Brito', email: 'andrademarcia.ucam@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/huS3I3wDTHbXGY1EuLjf.jpg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: null, stressData: { assessments: [] } },
        { id: 4, name: 'Liliane Torres', email: 'lilicatorres@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ebw5cplf2cypx4laU7fu.jpg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: null, stressData: { assessments: [] } },
        { id: 5, name: 'Rebecca Brito', email: 'arbrito.andrade@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/WjeZGiT8uQKPhfXmxrCe.jpeg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: null, stressData: { assessments: [] } }
    ],
    trainingPlans: {
        treinosA: {},
        treinosB: {},
        periodizacao: {}
    },
    userRunningWorkouts: {},
    completedWorkouts: {},
    activeSessions: {},
    raceCalendar: []
};

// --- OFFLINE STORAGE SYSTEM ---
const STORAGE_KEYS = {
    DATABASE: 'abfit_database',
    PENDING_SYNC: 'abfit_pending_sync',
    LAST_SYNC: 'abfit_last_sync',
    CURRENT_USER: 'abfit_current_user'
};
function getDatabase() {
    const saved = localStorage.getItem(STORAGE_KEYS.DATABASE);
    if (saved) return JSON.parse(saved);
    return database; // Retorna o objeto default se não houver nada salvo
}
function saveDatabase(db) {
    localStorage.setItem(STORAGE_KEYS.DATABASE, JSON.stringify(db));
}
function getCurrentUser() { return localStorage.getItem(STORAGE_KEYS.CURRENT_USER); }
function setCurrentUser(email) { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, email); }

function initializeDatabase() {
    // Definir os treinos do André Brito aqui para garantir que sejam aplicados tanto na inicialização limpa quanto na migração
    const treinosA_AndreBrito_Semana3e4 = [
        { name: 'Agachamento Livre com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/77Uth2fQUxtPXvqu1UCb.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Leg Press Horizontal', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/TYYs8dYewPrOA5MB0LKt.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Leg Press Horizontal unilateral', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/7yRR2CeoHxGPlbi3mw89.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Cadeira Extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/rQ8l64KvygQUAa8FZXyp.jpg', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Cadeira Extensora unilateral', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/BDBVsJS1WneT1BvLSW9S.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Supino aberto com HBC no banco inclinado', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/fWBlaY5LXefUGcXHz2tO.jpg', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Crucifixo aberto no banco inclinado com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/fWBlaY5LXefUGcXHz2tO.jpg', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Desenvolvimento aberto com HBC no banco 75 graus', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/niXdGuQHlniNh7f6xh5i.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Extensão de cotovelos no solo de joelhos no chão', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/eGNCCvzlv1jGWpSbs5nH.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Extensão de cotovelos fechados no solo de joelhos no chão', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/cVidpH3PfsrBhLcAGKmI.jpg', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Abdominal supra remador no solo', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/7M5vMfWh1Jb7DnLIUs4g.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples', recovery: '30s' }
    ];

    const treinosB_AndreBrito_Semana3e4 = [
        { name: 'Agachamento sumô com HBC (CONJUGADO 1)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/sGz9YqGUPf7lIqX8vULE.png', sets: '3', reps: '9', carga: '22', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Agachamento no smith ao fundo pés alinhados a barra (CONJUGADO 1)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '3', reps: '9', carga: '14', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Stiff em pé com HBM (CONJUGADO 2)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '3', reps: '9', carga: '7', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Flexão de joelho em pé com caneleira (CONJUGADO 2)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ZEcYnpswJBmu24PWZXwq.jpg', sets: '3', reps: '9', carga: '14', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Remada declinada no Smith (CONJUGADO 3)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/gSfHTcM8MNU22aYUa0zH.jpg', sets: '3', reps: '9', carga: '7', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Abdominal supra no solo (CONJUGADO 3)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/De8VrobzH9PPMDIAr7Cn.png', sets: '3', reps: '9', carga: '8', obs: 'Método Simples (15 RM)', recovery: '30s' },
        { name: 'Remada curvada supinada no cross barra reta (CONJUGADO 4)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/Vw4Wjum0oI5o4JiuTomc.jpg', sets: '3', reps: '9', carga: '4', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Bíceps em pé no cross barra reta (CONJUGADO 4)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/o8z8KzDoOqceSMHJvdLB.jpg', sets: '3', reps: '9', carga: '6', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Puxada aberta no pulley alto (CONJUGADO 5)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/EqnYYAVM1GKUbaAUibQF.jpg', sets: '3', reps: '9', carga: '11', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Puxada supinada no pulley alto (CONJUGADO 5)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/Rmve8zGQZaEmRNHZC1G6.jpg', sets: '3', reps: '10', carga: '10', obs: 'Método Simples (9 RM)', recovery: '30s' }
    ];

    const savedDB = JSON.parse(localStorage.getItem(STORAGE_KEYS.DATABASE));
    
    // Logic to calculate dates for the current week (Monday, Tuesday, Today)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMon = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(today);
    monday.setDate(diffToMon);
    const tuesday = new Date(monday);
    tuesday.setDate(monday.getDate() + 1);

    const mondayStr = monday.toISOString().split('T')[0];
    const tuesdayStr = tuesday.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const targetEmail = 'britodeandrade@gmail.com';

    // Helper function to inject workout history
    const injectHistory = (db) => {
        if (!db.completedWorkouts) db.completedWorkouts = {};
        if (!db.completedWorkouts[targetEmail]) db.completedWorkouts[targetEmail] = [];

        // Check and add Monday (A)
        if (!db.completedWorkouts[targetEmail].find(w => w.date === mondayStr && w.type === 'A')) {
            db.completedWorkouts[targetEmail].push({ date: mondayStr, type: 'A', duration: 3600 });
        }
        // Check and add Tuesday (B)
        if (!db.completedWorkouts[targetEmail].find(w => w.date === tuesdayStr && w.type === 'B')) {
            db.completedWorkouts[targetEmail].push({ date: tuesdayStr, type: 'B', duration: 3600 });
        }
        // Check and add Today (A)
        if (!db.completedWorkouts[targetEmail].find(w => w.date === todayStr && w.type === 'A')) {
            db.completedWorkouts[targetEmail].push({ date: todayStr, type: 'A', duration: 3600 });
        }

        // Helper to mark exercises as checked
        const markExercisesChecked = (plan, date) => {
             if (plan) {
                 plan.forEach(ex => {
                     if (!ex.checkIns) ex.checkIns = [];
                     if (!ex.checkIns.includes(date)) ex.checkIns.push(date);
                 });
             }
        };

        if (db.trainingPlans && db.trainingPlans.treinosA && db.trainingPlans.treinosA[targetEmail]) {
             markExercisesChecked(db.trainingPlans.treinosA[targetEmail], mondayStr);
             markExercisesChecked(db.trainingPlans.treinosA[targetEmail], todayStr);
        }
        if (db.trainingPlans && db.trainingPlans.treinosB && db.trainingPlans.treinosB[targetEmail]) {
             markExercisesChecked(db.trainingPlans.treinosB[targetEmail], tuesdayStr);
        }
    };


    if (savedDB) {
        Object.assign(database, savedDB);
        // Data migration for new features
        database.users.forEach(user => {
            if (!user.nutritionistData) {
                user.nutritionistData = { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' };
            } else if (!user.nutritionistData.plans) { // Migration for existing users
                user.nutritionistData.plans = [];
                // Fix: Cast nutritionistData to any to handle legacy 'plan' property during migration.
                if ((user.nutritionistData as any).plan) { // Move old plan to history
                    user.nutritionistData.plans.push({
                        date: new Date().toISOString(),
                        plan: (user.nutritionistData as any).plan,
                        answers: {}
                    });
                    delete (user.nutritionistData as any).plan;
                }
            }
            if (user.periodizationStartDate === undefined) {
                user.periodizationStartDate = null;
            }
            if (!user.stressData) {
                user.stressData = { assessments: [] };
            }
            if (!user.weightHistory) {
                user.weightHistory = [];
            }
            // Force reset periodization for Andre Brito to today
            if (user.email === 'britodeandrade@gmail.com') {
                 user.periodizationStartDate = new Date().toISOString().split('T')[0];
            }
        });

        // Force update workouts for ALL USERS to ensure they have plans loaded
        if (database.trainingPlans) {
            database.users.forEach(user => {
                // Ensure every user has a plan, using André's as the template if missing
                if (!database.trainingPlans.treinosA[user.email]) {
                    database.trainingPlans.treinosA[user.email] = treinosA_AndreBrito_Semana3e4;
                }
                if (!database.trainingPlans.treinosB[user.email]) {
                    database.trainingPlans.treinosB[user.email] = treinosB_AndreBrito_Semana3e4;
                }
            });
            
            // Explicitly set André's plan
            database.trainingPlans.treinosA['britodeandrade@gmail.com'] = treinosA_AndreBrito_Semana3e4;
            database.trainingPlans.treinosB['britodeandrade@gmail.com'] = treinosB_AndreBrito_Semana3e4;
        }

        if (!database.completedWorkouts) {
            database.completedWorkouts = {};
        }
        if (!database.activeSessions) {
            database.activeSessions = {};
        }
        if (!database.raceCalendar) {
             database.raceCalendar = []; // Initialize if not present
        }

        // INJECT HISTORY FOR CURRENT WEEK
        injectHistory(database);

        console.log('Dados carregados do armazenamento local');
        return;
    }

    // --- Hardcoded Race Calendar Data (as scraping is not feasible client-side) ---
    // UPDATED TO 2025
    database.raceCalendar = [
        {
            id: 'race-1',
            date: '2025-08-04',
            name: 'Meia Maratona do Cristo',
            location: 'Corcovado, Rio de Janeiro - RJ',
            distances: '21km (Solo), 21km (Dupla)',
            time: '08:00',
            price: 'A partir de R$ 250,00',
            registrationLink: 'https://www.ticketsports.com.br/e/meia-maratona-do-cristo-by-speed-38011'
        },
        {
            id: 'race-2',
            date: '2025-08-18',
            name: 'Asics Golden Run',
            location: 'Aterro do Flamengo, Rio de Janeiro - RJ',
            distances: '10km, 21km',
            time: '07:00',
            price: 'A partir de R$ 159,99',
            registrationLink: 'https://www.ticketsports.com.br/e/asics-golden-run-rio-de-janeiro-2024-37748'
        },
        {
            id: 'race-3',
            date: '2025-09-01',
            name: 'Shopping Leblon',
            location: 'Leblon, Rio de Janeiro - RJ',
            distances: '5km, 10km',
            time: '07:30',
            price: 'A ser definido',
            registrationLink: '#' // Placeholder link
        },
        {
            id: 'race-4',
            date: '2025-09-15',
            name: 'Circuito das Estações - Primavera',
            location: 'Aterro do Flamengo, Rio de Janeiro - RJ',
            distances: '5km, 10km, 15km',
            time: '07:00',
            price: 'A partir de R$ 139,99',
            registrationLink: 'https://circuitodasestacoes.com.br/'
        },
        {
            id: 'race-5',
            date: '2025-10-06',
            name: 'Bravus Race',
            location: 'Campo dos Afonsos, Rio de Janeiro - RJ',
            distances: '5km (com obstáculos)',
            time: '08:00',
            price: 'A partir de R$ 189,99',
            registrationLink: 'https://www.bravusrace.com.br/'
        },
        {
            id: 'race-6',
            date: '2025-10-20',
            name: 'WTR Arraial do Cabo',
            location: 'Arraial do Cabo - RJ',
            distances: '8km, 16km, 32km (Trail Run)',
            time: '07:00',
            price: 'A partir de R$ 220,00',
            registrationLink: 'https://worldtrailraces.com.br/wtr-arraial-do-cabo-2024/'
        }
    ];

    const periodizacaoPlano1 = [
        { week: '1ª e 2ª', phase: 'Adaptação/Hipertrofia', methods: 'Método de execução Simples', reps: '15', volume: '6 séries/grupo', intensity: '50-60% 1RM', recovery: '30 Seg' },
        { week: '3ª e 4ª', phase: 'Adaptação/Hipertrofia', methods: 'Método de execução Simples', reps: '13', volume: '6 séries/grupo', intensity: '50-60% 1RM', recovery: '30 Seg' },
        { week: '5ª e 6ª', phase: 'Força', methods: 'Método de execução Simples', reps: '11', volume: '6 séries/grupo', intensity: '50-60% 1RM', recovery: '30 Seg' },
        { week: '7ª e 8ª', phase: 'Força', methods: 'Método de execução Simples', reps: '9', volume: '9 séries/grupo', intensity: '70-75% 1RM', recovery: '30 Seg' },
        { week: '9ª e 10ª', phase: 'Força', methods: 'Método de execução Simples', reps: '8', volume: '9 séries/grupo', intensity: '70-75% 1RM', recovery: '30 Seg' },
        { week: '11ª, 12ª e 13ª', phase: 'Força', methods: 'Método de execução Pirâmide crescente de carga', reps: '12/10/8', volume: '9 séries/grupo', intensity: '70-75% 1RM', recovery: '30 Seg' },
    ];
    
    const periodizacaoPlanoGeral = [
        { week: '1ª e 2ª Semanas', phase: 'Adaptação/Hipertrofia', methods: 'Método de execução Simples', reps: '9', volume: '16 séries/grupo', intensity: '70-75% 1RM', recovery: '60-90s', metodo_desc: 'Método de execução Simples', descricao: 'Realizar o número prescrito de repetições com a carga determinada, mantendo técnica adequada em todas as repetições.' },
        { week: '3ª e 4ª Semanas', phase: 'Adaptação/Hipertrofia', methods: 'Método de execução Simples', reps: '9', volume: '16 séries/grupo', intensity: '70-75% 1RM', recovery: '60-90s', metodo_desc: 'Método Rest-Pause', descricao: 'Realizar uma série até a falha concêntrica, descansar apenas 10 segundos, realizar mais repetições até nova falha, repetir o total de séries prescritas por exercício.' },
        { week: '5ª e 6ª Semanas', phase: 'Força', methods: 'Método de execução Simples + Rest-Pause', reps: '6-7', volume: '14 séries/grupo', intensity: '80-85% 1RM', recovery: '90-120s', metodo_desc: 'Método Pirâmide Decrescente', descricao: 'Iniciar com carga para o número de repetições alvo, reduzir 2% da carga e realizar + 1 repetição, repetir o processo 3 vezes, ou seja, sempre manter a carga e aumentar as repetições a cada série.' },
        { week: '7ª e 8ª Semanas', phase: 'Força', methods: 'Método de execução Simples + Rest-Pause', reps: '5-6', volume: '12 séries/grupo', intensity: '80-85% 1RM', recovery: '90-120s', metodo_desc: 'Método Drop-Set', descricao: 'Realizar a série até a falha, reduzir a carga em 20-30% e continuar até nova falha sem descanso. Repetir mais uma vez se necessário.' },
        { week: '9ª e 10ª Semanas', phase: 'Força Pura', methods: 'Método de execução Simples + Excêntrica Lenta', reps: '4-5', volume: '10 séries/grupo', intensity: '85-90% 1RM', recovery: '120-180s', metodo_desc: 'Método Excêntrica Lenta', descricao: 'Realizar a fase concêntrica (subida) de forma explosiva e a fase excêntrica (descida) de forma controlada (3-4 segundos).' },
        { week: '11ª, 12ª e 13ª Semanas', phase: 'Pico de Força', methods: 'Método de execução Cluster Sets', reps: '3-4', volume: '8 séries/grupo', intensity: '90-95% 1RM', recovery: '180s+', metodo_desc: 'Método Cluster Sets', descricao: 'Realizar repetições com intervalos curtos (10-15s) entre elas dentro da mesma série. Ex: 1 rep, descansa 15s, 1 rep, descansa 15s...' },
    ];


    // Configurar periodização inicial para todos os usuários se não existir
    if (!database.trainingPlans.periodizacao) database.trainingPlans.periodizacao = {};
    
    // Configura a periodização específica para cada usuário
    database.users.forEach(user => {
        if (!database.trainingPlans.periodizacao[user.email]) {
             // André Brito e Marcelly usam o plano geral (13 semanas)
             if (user.email === 'britodeandrade@gmail.com' || user.email === 'marcellybispo92@gmail.com') {
                 database.trainingPlans.periodizacao[user.email] = periodizacaoPlanoGeral;
             } else {
                 // Outros usam o plano padrão de adaptação (plano 1)
                 database.trainingPlans.periodizacao[user.email] = periodizacaoPlano1;
             }
        }
        
        // Ensure every user has a plan on fresh init as well
        if (!database.trainingPlans.treinosA[user.email]) {
             database.trainingPlans.treinosA[user.email] = treinosA_AndreBrito_Semana3e4;
        }
        if (!database.trainingPlans.treinosB[user.email]) {
             database.trainingPlans.treinosB[user.email] = treinosB_AndreBrito_Semana3e4;
        }
    });

    saveDatabase(database);
    console.log('Banco de dados inicializado/atualizado.');
}


function getPeriodizationPhase(user) {
    if (!user.periodizationStartDate) return null;

    const startDate = new Date(user.periodizationStartDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let currentWeek = Math.ceil(diffDays / 7);

    // Ajuste para garantir que comece na semana 1
    if (currentWeek < 1) currentWeek = 1;

    const db = getDatabase();
    const periodizacao = db.trainingPlans.periodizacao[user.email];

    if (!periodizacao) return null;

    let currentPhase = null;
    
    // Lógica para mapear a semana atual para a fase correta na estrutura da periodização
    for (const p of periodizacao) {
        const weeksStr = p.week.match(/\d+/g); // Extrai todos os números da string
        if (weeksStr) {
            const weeks = weeksStr.map(Number);
            if (weeks.includes(currentWeek)) {
                currentPhase = p;
                break;
            }
        }
    }
    
    // Se a semana atual ultrapassar a última semana definida, mantém a última fase ou retorna concluído
    if (!currentPhase && periodizacao.length > 0) {
         const lastPhase = periodizacao[periodizacao.length - 1];
         const lastWeeksStr = lastPhase.week.match(/\d+/g);
         if (lastWeeksStr) {
             const maxWeek = Math.max(...lastWeeksStr.map(Number));
             if (currentWeek > maxWeek) {
                 return { ...lastPhase, week: `Pós-${maxWeek}ª (Manutenção)`, currentWeek: currentWeek, status: 'completed' };
             }
         }
    }

    return currentPhase ? { ...currentPhase, currentWeek: currentWeek } : null;
}

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

function loadTrainingScreen(type: string, email: string) {
    const db = getDatabase();
    const plan = db.trainingPlans[`treinos${type}`]?.[email];
    
    // Update UI for training screen (assuming elements exist)
    const titleEl = document.getElementById('training-title');
    if (titleEl) titleEl.textContent = `Treino ${type}`;
    
    const listEl = document.getElementById('training-content-wrapper');
    if (listEl && plan) {
        listEl.innerHTML = plan.map((ex: any) => `
            <div class="bg-gray-800 rounded-lg p-4 mb-4 flex gap-4">
                <img src="${ex.img}" class="w-20 h-20 object-cover rounded bg-gray-700" alt="${ex.name}">
                <div class="flex-1">
                    <h3 class="text-white font-bold text-sm">${ex.name}</h3>
                    <div class="text-xs text-gray-400 mt-1">
                        ${ex.sets}x ${ex.reps} | ${ex.carga}kg
                    </div>
                    <p class="text-xs text-gray-500 mt-1">${ex.obs}</p>
                </div>
            </div>
        `).join('');
    } else if (listEl) {
        listEl.innerHTML = '<p class="text-gray-500 text-center mt-10">Nenhum treino encontrado para este perfil.</p>';
    }

    transitionScreen('trainingScreen');
}

function renderRunningScreen(user: any) {
    const db = getDatabase();
    const workouts = db.userRunningWorkouts[user.email] || [];
    const listEl = document.getElementById('running-workouts-list');
    if (listEl) {
        listEl.innerHTML = workouts.length ? workouts.map((w: any) => `
            <div class="bg-gray-800 p-3 rounded mb-2">
                <p class="text-white text-sm">${w.date}</p>
                <p class="text-gray-400 text-xs">${w.distance || 'Livre'}</p>
            </div>
        `).join('') : '<p class="text-gray-500 text-center">Sem treinos de corrida.</p>';
    }
    transitionScreen('runningScreen');
}

function renderPeriodizationScreen(user: any) {
    const phase = getPeriodizationPhase(user);
    const container = document.getElementById('periodization-content-wrapper');
    if (container && phase) {
        container.innerHTML = `
            <div class="bg-gray-800 p-5 rounded-xl border-l-4 border-red-500">
                <h3 class="text-xl font-bold text-white">${phase.phase}</h3>
                <p class="text-gray-400 text-sm mt-1">Semana ${phase.currentWeek}</p>
                <div class="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-300">
                    <div><span class="block text-gray-500">Método</span>${phase.methods}</div>
                    <div><span class="block text-gray-500">Intensidade</span>${phase.intensity}</div>
                </div>
            </div>
        `;
    } else if (container) {
        container.innerHTML = '<p class="text-gray-500 text-center">Periodização não definida.</p>';
    }
    transitionScreen('periodizationScreen');
}

function renderWeightControlScreen(user: any) {
    transitionScreen('weightControlScreen');
}

function renderNutritionistScreen(user: any) {
    transitionScreen('iaNutritionistScreen');
}

function renderStressLevelScreen(user: any) {
    transitionScreen('stressLevelScreen');
}

function renderRaceCalendarScreen() {
    const db = getDatabase();
    const list = document.getElementById('race-calendar-list');
    if (list && db.raceCalendar) {
        list.innerHTML = db.raceCalendar.map((race: any) => `
            <div class="race-card">
                <div class="race-date-box">
                    <div class="race-date-day">${race.date.split('-')[2]}</div>
                    <div class="race-date-month">${new Date(race.date).toLocaleString('default', { month: 'short' })}</div>
                </div>
                <div>
                    <h4 class="text-white font-bold text-sm">${race.name}</h4>
                    <p class="text-gray-400 text-xs">${race.location}</p>
                    <p class="text-gray-500 text-[10px] mt-1">${race.distances}</p>
                </div>
            </div>
        `).join('');
    }
    transitionScreen('raceCalendarScreen');
}

async function renderAiAnalysisScreen(user: any) {
    const container = document.getElementById('ai-analysis-content');
    if (!container) return; 

    // Initial render
    container.innerHTML = `
        <div class="text-center py-8">
            <div class="bg-gray-800 p-6 rounded-2xl inline-block mb-4">
                <i data-feather="cpu" class="w-12 h-12 text-red-500"></i>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Análise IA</h3>
            <p class="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                Receba feedback personalizado sobre seu progresso, treino e nutrição.
            </p>
            <button id="btn-generate-analysis" class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all active:scale-95">
                Gerar Análise Agora
            </button>
            <div id="ai-result-display" class="mt-8 text-left hidden bg-gray-800 p-4 rounded-xl border border-gray-700"></div>
        </div>
    `;
    feather.replace();

    const btn = document.getElementById('btn-generate-analysis');
    const display = document.getElementById('ai-result-display');

    if (btn && display) {
        btn.onclick = async () => {
            btn.innerHTML = '<span class="animate-pulse">Analisando...</span>';
            (btn as HTMLButtonElement).disabled = true;
            display.classList.remove('hidden');
            display.innerHTML = '<p class="text-gray-400 text-center text-sm">Consultando a inteligência artificial...</p>';

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `
                    Analise os dados do aluno:
                    Nome: ${user.name}
                    Fase da Periodização: ${getPeriodizationPhase(user)?.phase || 'Não definida'}
                    Histórico de Peso: ${JSON.stringify(user.weightHistory.slice(-3))}
                    
                    Forneça 3 insights curtos e motivadores sobre o progresso e foco para a próxima semana.
                    Use formatação Markdown.
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt
                });

                display.innerHTML = marked.parse(response.text);
                btn.innerHTML = 'Gerar Novamente';
                (btn as HTMLButtonElement).disabled = false;
            } catch (error) {
                console.error('AI Error:', error);
                display.innerHTML = '<p class="text-red-400 text-center text-sm">Erro ao conectar com a IA. Tente novamente.</p>';
                btn.innerHTML = 'Tentar Novamente';
                (btn as HTMLButtonElement).disabled = false;
            }
        };
    }
}


// --- MAIN APP LOGIC ---

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o banco de dados
    initializeDatabase();

    // Referências DOM globais
    const appContainer = document.getElementById('appContainer');
    const splashScreen = document.getElementById('splashScreen');
    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email') as HTMLInputElement; // Type casting
    const loginError = document.getElementById('login-error');
    // REMOVED: const bottomNav = document.getElementById('bottom-nav');

    // Inicializa Feather Icons
    if (typeof feather !== 'undefined') feather.replace();
    
    // Inicializa o Listener de Instalação do PWA
    let deferredPrompt: any;
    const pwaInstallBanner = document.getElementById('pwa-install-banner');
    const pwaInstallBtn = document.getElementById('pwa-install-btn');
    const pwaCloseBtn = document.getElementById('pwa-close-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Previne o prompt padrão do Chrome
        e.preventDefault();
        // Guarda o evento para acionar depois
        deferredPrompt = e;
        // Mostra o banner customizado
        if (pwaInstallBanner) {
             pwaInstallBanner.classList.remove('hidden');
             setTimeout(() => {
                 pwaInstallBanner.classList.remove('translate-y-full');
             }, 100);
        }
    });

    if (pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
                // Esconde o banner
                if (pwaInstallBanner) pwaInstallBanner.classList.add('hidden');
            }
        });
    }

    if (pwaCloseBtn) {
        pwaCloseBtn.addEventListener('click', () => {
             if (pwaInstallBanner) pwaInstallBanner.classList.add('hidden');
        });
    }


    // Verifica usuário logado
    const currentUserEmail = getCurrentUser();

    // Simula tempo de splash screen - AQUI ESTÁ A LÓGICA DE TRANSIÇÃO
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.classList.add('fade-out');
            setTimeout(() => {
                splashScreen.style.display = 'none';
                if (appContainer) {
                    appContainer.classList.remove('init-hidden');
                    appContainer.classList.remove('hidden');
                }
                
                if (currentUserEmail) {
                    loadStudentProfile(currentUserEmail);
                } else {
                    transitionScreen('loginScreen', 'right');
                }
            }, 500);
        }
    }, 2000);

    // Login Handler
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginEmailInput.value.trim();
            const db = getDatabase();
            const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

            if (user) {
                setCurrentUser(user.email);
                if (loginError) loginError.textContent = '';
                loadStudentProfile(user.email);
            } else {
                if (loginError) loginError.textContent = 'Email não encontrado. Tente novamente.';
            }
        });
    }

    // Logout Handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            location.reload();
        });
    }
});

// --- SCREEN TRANSITION LOGIC ---
function transitionScreen(targetScreenId: string, direction = 'left') {
    const screens = document.querySelectorAll('.screen');
    const targetScreen = document.getElementById(targetScreenId);

    if (!targetScreen) return;

    // 1. Force hide ALL screens immediately to prevent overlap
    screens.forEach(s => {
        (s as HTMLElement).style.display = 'none';
        s.classList.remove('active');
    });

    // 2. Show Target Screen
    (targetScreen as HTMLElement).style.display = 'block';
    // Small delay to allow display:block to apply before adding active class
    requestAnimationFrame(() => {
        targetScreen.classList.add('active');
    });
}

// Global back button handler
document.addEventListener('click', (e) => {
    const target = (e.target as Element).closest('.back-btn');
    if (target) {
        const targetScreen = target.getAttribute('data-target');
        if (targetScreen) transitionScreen(targetScreen, 'right');
    }
});


// --- STUDENT PROFILE LOGIC ---
function loadStudentProfile(email: string) {
    const db = getDatabase();
    const user = db.users.find((u: any) => u.email === email);
    if (!user) return; // Should handle error

    transitionScreen('studentProfileScreen');

    // Update Greeting (NOW HANDLED IN PROFILE INFO)
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
        greetingEl.innerHTML = ''; 
    }

    // Update Weather
    updateWeather();

    // Update Profile Info Card - RESTORED
    const profileInfoEl = document.getElementById('student-profile-info');
    if (profileInfoEl) {
        profileInfoEl.classList.remove('hidden'); // UNHIDE
        profileInfoEl.style.display = ''; // Reset display property if inline styles were set
        
        const hour = new Date().getHours();
        let greeting = 'Bom dia';
        if (hour >= 12) greeting = 'Boa tarde';
        if (hour >= 18) greeting = 'Boa noite';

        profileInfoEl.innerHTML = `
            <img src="${user.photo}" alt="${user.name}" class="w-16 h-16 rounded-full border-2 border-red-600 object-cover shadow-lg">
            <div>
                <h2 class="text-xl font-bold text-white leading-tight">${greeting}, <span class="text-red-500">${user.name.split(' ')[0]}</span></h2>
                <p class="text-xs text-gray-400 mt-1">${user.email}</p>
            </div>
        `;
    }

    // Update Dashboard Buttons
    renderStudentProfile(user);

    // Initialize Calendar
    renderCalendar(user.email);
    
    // Initialize AI Analysis Screen (passing user data)
    renderAiAnalysisScreen(user);
    
    // Render History Preview
    renderTrainingHistoryPreview(user.email);
}

function renderStudentProfile(user: any) {
    const buttonsContainer = document.getElementById('student-profile-buttons');
    if (!buttonsContainer) return;

    // Definição dos botões com ícones FontAwesome (fas) para consistência total
    
    const menuItems = [
        { label: 'Treino A', faIcon: 'fa-dumbbell', action: () => loadTrainingScreen('A', user.email) },
        { label: 'Treino B', faIcon: 'fa-dumbbell', action: () => loadTrainingScreen('B', user.email) },
        { label: 'Corrida', faIcon: 'fa-person-running', action: () => renderRunningScreen(user) },
        { label: 'Periodização', faIcon: 'fa-calendar-days', action: () => renderPeriodizationScreen(user) }, // Ícone de Calendário
        { label: 'Peso', faIcon: 'fa-weight-scale', action: () => renderWeightControlScreen(user) },
        { label: 'Nutri IA', faIcon: 'fa-apple-whole', action: () => renderNutritionistScreen(user) },
        { label: 'Estresse', faIcon: 'fa-heart-pulse', action: () => renderStressLevelScreen(user) },
        { label: 'Provas de Corrida', faIcon: 'fa-medal', action: () => renderRaceCalendarScreen() }, // Ícone de Medalha/Prova
        { label: 'Análise IA', faIcon: 'fa-microchip', action: () => renderAiAnalysisScreen(user) }, 
        { label: 'Avaliação', faIcon: 'fa-clipboard-user', action: () => transitionScreen('physioAssessmentScreen') },
        { label: 'Outdoor', faIcon: 'fa-sun', action: () => transitionScreen('outdoorSelectionScreen') },
        { label: 'Biblioteca', faIcon: 'fa-book-open', action: () => transitionScreen('exerciciosScreen') },
        { label: 'Evolução', faIcon: 'fa-chart-line', action: () => transitionScreen('evolutionScreen') }
    ];

    buttonsContainer.innerHTML = '';
    
    const totalItems = menuItems.length;

    menuItems.forEach((item, index) => {
        const btn = document.createElement('button');
        const isFeatured = item.label === 'Treino A' || item.label === 'Treino B';

        // Use standard metal-btn for ALL buttons as requested ("voltem a ficar iguais aos outros")
        btn.className = 'metal-btn p-3 flex flex-col items-center justify-center space-y-2 h-24 active:scale-95 transition-transform';
        
        // Calculate color: Start Red (220, 38, 38) -> End Black (0, 0, 0)
        // Simple linear interpolation for RGB
        const r = Math.round(220 - (220 * index / (totalItems - 1)));
        const g = Math.round(38 - (38 * index / (totalItems - 1)));
        const b = Math.round(38 - (38 * index / (totalItems - 1)));
        
        // If featured (Treino A/B), use red icon. Else use gradient.
        const iconColor = isFeatured ? '#ef4444' : `rgb(${r}, ${g}, ${b})`;
        
        // Create Icon Element using FontAwesome
        const iconEl = document.createElement('i');
        iconEl.className = `fas ${item.faIcon}`;
        iconEl.style.fontSize = '24px'; 
        iconEl.style.color = iconColor;
        
        // Text styling: If featured, use thicker black font ("leve destaque nas letras")
        const labelClass = isFeatured ? 'text-xs font-black text-red-600' : 'text-xs font-bold text-gray-800';
        
        if (isFeatured) {
            // Apply slight shadow to icon for emphasis
            iconEl.style.filter = `drop-shadow(0 0 2px ${iconColor})`;
        } else {
             // Apply glow effect for the first few items to make them pop more "red" if not fully black
            if (index < 3) {
                iconEl.style.filter = `drop-shadow(0 0 2px ${iconColor})`;
            }
        }

        const labelEl = document.createElement('span');
        labelEl.className = labelClass;
        labelEl.textContent = item.label;

        btn.appendChild(iconEl);
        btn.appendChild(labelEl);
        
        btn.onclick = (e) => {
             // Se for Análise IA, precisamos garantir que a tela seja exibida
             if (item.label === 'Análise IA') {
                 transitionScreen('aiAnalysisScreen');
             } else {
                 item.action();
             }
        };

        buttonsContainer.appendChild(btn);
    });
    
    // Feather replace is mostly for other parts of the UI now, but kept for safety
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

function renderTrainingHistoryPreview(email: string) {
    const container = document.getElementById('training-history-container');
    const db = getDatabase();
    const history = db.completedWorkouts[email] || [];
    
    // Sort by date desc
    const sortedHistory = [...history].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5); // Last 5

    if (!container) return;

    if (sortedHistory.length === 0) {
        container.innerHTML = `
            <h3 class="font-bold text-white mb-2">Histórico de Treinos</h3>
            <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                <p class="text-gray-400 text-sm">Nenhum treino de musculação registrado ainda.</p>
            </div>
        `;
        return;
    }

    let html = `
        <h3 class="font-bold text-white mb-2">Últimos Treinos</h3>
        <div class="space-y-2">
    `;

    sortedHistory.forEach((workout: any) => {
        const date = new Date(workout.date + 'T12:00:00Z'); // Force timezone consistency
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        let typeLabel = `Treino ${workout.type}`;
        let badgeClass = workout.type === 'A' ? 'workout-badge-A' : 'workout-badge-B';

        html += `
            <div class="bg-gray-800 rounded-xl p-3 border border-gray-700 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="bg-gray-700 p-2 rounded-lg">
                        <i data-feather="check" class="text-green-500 w-4 h-4"></i>
                    </div>
                    <div>
                        <p class="text-white font-bold text-sm">${typeLabel}</p>
                        <p class="text-gray-400 text-xs capitalize">${date.toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-white font-bold text-sm">${dateStr}</span>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
    if (typeof feather !== 'undefined') feather.replace();
}


// --- CALENDAR LOGIC ---
let currentCalendarDate = new Date(2025, 11, 1); // Start at December 2025 as requested or Current Date

function renderCalendar(email: string) {
    const grid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('calendar-month-year');
    const prevBtn = document.getElementById('prev-month-btn');
    const nextBtn = document.getElementById('next-month-btn');

    if (!grid || !monthYear) return;
    
    // Ensure we are using 2025 if current date is before 2025 (just for demo consistency with prompt)
    const now = new Date();
    if (now.getFullYear() < 2025) {
        currentCalendarDate = new Date(); 
    }

    const render = () => {
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        monthYear.textContent = `${monthNames[month].toUpperCase()} ${year}`;

        grid.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day empty';
            grid.appendChild(div);
        }

        const db = getDatabase();
        const completedWorkouts = db.completedWorkouts[email] || [];
        const runningWorkouts = db.userRunningWorkouts[email] || [];

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const div = document.createElement('div');
            div.className = 'calendar-day';
            div.textContent = String(i);

            // Check completion
            const workoutsOnDay = completedWorkouts.filter((w: any) => w.date === dateStr);
            const runningOnDay = runningWorkouts.find((w: any) => w.date === dateStr && w.completed);
            
            let hasA = false;
            let hasB = false;
            
            workoutsOnDay.forEach((w: any) => {
                if (w.type === 'A') hasA = true;
                if (w.type === 'B') hasB = true;
            });

            if (hasA && hasB) {
                div.classList.add('treino-A-B-completed');
            } else if (hasA) {
                div.classList.add('treino-A-completed');
            } else if (hasB) {
                div.classList.add('treino-B-completed');
            } else if (runningOnDay) {
                div.classList.add('treino-corrida-completed');
            } else {
                 // Check if there is a planned run for today that isn't completed
                 const plannedRun = runningWorkouts.find((w: any) => w.date === dateStr && !w.completed);
                 if (plannedRun) {
                     div.classList.add('treino-corrida'); // Orange border
                 }
            }
            
            // Highlight Today
            const today = new Date();
            if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                div.classList.add('today');
            }

            grid.appendChild(div);
        }
    };

    render();

    if (prevBtn) prevBtn.onclick = () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        render();
    };
    if (nextBtn) nextBtn.onclick = () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        render();
    };
}
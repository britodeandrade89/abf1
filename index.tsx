import { GoogleGenAI } from "@google/genai";

// Globals defined by imported scripts
declare var feather: any;
declare var Chart: any;
declare var marked: any;
declare var L: any; // Leaflet global

// Fix: Correctly type workoutTimerInterval
let workoutTimerInterval: number | null = null;
let workoutStartTime: Date | null = null;

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

function generateCyclicRunningWorkouts(baseWorkouts) {
    if (!baseWorkouts || baseWorkouts.length === 0) return [];

    const extendedWorkouts = [...baseWorkouts];
    const baseCycle = [...baseWorkouts];
    const lastWorkoutDateStr = baseWorkouts[baseWorkouts.length - 1].date;

    let currentDate = new Date(`${lastWorkoutDateStr}T12:00:00Z`); // Use a fixed time to avoid timezone issues
    currentDate.setDate(currentDate.getDate() + 1); // Start from the next day

    const endDate = new Date('2024-12-31T12:00:00Z');
    let cycleIndex = 0;

    while (currentDate <= endDate) {
        const baseWorkout = baseCycle[cycleIndex % baseCycle.length];
        extendedWorkouts.push({
            ...baseWorkout,
            date: currentDate.toISOString().split('T')[0],
            completed: false,
            performance: null,
        });
        currentDate.setDate(currentDate.getDate() + 1);
        cycleIndex++;
    }
    return extendedWorkouts;
}


function initializeDatabase() {
    // Definir os treinos do André Brito aqui para garantir que sejam aplicados tanto na inicialização limpa quanto na migração
    const treinosA_AndreBrito_Semana3e4 = [
        { name: 'Agachamento Livre com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/77Uth2fQUxtPXvqu1UCb.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Leg Press Horizontal', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/TYYs8dYewPrOA5MB0LKt.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Leg Press Horizontal unilateral', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/7yRR2CeoHxGPlbi3mw89.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Cadeira Extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/rQ8l64KvygQUAa8FZXyp.jpg', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Cadeira Extensora unilateral', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/BDBVsJS1WneT1BvLSW9S.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
        { name: 'Supino aberto com HBC no banco inclinado', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/fWBlaY5LXefUGcXHz2tO.jpg', sets: '3', reps: '12', carga: '0', obs: 'Método Simples', recovery: '30s' },
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
            // Force reset periodization for Andre Brito to today
            if (user.email === 'britodeandrade@gmail.com') {
                 user.periodizationStartDate = new Date().toISOString().split('T')[0];
            }
        });

        // Force update workouts for André Brito to ensure 3 sets and new list
        if (database.trainingPlans) {
            database.trainingPlans.treinosA['britodeandrade@gmail.com'] = treinosA_AndreBrito_Semana3e4;
            if (database.trainingPlans.treinosB) database.trainingPlans.treinosB['britodeandrade@gmail.com'] = treinosB_AndreBrito_Semana3e4;
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
        console.log('Dados carregados do armazenamento local');
        return;
    }

    // --- Hardcoded Race Calendar Data (as scraping is not feasible client-side) ---
    database.raceCalendar = [
        {
            id: 'race-1',
            date: '2024-08-04',
            name: 'Meia Maratona do Cristo',
            location: 'Corcovado, Rio de Janeiro - RJ',
            distances: '21km (Solo), 21km (Dupla)',
            time: '08:00',
            price: 'A partir de R$ 250,00',
            registrationLink: 'https://www.ticketsports.com.br/e/meia-maratona-do-cristo-by-speed-38011'
        },
        {
            id: 'race-2',
            date: '2024-08-18',
            name: 'Asics Golden Run',
            location: 'Aterro do Flamengo, Rio de Janeiro - RJ',
            distances: '10km, 21km',
            time: '07:00',
            price: 'A partir de R$ 159,99',
            registrationLink: 'https://www.ticketsports.com.br/e/asics-golden-run-rio-de-janeiro-2024-37748'
        },
        {
            id: 'race-3',
            date: '2024-09-01',
            name: 'Shopping Leblon',
            location: 'Leblon, Rio de Janeiro - RJ',
            distances: '5km, 10km',
            time: '07:30',
            price: 'A ser definido',
            registrationLink: '#' // Placeholder link
        },
        {
            id: 'race-4',
            date: '2024-09-15',
            name: 'Circuito das Estações - Primavera',
            location: 'Aterro do Flamengo, Rio de Janeiro - RJ',
            distances: '5km, 10km, 15km',
            time: '07:00',
            price: 'A partir de R$ 139,99',
            registrationLink: 'https://circuitodasestacoes.com.br/'
        },
        {
            id: 'race-5',
            date: '2024-10-06',
            name: 'Bravus Race',
            location: 'Campo dos Afonsos, Rio de Janeiro - RJ',
            distances: '5km (com obstáculos)',
            time: '08:00',
            price: 'A partir de R$ 189,99',
            registrationLink: 'https://www.bravusrace.com.br/'
        },
        {
            id: 'race-6',
            date: '2024-10-20',
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
        { week: '7ª e 8ª Semanas', phase: 'Força', methods: 'Método de execução Simples + Rest-Pause', reps: '5-6', volume: '12 séries/grupo', intensity: '80-85% 1RM', recovery: '90-120s', metodo_desc: null, descricao: null },
        { week: '9ª e 10ª Semanas', phase: 'Força Máxima', methods: 'Método de execução Simples + Pirâmide', reps: '3 / 4 / 5', volume: '10 séries/grupo', intensity: '85-90% 1RM', recovery: '120-180s', metodo_desc: null, descricao: null },
        { week: '11ª Semana', phase: 'Força Máxima', methods: 'Método de execução Simples + Rest-Pause + Pirâmide', reps: '3 / 4 / 5', volume: '10 séries/grupo', intensity: '85-90% 1RM', recovery: '120-180s', metodo_desc: null, descricao: null },
        { week: '12ª e 13ª Semanas', phase: 'Deload', methods: 'Método de execução Simples (recuperação)', reps: '6-8', volume: '8 séries/grupo', intensity: '50-60% 1RM', recovery: '60s', metodo_desc: null, descricao: null },
    ];
    
    const periodizacaoPlanoAndre = [
        { week: '1ª e 2ª Semanas', phase: 'Adaptação/Hipertrofia', methods: 'Método de execução Simples', reps: '8-9', volume: '16 séries/grupo', intensity: '70-75% 1RM', recovery: '60-90s', metodo_desc: 'Método Rest-Pause', descricao: 'Realizar uma série até a falha concêntrica, descansar apenas 10 segundos, realizar mais repetições até nova falha, repetir o total de séries prescritas por exercício.' },
        { week: '3ª e 4ª Semanas', phase: 'Força', methods: 'Método de execução Simples + Rest-Pause', reps: '6-7', volume: '14 séries/grupo', intensity: '80-85% 1RM', recovery: '90-120s', metodo_desc: 'Método Pirâmide Decrescente', descricao: 'Iniciar com carga para o número de repetições alvo, reduzir 2% da carga e realizar + 1 repetição, repetir o processo 3 vezes, ou seja, sempre manter a carga e aumentar as repetições a cada série.' },
        { week: '5ª e 6ª Semanas', phase: 'Força', methods: 'Método de execução Simples + Rest-Pause', reps: '5-6', volume: '12 séries/grupo', intensity: '80-85% 1RM', recovery: '90-120s', metodo_desc: null, descricao: null },
        { week: '7ª e 8ª Semanas', phase: 'Força Máxima', methods: 'Método de execução Simples + Pirâmide', reps: '3 / 4 / 5', volume: '10 séries/grupo', intensity: '85-90% 1RM', recovery: '120-180s', metodo_desc: null, descricao: null },
        { week: '9ª Semana', phase: 'Força Máxima', methods: 'Método de execução Simples + Rest-Pause + Pirâmide', reps: '3 / 4 / 5', volume: '10 séries/grupo', intensity: '85-90% 1RM', recovery: '120-180s', metodo_desc: null, descricao: null },
        { week: '10ª e 11ª Semanas', phase: 'Deload', methods: 'Método de execução Simples (recuperação)', reps: '6-8', volume: '8 séries/grupo', intensity: '50-60% 1RM', recovery: '60s', metodo_desc: null, descricao: null },
    ];

    const periodizacaoPorUsuario = {
        'britodeandrade@gmail.com': periodizacaoPlanoAndre,
        'marcellybispo92@gmail.com': periodizacaoPlanoGeral,
        'andrademarcia.ucam@gmail.com': periodizacaoPlano1,
        'lilicatorres@gmail.com': periodizacaoPlano1,
        'arbrito.andrade@gmail.com': periodizacaoPlano1,
    };

    const treinosA = {
        'britodeandrade@gmail.com': treinosA_AndreBrito_Semana3e4,
        'marcellybispo92@gmail.com': [
            { name: 'Agachamento livre com HBC (descer ao máximo) (CONJUGADO 1)', conjugado: 1, img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/s3EEHvDgNM2noyrFu942.png', sets: '4', reps: '9', carga: '0', obs: '', recovery: '30s' },
            { name: 'Agachamento livre sem peso (descer ao máximo e subir até 30º de extensão de joelho) (CONJUGADO 1)', conjugado: 1, img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/Rco3wwXc2fMICrkoKl2c.png', sets: '4', reps: '9', carga: '0', obs: '', recovery: '30s' },
            { name: 'Agachamento passada Búlgaro com 2 degrau e HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/jo9jsMXR96Q17m4pXn7B.jpg', sets: '2', reps: '9', carga: '0', obs: '', recovery: '30s' },
            { name: 'Leg press horizontal (CONJUGADO 2)', conjugado: 2, img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/7yRR2CeoHxGPlbi3mw89.png', sets: '4', reps: '9', carga: '0', obs: '', recovery: '30s' },
            { name: 'Leg press horizontal unilateral (CONJUGADO 2)', conjugado: 2, img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/7yRR2CeoHxGPlbi3mw89.png', sets: '4', reps: '9', carga: '0', obs: '', recovery: '30s' },
            { name: 'Supino aberto no banco inclinado ou reto com HBC (CONJUGADO 3)', conjugado: 3, img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/fWBlaY5LXefUGcXHz2tO.jpg', sets: '3', reps: '9', carga: '0', obs: '', recovery: '30s' },
            { name: 'Desenvolvimento fechado neutro com HBC (CONJUGADO 3)', conjugado: 3, img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/nqg5uBvdfqzIvgMUDpSy.png', sets: '3', reps: '9', carga: '0', obs: '', recovery: '30s' },
            { name: 'Extensão de cotovelos fechados no solo e de joelhos (CONJUGADO 4)', conjugado: 4, img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/eGNCCvzlv1jGWpSbs5nH.png', sets: '3', reps: '9', carga: '0', obs: '', recovery: '30s' },
            { name: 'Abdominal supra remador no solo (CONJUGADO 4)', conjugado: 4, img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/7M5vMfWh1Jb7DnLIUs4g.png', sets: '3', reps: '15', carga: '0', obs: '', recovery: '30s' }
        ],
        'andrademarcia.ucam@gmail.com': [
            { name: 'Levantar e sentar de um banco reto com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/gzrfW5iW6Apsl4Q2pLXa.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Supino reto com HBC no banco reto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/sViJmpz2dQopPzlducWx.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Abdominal supra no banco reto ou inclinado 30º', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/uia6QHw6AzFxc1O99Ijz.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Leg press horizontal + flexão plantar', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/7yRR2CeoHxGPlbi3mw89.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Desenvolvimento aberto com HBC no banco 75º', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/IfEmY5yvPUFOjyvLL1l5.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/lSKqgGqYChpRHitndPVZ.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' }
        ],
        'lilicatorres@gmail.com': [
            { name: 'Leg press horizontal', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/TYYs8dYewPrOA5MB0LKt.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Supino reto aberto na máquina', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/64gf4FLADApgXflx6DCT.webp', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Abdominal supra no banco reto ou inclinado 30º', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/LSVHRPVB8key1bttEGPz.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/BDBVsJS1WneT1BvLSW9S.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Desenvolvimento aberto com HBC no banco 75º', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qTH2XHNPet3GTANl0VaM.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira adutora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/5U2jakkNhbxXnMTXemsl.webp', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' }
        ],
        'arbrito.andrade@gmail.com': [
            { name: 'Leg press inclinado + Flexão plantar', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/9rA4h81jw0eAMF5qBrsj.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Agachamento parcial livre com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/tYJPT50FdlFb0nq49lbE.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Cadeira extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/0HnHc7UmLPWgOpiJbVkF.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Supino aberto na máquina', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/AA86qmJ1ykWY6CkpkybC.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Desenvolvimento aberto em pé com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/4YoxCSwONKp1YMGmgc5b.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Tríceps em pé no cross barra reta', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/DpUoWnRfyAEqegSJ567P.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Abdominal supra no solo', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/mnXs908TPzy2WU0kgNGd.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' }
        ]
    };

    const treinosB = {
        'britodeandrade@gmail.com': treinosB_AndreBrito_Semana3e4,
        'marcellybispo92@gmail.com': [
            { name: 'Agachamento sumô com HBC (CONJUGADO 1)', conjugado: 1, img: '', sets: '4', reps: '9', carga: '0', obs: 'Método Simples (9 RM)', recovery: '30s' },
            { name: 'Stiff em pé com HBC (CONJUGADO 1)', conjugado: 1, img: '', sets: '4', reps: '9', carga: '0', obs: 'Método Simples (9 RM)', recovery: '30s' },
            { name: 'Elevação de quadril no solo (CONJUGADO 2)', conjugado: 2, img: '', sets: '4', reps: '9', carga: '0', obs: 'Método Simples (9 RM)', recovery: '30s' },
            { name: 'Abdominal supra remador no solo (CONJUGADO 2)', conjugado: 2, img: '', sets: '4', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Extensão de quadril e joelho em pé com caneleira (CONJUGADO 3)', conjugado: 3, img: '', sets: '4', reps: '9', carga: '0', obs: 'Método Simples (9 RM)', recovery: '30s' },
            { name: 'Flexão de joelho em pé com caneleira (CONJUGADO 3)', conjugado: 3, img: '', sets: '4', reps: '9', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Remada curvada supinada no cross barra reta (CONJUGADO 4)', conjugado: 4, img: '', sets: '3', reps: '9', carga: '0', obs: 'Método Simples (9 RM)', recovery: '30s' },
            { name: 'Bíceps em pé no cross barra reta (CONJUGADO 4)', conjugado: 4, img: '', sets: '3', reps: '9', carga: '0', obs: 'Método Simples (9 RM)', recovery: '30s' },
            { name: 'Puxada aberta no pulley alto', img: '', sets: '3', reps: '9', carga: '0', obs: 'Método Simples (9 RM)', recovery: '30s' }
        ],
        'andrademarcia.ucam@gmail.com': [
            { name: 'Extensão de quadril em pé (caneleira) ou máquina', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3ozI0U0TzKEwRNqcxiv4.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Remada aberta sentada em máquina', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/4CM6u1EOI3c0Srnpcly8.avif', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira abdutora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/6tnHeV7VNw7bQClFlJTv.webp', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Puxada aberta no pulley alto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/CHmXKHcPr070Vm3F1x2Z.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira flexora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/iLHTNGWVYUEGS4hbvQNe.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Equilíbrio unilateral em pé em isometria (braços abertos e 1 quadril fletido)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/XRTBWuqR3iUTXseGoetD.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 segundos)', recovery: '30s' }
        ],
        'lilicatorres@gmail.com': [
            { name: 'Extensão de quadril em pé com caneleira', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/u3PKU8ZtUUSdtG0c9g6A.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Remada aberta no cross com barra reta polia média', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/hGUY7h8KaJpKuH1m21qJ.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira abdutora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/PQBZvn960IwgHLNHT2eL.webp', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Puxada aberta no pulley alto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/rr9P7XL3R0cPkWpEebgY.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira flexora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/UDZmcm25RwYOhocskktS.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Mata-borrão isométrico no solo em isometria', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/JjtFkVUdIjopuD5v28Hp.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 segundos)', recovery: '30s' }
        ],
        'arbrito.andrade@gmail.com': [
            { name: 'Agachamento sumô com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/mMHN6y1mlWxmdkXOQEBR.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Extensão de quadril em pé com caneleira', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/8HuxnupHOQqGroglEBHX.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Cadeira flexora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/YGHeKmY7PkCkLGIiuXA5.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Remada aberta na máquina', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/FGxqWChzRgUfZRA55VcS.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Puxada aberta no pullley alto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/FWuSz2883Pq7arcJCv0q.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Bíceps no cross barra reta', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/gowjwWfe9PfmcVVHB8Jv.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Mata-borrão isométrico no solo em isometria', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/h8GZDrtzz0gnGnemfDr3.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (15 segundos)', recovery: '30s' }
        ]
    };
    
    const userRunningWorkouts = {
        'britodeandrade@gmail.com': [
            { date: '2024-10-01', type: 'FARTLEK', description: "5' AQ + 20' CO alternado entre CA : CO + 5' REC", speed: '8,5', pace: '7', duration: '30' },
            { date: '2024-10-02', type: 'INTERVALADO', description: "5' AQ + (6 BLOCOS) 2' CO : 1'30'' REC + 3' REC", speed: '9,5', pace: '6,19', duration: '30' },
            { date: '2024-10-03', type: 'LONGÃO', description: "5' AQ + 3 KM DE CO CONTÍNUA + 5' REC", speed: '8,5', pace: '7,04', duration: '30' },
            { date: '2024-10-04', type: 'RITMO', description: "5' AQ + (4 BLOCOS) 500 metros CO : 2'30'' REC + 3' REC", speed: '11', pace: '5,27', duration: '26,3' },
            { date: '2024-10-05', type: 'TIROS', description: "5' AQ + (8 TIROS) 200 metros CO : 2'30 REC + 3' REC", speed: '15', pace: '4', duration: '32' },
        ],
        'marcellybispo92@gmail.com': [
            { date: '2024-10-01', type: 'FARTLEK', description: "5' AQ + 20' CO alternado entre CA : CO + 5' REC", speed: '7,5', pace: '8', duration: '30' },
            { date: '2024-10-02', type: 'INTERVALADO', description: "5' AQ + (6 BLOCOS) 2' CO : 1'30'' REC + 3' REC", speed: '8,5', pace: '7,04', duration: '30' },
            { date: '2024-10-03', type: 'LONGÃO', description: "5' AQ + 3 KM DE CO CONTÍNUA + 5' REC", speed: '8', pace: '7,3', duration: '30' },
            { date: '2024-10-04', type: 'RITMO', description: "5' AQ + (4 BLOCOS) 500 metros CO : 2'30'' REC + 3' REC", speed: '9,5', pace: '6,19', duration: '26,3' },
            { date: '2024-10-05', type: 'TIROS', description: "5' AQ + (8 TIROS) 200 metros CO : 2'30 REC + 3' REC", speed: '12', pace: '5', duration: '32' },
        ],
        'lilicatorres@gmail.com': [
            { date: '2024-10-01', type: 'FARTLEK', description: "5' CA Fraca + 25' CA Forte : CA Fraca", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-02', type: 'INTERVALADO', description: "5' AQ + (6 BLOCOS) 2' CO : 1'30'' REC + 3' REC", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-03', type: 'LONGÃO', description: "5' CA Fraca + 2 KM DE CA CONTÍNUA + 5' CA Fraca", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-04', type: 'RITMO', description: "5' CA Fraca + (4 BLOCOS) 500 metros CA Forte : 2'30'' CA Fraca + 3' Ca Fraca", speed: '6', pace: '10', duration: '30' },
            { date: '2024-10-05', type: 'TIROS', description: "5' CA Fraca + (9 TIROS) 1' CO Confortavel : 2' CA Fraca + 3' REC", speed: '7,5', pace: '8', duration: '30' },
        ],
        'andrademarcia.ucam@gmail.com': [
            { date: '2024-10-01', type: 'FARTLEK', description: "5' CA Fraca + 25' CA Forte : CA Fraca", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-02', type: 'INTERVALADO', description: "5' AQ + (6 BLOCOS) 2' CO : 1'30'' REC + 3' REC", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-03', type: 'LONGÃO', description: "5' CA Fraca + 2 KM DE CA CONTÍNUA + 5' CA Fraca", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-04', type: 'RITMO', description: "5' CA Fraca + (4 BLOCOS) 500 metros CA Forte : 2'30'' CA Fraca + 3' Ca Fraca", speed: '6', pace: '10', duration: '30' },
            { date: '2024-10-05', type: 'TIROS', description: "5' CA Fraca + (9 TIROS) 1' CO Confortavel : 2' CA Fraca + 3' REC", speed: '7,5', pace: '8', duration: '30' },
        ],
        'arbrito.andrade@gmail.com': [
            { date: '2024-10-01', type: 'FARTLEK', description: "5' CA Fraca + 25' CA Forte : CA Fraca", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-02', type: 'INTERVALADO', description: "5' AQ + (6 BLOCOS) 2' CO : 1'30'' REC + 3' REC", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-03', type: 'LONGÃO', description: "5' CA Fraca + 2 KM DE CA CONTÍNUA + 5' CA Fraca", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-04', type: 'RITMO', description: "5' CA Fraca + (4 BLOCOS) 500 metros CA Forte : 2'30'' CA Fraca + 3' Ca Fraca", speed: '6', pace: '10', duration: '30' },
            { date: '2024-10-05', type: 'TIROS', description: "5' CA Fraca + (9 TIROS) 1' CO Confortavel : 2' CA Fraca + 3' REC", speed: '7,5', pace: '8', duration: '30' },
        ]
    };
    
    database.trainingPlans = {
        treinosA,
        treinosB,
        periodizacao: periodizacaoPorUsuario
    };

    Object.keys(userRunningWorkouts).forEach(email => {
        userRunningWorkouts[email] = generateCyclicRunningWorkouts(userRunningWorkouts[email]);
    });
    database.userRunningWorkouts = userRunningWorkouts;

    const startDate = '2024-07-29';
    // Inicializa o histórico de carga e check-ins para cada usuário e exercício
    database.users.forEach(user => {
        const initializeExercises = (exercises) => {
            if (!exercises) return;
            exercises.forEach(ex => {
                ex.startDate = startDate;
                if (!ex.historicoCarga) ex.historicoCarga = [{ data: startDate, carga: ex.carga }];
                if (!ex.checkIns) ex.checkIns = [];
            });
        };
    
        const userTreinosA = database.trainingPlans.treinosA[user.email];
        if (Array.isArray(userTreinosA)) {
            initializeExercises(userTreinosA);
        } else if (userTreinosA) { // It's a weekly plan object
            Object.values(userTreinosA).forEach(plan => initializeExercises(plan));
        }
    
        const userTreinosB = database.trainingPlans.treinosB[user.email];
        if (Array.isArray(userTreinosB)) {
            initializeExercises(userTreinosB);
        } else if (userTreinosB) { // It's a weekly plan object
            Object.values(userTreinosB).forEach(plan => initializeExercises(plan));
        }
    });

    saveDatabase(database);
    console.log('Banco de dados inicializado e salvo');
}

// --- Lógica de Transição de Tela ---
function showScreen(screenId) {
    // Fix: Cast elements to HTMLElement to access style property
    document.querySelectorAll('.screen').forEach(s => (s as HTMLElement).style.display = 'none');
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.style.display = 'block';
        screen.classList.add('active');
    }
}

function transitionScreen(fromScreen, toScreen, direction = 'right') {
    if (!fromScreen || !toScreen || fromScreen === toScreen) return;

    const navBar = document.getElementById('bottom-nav');
    
    // Safety check: only manipulate navBar if it exists
    if (navBar) {
        // Hide nav bar on non-primary screens
        if (toScreen.id !== 'studentProfileScreen' && toScreen.id !== 'evolutionScreen') {
            navBar.classList.add('nav-hidden');
        } else {
            navBar.classList.remove('nav-hidden');
        }
    }

    const fromRight = direction === 'right' ? 'screen-exit-to-left' : 'screen-exit-to-right';
    const fromLeft = direction === 'right' ? 'screen-enter-from-right' : 'screen-enter-from-left';

    toScreen.style.display = 'block';
    toScreen.classList.add(fromLeft);

    requestAnimationFrame(() => {
        fromScreen.classList.add(fromRight);
        toScreen.classList.remove(fromLeft);
    });

    setTimeout(() => {
        fromScreen.style.display = 'none';
        fromScreen.classList.remove('active', 'screen-exit-to-left', 'screen-exit-to-right');
        toScreen.classList.add('active');
    }, 500);
}

async function performAiAnalysis(email) {
    const user = database.users.find(u => u.email === email);
    if (!user) return "## Erro\n\nUsuário não encontrado.";

    const spinner = document.getElementById('ai-analysis-spinner');
    const resultDiv = document.getElementById('ai-analysis-result');
    const initialView = document.querySelector('#aiAnalysisScreen .bg-gray-800');

    if (initialView) (initialView as HTMLElement).style.display = 'none';
    resultDiv.innerHTML = '';
    resultDiv.classList.add('hidden');
    spinner.classList.remove('hidden');

    try {
        // Return a temporary message as the client-side API call is disabled.
        return new Promise(resolve => {
            setTimeout(() => {
                resolve("## Análise IA Indisponível\n\nEsta funcionalidade está temporariamente desativada.");
            }, 1500); // Simulate network delay
        });

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return `## Erro na Análise\n\nOcorreu um erro. Detalhes: ${(error as Error).message}`;
    } finally {
        spinner.classList.add('hidden');
    }
}


// --- APP LOGIC ---
// Use 'load' event to ensure all external scripts (feather, chart.js, etc.) are available before initialization.
window.addEventListener('load', () => {
    const splashScreen = document.getElementById('splashScreen');
    const appContainer = document.getElementById('appContainer');

    const initializeApp = () => {
        try {
            // --- Service Worker Registration ---
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            }

            // --- PWA INSTALL BANNER LOGIC ---
            let deferredPrompt: any;
            const pwaBanner = document.getElementById('pwa-install-banner');
            const installBtn = document.getElementById('pwa-install-btn');
            const closeBtn = document.getElementById('pwa-close-btn');

            window.addEventListener('beforeinstallprompt', (e) => {
                // Prevent Chrome 67 and earlier from automatically showing the prompt
                e.preventDefault();
                // Stash the event so it can be triggered later.
                deferredPrompt = e;
                // Update UI to notify the user they can add to home screen
                if (pwaBanner) {
                    pwaBanner.classList.remove('hidden');
                    // Small delay to allow display:block to apply before transform transition
                    setTimeout(() => {
                        pwaBanner.classList.remove('translate-y-full'); 
                        pwaBanner.classList.add('translate-y-0');
                    }, 100);
                }
            });

            if (installBtn) {
                installBtn.addEventListener('click', async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        console.log(`User response to the install prompt: ${outcome}`);
                        deferredPrompt = null;
                    }
                    if (pwaBanner) pwaBanner.classList.add('hidden');
                });
            }

            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    if (pwaBanner) pwaBanner.classList.add('hidden');
                });
            }

            initializeDatabase();
            feather.replace();

            // Centralized initialization for screens that have complex logic/listeners
            initializePhysioAssessmentScreen();
            initializeOutdoorSelectionScreen();

            const loginScreen = document.getElementById('loginScreen');
            const studentProfileScreen = document.getElementById('studentProfileScreen');

            const loginForm = document.getElementById('login-form');
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const emailInput = document.getElementById('login-email') as HTMLInputElement;
                const email = emailInput.value;
                const user = database.users.find(u => u.email.toLowerCase() === email.toLowerCase());
                const loginError = document.getElementById('login-error');

                if (user) {
                    setCurrentUser(user.email);
                    renderStudentProfile(user.email);
                    transitionScreen(loginScreen, studentProfileScreen, 'right');
                    if (loginError) loginError.textContent = '';
                } else {
                    if (loginError) loginError.textContent = 'Email não encontrado.';
                }
            });

            document.getElementById('logout-btn').addEventListener('click', () => {
                setCurrentUser('');
                transitionScreen(studentProfileScreen, loginScreen, 'left');
            });

            // --- Bottom Nav Visibility on Scroll ---
            const navBar = document.getElementById('bottom-nav');
            let lastScrollY = 0;
            document.querySelectorAll('.screen').forEach(screen => {
                screen.addEventListener('scroll', () => {
                    // Safety check if navBar doesn't exist
                    if (!navBar) return;
                    
                    if (screen.id !== 'studentProfileScreen' && screen.id !== 'evolutionScreen') return;
                    
                    const currentScrollY = screen.scrollTop;
                    if (Math.abs(currentScrollY - lastScrollY) < 10) return;

                    if (currentScrollY > lastScrollY && currentScrollY > 50) {
                        navBar.classList.add('nav-hidden');
                    } else {
                        navBar.classList.remove('nav-hidden');
                    }
                    lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
                });
            });


            // --- Navegação ---
            const navButtons = document.querySelectorAll('.nav-btn');
            navButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const targetScreenId = (button as HTMLElement).dataset.target;
                    const currentScreen = document.querySelector('.screen.active');
                    const targetScreen = document.getElementById(targetScreenId);

                    if (currentScreen && targetScreen && currentScreen.id !== targetScreenId) {
                        navButtons.forEach(btn => btn.classList.remove('text-red-500', 'text-white'));
                        button.classList.add('text-red-500');
                        (Array.from(navButtons).filter(b => b !== button)).forEach(b => b.classList.add('text-white'));
                        
                        if (targetScreenId === 'evolutionScreen') renderEvolutionScreen(getCurrentUser());

                        transitionScreen(currentScreen, targetScreen);
                    }
                });
            });

            const backButtons = document.querySelectorAll('.back-btn');
            backButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const targetScreenId = (button as HTMLElement).dataset.target;
                    const currentScreen = document.querySelector('.screen.active');
                    const targetScreen = document.getElementById(targetScreenId);
                    if (currentScreen && targetScreen) {
                        transitionScreen(currentScreen, targetScreen, 'left');
                    }
                });
            });

            document.getElementById('running-workouts-list').addEventListener('click', (e) => {
                const email = getCurrentUser();
                if (!email) return;
                const target = e.target as HTMLElement;
                const card = target.closest('.running-session-card');
                if (!card) return;

                const workoutDate = (card as HTMLElement).dataset.workoutDate;

                if ((target as HTMLInputElement).type === 'checkbox') {
                    const isChecked = (target as HTMLInputElement).checked;
                    handleRunningCheckIn(email, workoutDate, isChecked);
                    renderRunningScreen(email);
                    renderCalendar(email);
                } else {
                    openRunningLogModal(email, workoutDate);
                }
            });

            document.getElementById('generate-analysis-btn').addEventListener('click', async () => {
                const email = getCurrentUser();
                if (!email) return;
            
                const resultDiv = document.getElementById('ai-analysis-result');
                const analysis = await performAiAnalysis(email); // This function will handle spinner visibility
                
                resultDiv.innerHTML = marked.parse(analysis);
                resultDiv.classList.remove('hidden');
            });


        } catch (error) {
            console.error("Error during app initialization:", error);
            const loginError = document.getElementById('login-error');
            if (loginError) {
                loginError.innerHTML = `Erro ao carregar. Tente recarregar.<br><small>${(error as Error).message}</small>`;
            } else {
                alert(`Erro crítico ao carregar o app: ${(error as Error).message}`);
            }
        }
    };

    // Schedule the UI transition first.
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.classList.add('fade-out');
        }

        setTimeout(() => {
            if (splashScreen) {
                splashScreen.style.display = 'none';
            }

            // First, ensure the correct screen is set to display: block
            // while the container is still invisible.
            showScreen('loginScreen');
            
            if (appContainer) {
                // Make the container part of the layout flow
                appContainer.classList.remove('hidden');
                
                // In the next frame, remove the opacity class to trigger the fade-in
                requestAnimationFrame(() => {
                     appContainer.classList.remove('init-hidden');
                });
            }
            
            // Initialize the app logic.
            initializeApp();

        }, 500); // Matches the CSS transition duration
    }, 3000); // Splash screen display duration
});


function renderStudentProfile(email) {
    const user = database.users.find(u => u.email === email);
    if (!user) return;

    const userGreeting = document.getElementById('user-greeting');
    const now = new Date();
    const hours = now.getHours();
    let greeting = 'Olá';
    if (hours < 12) greeting = 'Bom dia';
    else if (hours < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';
    userGreeting.innerHTML = `
        <h1 class="text-3xl font-bold text-white">${greeting},</h1>
        <p class="text-2xl text-white">${user.name.split(' ')[0]}</p>
    `;

    const studentProfileInfo = document.getElementById('student-profile-info');
    studentProfileInfo.innerHTML = `
        <img src="${user.photo}" alt="Foto do Aluno" class="w-20 h-20 rounded-full mr-4 border-2 border-red-500">
        <div>
            <h2 class="text-xl font-bold text-white">${user.name}</h2>
            <p class="text-sm text-white">${user.email}</p>
        </div>
    `;

    const studentProfileButtons = document.getElementById('student-profile-buttons');
    studentProfileButtons.innerHTML = `
        <button data-target="trainingScreen" data-training-type="A" class="metal-btn text-white font-bold p-2 flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="clipboard" class="text-red-600"></i><span class="text-xs text-black font-extrabold">Treino A</span></button>
        <button data-target="trainingScreen" data-training-type="B" class="metal-btn text-white font-bold p-2 flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="clipboard" class="text-red-600"></i><span class="text-xs text-black font-extrabold">Treino B</span></button>
        <button data-target="runningScreen" id="running-btn" class="metal-btn text-white font-bold p-2 flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="wind" class="text-blue-600"></i><span class="text-xs text-black font-extrabold">Corrida</span></button>
        <button data-target="periodizationScreen" id="periodization-btn" class="metal-btn text-white font-bold p-2 flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="calendar" class="text-blue-600"></i><span class="text-xs text-black font-extrabold">Periodização</span></button>
        <button data-target="weightControlScreen" id="weight-control-btn" class="metal-btn text-white font-bold p-2 flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="bar-chart-2" class="text-blue-600"></i><span class="text-xs text-black font-extrabold">Peso</span></button>
        <button data-target="iaNutritionistScreen" id="ia-nutritionist-btn" class="metal-btn text-white font-bold p-2 flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="heart" class="text-red-600"></i><span class="text-xs text-black font-extrabold">Nutri IA</span></button>
        <button data-target="stressLevelScreen" id="stress-level-btn" class="metal-btn text-white font-bold p-2 flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="activity" class="text-red-600"></i><span class="text-xs text-black font-extrabold">Estresse</span></button>
        <button data-target="raceCalendarScreen" id="race-calendar-btn" class="metal-btn text-white font-bold p-2 flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="award" class="text-blue-600"></i><span class="text-xs text-black font-extrabold">Provas de Corrida</span></button>
        <button data-target="aiAnalysisScreen" id="ai-analysis-btn" class="metal-btn text-white font-bold p-2 flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="cpu" class="text-blue-600"></i><span class="text-xs text-black font-extrabold">Análise IA</span></button>
        <button data-target="physioAssessmentScreen" id="physio-btn" class="metal-btn text-white font-bold p-2 flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="users" class="text-blue-600"></i><span class="text-xs text-black font-extrabold">Avaliação</span></button>
        <button data-target="outdoorSelectionScreen" class="metal-btn text-white font-bold p-2 flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="sun" class="text-orange-500"></i><span class="text-xs text-black font-extrabold">Outdoor</span></button>
        <button data-target="exerciciosScreen" id="exercicios-btn" class="metal-btn text-white font-bold p-2 flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="book-open" class="text-blue-600"></i><span class="text-xs text-black font-extrabold">Biblioteca</span></button>
    `;
    // Fix: Call feather.replace() to render icons
    feather.replace();

    studentProfileButtons.addEventListener('click', (e) => {
        // Fix: Cast EventTarget to HTMLElement to access closest method
        const button = (e.target as HTMLElement).closest('button');
        if (!button) return;

        const targetScreenId = button.dataset.target;
        if (targetScreenId) {
            const currentScreen = document.getElementById('studentProfileScreen');
            const targetScreen = document.getElementById(targetScreenId);
            const trainingType = button.dataset.trainingType;

            if (targetScreenId === 'trainingScreen' && trainingType) {
                renderTrainingScreen(email, trainingType);
            } else if (targetScreenId === 'periodizationScreen') {
                renderPeriodizationScreen(email);
            } else if (targetScreenId === 'runningScreen') {
                renderRunningScreen(email);
            } else if (targetScreenId === 'weightControlScreen') {
                renderWeightControlScreen(email);
            } else if (targetScreenId === 'iaNutritionistScreen') {
                renderNutritionistScreen(email);
            } else if (targetScreenId === 'exerciciosScreen') {
                renderExerciciosScreen();
            } else if (targetScreenId === 'aiAnalysisScreen') {
                renderAiAnalysisScreen(email);
            } else if (targetScreenId === 'stressLevelScreen') {
                renderStressLevelScreen(email);
            } else if (targetScreenId === 'raceCalendarScreen') {
                // FIX: `renderRaceCalendarScreen` does not take any arguments.
                renderRaceCalendarScreen();
            }


            transitionScreen(currentScreen, targetScreen);
        }
    });

    renderCalendar(email);
    renderTrainingHistory(email);
    updateWeather();

    // Render footer with version
    const footerContainer = document.querySelector('#studentProfileScreen > .text-center.pt-8.pb-24');
    if (footerContainer) {
        footerContainer.innerHTML = `
            <p class="text-xs">Versão 1.2</p>
            <p class="text-xs">Desenvolvido por André Brito</p>
        `;
    }
}

let calendarDate = new Date();

function renderCalendar(email) {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearEl = document.getElementById('calendar-month-year');
    calendarGrid.innerHTML = '';

    const today = new Date();
    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();

    monthYearEl.textContent = `${calendarDate.toLocaleString('default', { month: 'long' }).toUpperCase()} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarGrid.innerHTML += `<div class="calendar-day empty"></div>`;
    }

    const userRunningWorkouts = database.userRunningWorkouts[email] || [];
    
    // Helper to check if a workout type was completed on a specific date
    const isWorkoutCompleted = (workoutDateStr, workoutType) => {
        const user = database.users.find(u => u.email === email);
        const currentWeek = getCurrentTrainingWeek(user);
        const exercises = getTrainingPlanForWeek(email, workoutType, currentWeek);
        
        if (!exercises || exercises.length === 0) return false;

        const checkedInCount = exercises.filter(ex => ex.checkIns && ex.checkIns.includes(workoutDateStr)).length;
        // A workout is considered complete only if all its exercises are checked in.
        return checkedInCount > 0 && checkedInCount === exercises.length;
    };

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateString = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
        
        let classes = 'calendar-day';

        const completedA = isWorkoutCompleted(dateString, 'A');
        const completedB = isWorkoutCompleted(dateString, 'B');

        const runningWorkout = userRunningWorkouts.find(w => {
            const workoutDate = new Date(w.date);
            return workoutDate.getUTCDate() === day && workoutDate.getUTCMonth() === month && workoutDate.getUTCFullYear() === year;
        });

        if (completedA && completedB) {
            classes += ' treino-A-B-completed';
        } else if (completedA) {
            classes += ' treino-A-completed';
        } else if (completedB) {
            classes += ' treino-B-completed';
        }

        if (runningWorkout) {
             classes += runningWorkout.completed ? ' treino-corrida-completed' : ' treino-corrida';
        }
        
        if (date.toDateString() === today.toDateString()) {
            classes += ' today';
        }

        calendarGrid.innerHTML += `<div class="calendar-day" data-day="${day}">${day}</div>`;
    }
}

document.getElementById('prev-month-btn').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar(getCurrentUser());
});
document.getElementById('next-month-btn').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar(getCurrentUser());
});

function renderTrainingHistory(email) {
    const container = document.getElementById('training-history-container');
    container.innerHTML = '';

    const getFullPlan = (plansForUser) => {
        if (!plansForUser) return [];
        if (Array.isArray(plansForUser)) return plansForUser;
        // It's a weekly plan, merge all exercises for history purposes
        const allExercises = new Map();
        Object.values(plansForUser).forEach(weeklyPlan => {
            if (Array.isArray(weeklyPlan)) {
                weeklyPlan.forEach(ex => {
                    if (!allExercises.has(ex.name)) {
                        allExercises.set(ex.name, ex);
                    }
                });
            }
        });
        return Array.from(allExercises.values());
    };

    const treinosA = getFullPlan(database.trainingPlans.treinosA[email]);
    const treinosB = getFullPlan(database.trainingPlans.treinosB[email]);
    const userCompletedWorkouts = database.completedWorkouts ? (database.completedWorkouts[email] || []) : [];
    
    // Fix: Explicitly type allCheckInsByDate
    const allCheckInsByDate: { [key: string]: { A: Set<string>, B: Set<string> } } = {};

    treinosA.forEach(ex => {
        (ex.checkIns || []).forEach(date => {
            if (!allCheckInsByDate[date]) allCheckInsByDate[date] = { A: new Set(), B: new Set() };
            allCheckInsByDate[date].A.add(ex.name);
        });
    });
    
    treinosB.forEach(ex => {
        (ex.checkIns || []).forEach(date => {
            if (!allCheckInsByDate[date]) allCheckInsByDate[date] = { A: new Set(), B: new Set() };
            allCheckInsByDate[date].B.add(ex.name);
        });
    });

    const completedWorkouts = Object.entries(allCheckInsByDate)
        .map(([date, sets]) => {
            const completed = [];
            if (treinosA.length > 0 && sets.A.size === treinosA.length) {
                completed.push('A');
            }
            if (treinosB.length > 0 && sets.B.size === treinosB.length) {
                completed.push('B');
            }
            return { date, workouts: completed };
        })
        .filter(entry => entry.workouts.length > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (completedWorkouts.length === 0) {
        container.innerHTML = `
            <h3 class="text-xl font-bold text-white mb-4">Histórico de Treinos</h3>
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 text-center">
                <p class="text-sm">Nenhum treino de musculação registrado ainda.</p>
            </div>
        `;
        return;
    }
    
    let listHtml = `
        <h3 class="text-xl font-bold text-white mb-4">Histórico de Treinos</h3>
        <div class="space-y-2">
    `;

    completedWorkouts.slice(0, 10).forEach(entry => { // Show last 10 workouts
        const dateObj = new Date(entry.date);
        const formattedDate = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' });
        
        const workoutBadges = entry.workouts.map(type => {
            const completedWorkout = userCompletedWorkouts.find(w => w.date === entry.date && w.type === type);
            let durationText = '';
            if (completedWorkout && completedWorkout.duration > 0) {
                const minutes = Math.floor(completedWorkout.duration / 60);
                const seconds = completedWorkout.duration % 60;
                durationText = ` - ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
            return `<span class="workout-badge workout-badge-${type}">Treino ${type}${durationText}</span>`
        }).join(' ');

        listHtml += `
            <div class="bg-gray-800 p-3 rounded-lg flex justify-between items-center border-l-4 border-gray-600">
                <span class="font-semibold text-sm capitalize">${formattedDate}</span>
                <div class="flex gap-2">${workoutBadges}</div>
            </div>
        `;
    });

    listHtml += `</div>`;
    container.innerHTML = listHtml;
}


// --- TELA BIBLIOTECA DE EXERCÍCIOS ---
function getAllExercises() {
    const uniqueExercises = new Map();
    const { treinosA, treinosB } = database.trainingPlans;

    const addExercisesFromPlan = (plan) => {
        Object.values(plan).forEach((userExercises: any) => {
            if (Array.isArray(userExercises)) {
                userExercises.forEach(ex => {
                    if (!uniqueExercises.has(ex.name)) {
                        uniqueExercises.set(ex.name, ex);
                    }
                });
            } else if (typeof userExercises === 'object') { // Handle weekly plans
                Object.values(userExercises).forEach((weeklyPlan: any) => {
                    if (Array.isArray(weeklyPlan)) {
                        weeklyPlan.forEach(ex => {
                            if (!uniqueExercises.has(ex.name)) {
                                uniqueExercises.set(ex.name, ex);
                            }
                        });
                    }
                });
            }
        });
    };

    addExercisesFromPlan(treinosA);
    addExercisesFromPlan(treinosB);

    const allExercises = Array.from(uniqueExercises.values());
    allExercises.sort((a, b) => a.name.localeCompare(b.name));
    return allExercises;
}

function renderExerciciosScreen() {
    const allExercises = getAllExercises();
    const listEl = document.getElementById('exercise-library-list');
    // Fix: Cast to HTMLInputElement to access value property
    const searchInput = document.getElementById('exercise-search-input') as HTMLInputElement;

    searchInput.value = ''; // Limpa busca ao renderizar a tela

    const displayExercises = (exercisesToDisplay) => {
        listEl.innerHTML = '';
        if (exercisesToDisplay.length === 0) {
            listEl.innerHTML = `<p class="col-span-2 text-center text-white">Nenhum exercício encontrado.</p>`;
            return;
        }
        exercisesToDisplay.forEach(ex => {
            const cardHtml = `
                <div class="exercise-library-card">
                    <img src="${ex.img || 'https://via.placeholder.com/100x100/4b5563/FFFFFF?text=SEM+IMG'}" alt="${ex.name}">
                    <h3>${ex.name}</h3>
                </div>
            `;
            listEl.innerHTML += cardHtml;
        });
    };

    displayExercises(allExercises);

    const handleSearch = () => {
        // Fix: Cast to HTMLInputElement to access value property
        const searchTerm = (searchInput as HTMLInputElement).value.toLowerCase().trim();
        const filteredExercises = allExercises.filter(ex => 
            ex.name.toLowerCase().includes(searchTerm)
        );
        displayExercises(filteredExercises);
    };
    
    searchInput.removeEventListener('input', handleSearch);
    searchInput.addEventListener('input', handleSearch);
}

function getCurrentTrainingWeek(user) {
    if (!user || !user.periodizationStartDate) {
        return 1;
    }
    const startDate = new Date(user.periodizationStartDate);
    const today = new Date();
    const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const daysDifference = Math.floor((todayUTC - startUTC) / millisecondsPerDay);
    const currentWeek = Math.floor(daysDifference / 7) + 1;
    return currentWeek;
}

function getTrainingPlanForWeek(email, trainingType, week) {
    const plansSource = trainingType === 'A' ? database.trainingPlans.treinosA : database.trainingPlans.treinosB;
    const plansForUser = plansSource[email];

    if (!plansForUser) return [];
    if (Array.isArray(plansForUser)) return plansForUser;

    if (week <= 2) return plansForUser.weeks_1_2 || plansForUser.default || [];
    if (week <= 4) return plansForUser.weeks_3_4 || plansForUser.default || [];
    
    return plansForUser.default || [];
}

function processExercises(exercises, email) {
    if (!exercises || exercises.length === 0) return [];
    
    const user = database.users.find(u => u.email === email);
    if (!user) return exercises.map((ex, index) => ({ ...ex, name: `${index + 1}. ${ex.name}` }));

    const currentWeek = getCurrentTrainingWeek(user);
    const periodizacao = database.trainingPlans.periodizacao[email];

    if (!periodizacao) {
        return exercises.map((ex, index) => ({ ...ex, name: `${index + 1}. ${ex.name}` }));
    }

    let currentPhase = periodizacao[periodizacao.length - 1]; // Default to last phase

    for (let i = 0; i < periodizacao.length; i++) {
        const weekRange = periodizacao[i].week.match(/\d+/g);
        if (!weekRange) continue;
        const startWeek = parseInt(weekRange[0], 10);
        const endWeek = weekRange[1] ? parseInt(weekRange[1], 10) : startWeek;
        if (currentWeek >= startWeek && currentWeek <= endWeek) {
            currentPhase = periodizacao[i];
            break;
        }
    }

    return exercises.map((ex, index) => {
        const isAbdominal = ex.name.toLowerCase().includes('abdominal');
        return {
            ...ex,
            name: `${index + 1}. ${ex.name}`,
            reps: isAbdominal ? ex.reps : currentPhase.reps,
            recovery: currentPhase.recovery,
            method: currentPhase.methods
        };
    });
}


function renderTrainingScreen(email, trainingType) {
    const user = database.users.find(u => u.email === email);
    if (!user) return;

    const titleEl = document.getElementById('training-title');
    titleEl.textContent = `TREINO ${trainingType}`;

    // Prevent duplicate event listeners by replacing the wrapper element
    let contentWrapper = document.getElementById('training-content-wrapper');
    if (!contentWrapper) return;
    // Fix: Cast cloned node to HTMLElement
    const newContentWrapper = contentWrapper.cloneNode(false) as HTMLElement;
    if (contentWrapper.parentNode) {
        contentWrapper.parentNode.replaceChild(newContentWrapper, contentWrapper);
    }
    contentWrapper = newContentWrapper;
    contentWrapper.classList.add('timeline-container'); // Add class for timeline style

    // --- Timer Persistence Logic ---
    if (workoutTimerInterval) {
        clearInterval(workoutTimerInterval);
    }
    
    if (!database.activeSessions) database.activeSessions = {};
    if (!database.activeSessions[email]) database.activeSessions[email] = {};
    
    const activeSession = database.activeSessions[email][trainingType];
    
    if (activeSession && activeSession.startTime) {
        workoutStartTime = new Date(activeSession.startTime);
    } else {
        workoutStartTime = new Date();
        database.activeSessions[email][trainingType] = { startTime: workoutStartTime.toISOString() };
        saveDatabase(database);
    }

    const timerEl = document.getElementById('workout-timer');
    if (timerEl) timerEl.textContent = '00:00:00';

    workoutTimerInterval = window.setInterval(() => {
        if (!workoutStartTime || !timerEl) return;
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - workoutStartTime.getTime()) / 1000);
        const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        timerEl.textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);


    // --- Periodization Notification Logic ---
    const notificationEl = document.getElementById('periodization-notification');
    notificationEl.innerHTML = '';
    notificationEl.classList.add('hidden');
    
    const currentWeek = getCurrentTrainingWeek(user);

    if (user.periodizationStartDate) {
        const periodizacao = database.trainingPlans.periodizacao[email];
        if (periodizacao) {
            const getPhaseForWeek = (week) => {
                if (week <= 0) return null;
                let phaseForWeek = periodizacao[periodizacao.length - 1];
                for (const phase of periodizacao) {
                    const weekRange = phase.week.match(/\d+/g);
                    if (!weekRange) continue;
                    const startWeek = parseInt(weekRange[0], 10);
                    const endWeek = weekRange[1] ? parseInt(weekRange[1], 10) : startWeek;
                    if (week >= startWeek && week <= endWeek) {
                        phaseForWeek = phase;
                        break;
                    }
                }
                return phaseForWeek;
            };

            const currentPhase = getPhaseForWeek(currentWeek);
            const previousPhase = getPhaseForWeek(currentWeek - 1);

            if (previousPhase && currentPhase.week !== previousPhase.week) {
                 notificationEl.innerHTML = `
                    <div class="flex items-center gap-3">
                        <i data-feather="star" class="w-8 h-8 flex-shrink-0"></i>
                        <div>
                            <h4 class="font-bold">Nova Fase da Periodização!</h4>
                            <p class="text-sm">Seu treino foi atualizado para a fase da <strong>${currentPhase.week}</strong>. Foco em <strong>${currentPhase.reps} repetições</strong>!</p>
                        </div>
                    </div>
                `;
                notificationEl.classList.remove('hidden');
                // Fix: Call feather.replace() to render icons
                feather.replace();
            }
        }
    }

    const treinos = getTrainingPlanForWeek(email, trainingType, currentWeek);
    const processedExercises = processExercises(treinos, email);
    
    let cardsHtml = '';
    
    // Removed continuous vertical line
    
    processedExercises.forEach((ex, index) => {
        const today = new Date().toISOString().split('T')[0];
        const isChecked = ex.checkIns && ex.checkIns.includes(today);
        const originalName = ex.name.substring(ex.name.indexOf(' ') + 1);

        // Helper to extract conjugado number from name if property is missing
        const getConjugadoInfo = (name) => {
            if (ex.conjugado) return ex.conjugado;
            const match = name.match(/CONJUGADO\s*(\d+)/i);
            return match ? parseInt(match[1]) : null;
        };

        const currentC = getConjugadoInfo(ex.name);
        const prevEx = index > 0 ? processedExercises[index - 1] : null;
        const nextEx = index < processedExercises.length - 1 ? processedExercises[index + 1] : null;
        
        const prevC = prevEx ? getConjugadoInfo(prevEx.name) : null;
        const nextC = nextEx ? getConjugadoInfo(nextEx.name) : null;

        let bracketHtml = '';
        
        // Define colors for different conjugate groups
        const colors = {
            1: 'border-red-600',
            2: 'border-blue-600',
            3: 'border-green-600',
            4: 'border-yellow-600'
        };
        const borderColor = currentC ? (colors[currentC] || 'border-gray-500') : '';

        // Only draw brackets if part of a conjugate pair
        if (currentC) {
            const isStart = currentC !== prevC;
            const isEnd = currentC !== nextC;
            const isMiddle = !isStart && !isEnd;
            const isSingle = isStart && isEnd; // Should not happen for conjugate, but handle gracefully

            if (!isSingle) {
                if (isStart) {
                     // Start bracket: Vertical line goes down from center, horizontal top
                     bracketHtml = `
                        <div class="absolute left-0 top-1/2 w-4 h-full border-l-4 border-t-4 rounded-tl-xl ${borderColor} border-b-0 border-r-0"></div>
                     `;
                } else if (isEnd) {
                    // End bracket: Vertical line comes from top, horizontal bottom
                    bracketHtml = `
                        <div class="absolute left-0 top-0 w-4 h-1/2 border-l-4 border-b-4 rounded-bl-xl ${borderColor} border-t-0 border-r-0"></div>
                    `;
                } else if (isMiddle) {
                    // Middle: Full vertical line
                    bracketHtml = `
                        <div class="absolute left-0 top-0 w-4 h-full border-l-4 ${borderColor}"></div>
                    `;
                }
            }
        }

        cardsHtml += `
            <div class="relative pl-6 mb-4">
                 ${bracketHtml}
                
                <div class="exercise-card metal-card-dark p-0 rounded-xl flex items-center gap-0 overflow-hidden" data-exercise-name="${originalName}" data-training-type="${trainingType}">
                    <div class="w-24 h-24 flex-shrink-0 relative">
                        <img src="${ex.img || 'https://via.placeholder.com/100x100/4b5563/FFFFFF?text=SEM+IMG'}" alt="thumbnail" class="w-full h-full object-cover">
                         <div class="absolute bottom-0 left-0 bg-black/70 text-white text-xs px-1 font-bold rounded-tr">${index + 1}</div>
                    </div>
                    <div class="flex-grow p-3">
                        <h3 class="font-bold text-sm text-gray-200 leading-tight mb-1">${ex.name}</h3>
                        <div class="flex items-center gap-3 text-xs text-gray-400">
                             <div class="flex items-center gap-1"><i data-feather="repeat" class="w-3 h-3"></i> <span>${ex.sets}x</span></div>
                             <div class="flex items-center gap-1"><i data-feather="refresh-cw" class="w-3 h-3"></i> <span>${ex.reps}</span></div>
                             <div class="flex items-center gap-1"><i data-feather="clock" class="w-3 h-3"></i> <span>${ex.carga}kg</span></div>
                        </div>
                    </div>
                    <div class="pr-4 flex items-center justify-center">
                        <label class="toggle-switch">
                            <input type="checkbox" class="exercise-checkbox" ${isChecked ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    });
    contentWrapper.innerHTML = cardsHtml;
    
    let saveBtn = document.getElementById('save-training-btn');
    // Fix: Call feather.replace() to render icons
    feather.replace(); // To render icons

    const updateSaveButtonVisibility = () => {
        const checkboxes = contentWrapper.querySelectorAll('.exercise-checkbox');
        // Fix: Cast checkbox to HTMLInputElement to access checked property
        const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => (cb as HTMLInputElement).checked);
        
        if (allChecked) {
            saveBtn.classList.remove('hidden');
        } else {
            saveBtn.classList.add('hidden');
        }
    };
   
    contentWrapper.addEventListener('click', (e) => {
        // Fix: Cast EventTarget to HTMLElement to access properties
        const target = e.target as HTMLElement;
        const card = target.closest('.exercise-card');
        // Prevent triggering modal when clicking checkbox
        if ((target.closest('.toggle-switch'))) {
             // Let the checkbox change event handle it
             return;
        }

        if (!card) return;

        const exerciseName = (card as HTMLElement).dataset.exerciseName;
        const currentTrainingType = (card as HTMLElement).dataset.trainingType;
        
        // Open modal on card click (excluding checkbox area)
         if (currentTrainingType === 'A' || currentTrainingType === 'B') {
            openExerciseModal(email, currentTrainingType, exerciseName);
        }
    });
    
    // Add separate listener for checkboxes to handle state correctly
    contentWrapper.querySelectorAll('.exercise-checkbox').forEach((checkbox) => {
         checkbox.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const card = target.closest('.exercise-card') as HTMLElement;
            if(!card) return;
            const exerciseName = card.dataset.exerciseName;
            const currentTrainingType = card.dataset.trainingType;
            handleExerciseCheckIn(email, currentTrainingType, exerciseName, target.checked);
            updateSaveButtonVisibility();
         });
    });


    const saveBtnClickHandler = () => {
        let durationInSeconds = 0;
        if (workoutStartTime) {
            const endTime = new Date();
            durationInSeconds = Math.round((endTime.getTime() - workoutStartTime.getTime()) / 1000);
        }

        if (workoutTimerInterval) {
            clearInterval(workoutTimerInterval);
        }
        
        const today = new Date().toISOString().split('T')[0];
        if (!database.completedWorkouts) database.completedWorkouts = {};
        if (!database.completedWorkouts[email]) database.completedWorkouts[email] = [];
        const existingEntryIndex = database.completedWorkouts[email].findIndex(w => w.date === today && w.type === trainingType);
        if (existingEntryIndex > -1) {
            database.completedWorkouts[email][existingEntryIndex].duration = durationInSeconds;
        } else {
            database.completedWorkouts[email].push({ date: today, type: trainingType, duration: durationInSeconds });
        }
        
        // Clear active session
        if (database.activeSessions?.[email]?.[trainingType]) {
            delete database.activeSessions[email][trainingType];
        }

        workoutTimerInterval = null;
        workoutStartTime = null;
        saveDatabase(database);

        alert('Treino concluído e salvo com sucesso!');
        
        renderCalendar(email);
        renderTrainingHistory(email);

        const currentScreen = document.getElementById('trainingScreen');
        const targetScreen = document.getElementById('studentProfileScreen');
        transitionScreen(currentScreen, targetScreen, 'left');
    };

    // Replace button to remove old listeners and update the reference
    // Fix: Cast cloned node to HTMLElement to prevent type error on re-assignment
    const newSaveBtn = saveBtn.cloneNode(true) as HTMLElement;
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    saveBtn = newSaveBtn; // Update the reference to the new button
    saveBtn.addEventListener('click', saveBtnClickHandler);
    
    updateSaveButtonVisibility(); // Initial check on render
}

function handleExerciseCheckIn(email, trainingType, exerciseName, isChecked) {
    const user = database.users.find(u => u.email === email);
    if (!user) return;

    const userPlans = trainingType === 'A' ? database.trainingPlans.treinosA[email] : database.trainingPlans.treinosB[email];
    let exercise;

    if (Array.isArray(userPlans)) {
        exercise = userPlans.find(ex => ex.name.endsWith(exerciseName));
    } else { // User with weekly plans
        for (const key in userPlans) {
            if (Array.isArray(userPlans[key])) {
                const found = userPlans[key].find(ex => ex.name === exerciseName);
                if (found) {
                    exercise = found;
                    break;
                }
            }
        }
    }
    
    if (exercise) {
        // Set periodization start date on first check-in
        if (!user.periodizationStartDate && isChecked) {
            user.periodizationStartDate = new Date().toISOString().split('T')[0];
            console.log(`Periodization started for ${email} on ${user.periodizationStartDate}`);
        }

        if (!exercise.checkIns) exercise.checkIns = [];
        const today = new Date().toISOString().split('T')[0];
        const index = exercise.checkIns.indexOf(today);
        if (isChecked && index === -1) {
            exercise.checkIns.push(today);
        } else if (!isChecked && index > -1) {
            exercise.checkIns.splice(index, 1);
        }
        saveDatabase(database);
        console.log(`Check-in for ${exerciseName} updated.`);
    }
}


function openExerciseModal(email, trainingType, exerciseName) {
    const userPlans = trainingType === 'A' ? database.trainingPlans.treinosA[email] : database.trainingPlans.treinosB[email];
    let exercise;

    if (Array.isArray(userPlans)) {
        exercise = userPlans.find(ex => ex.name.endsWith(exerciseName));
    } else { // User with weekly plans
        for (const key in userPlans) {
            if (Array.isArray(userPlans[key])) {
                const found = userPlans[key].find(ex => ex.name === exerciseName);
                if (found) {
                    exercise = found;
                    break;
                }
            }
        }
    }

    if (!exercise) {
        console.error('Exercício não encontrado:', exerciseName);
        return;
    }

    const processedExercise = processExercises([exercise], email)[0];
    const modal = document.getElementById('exerciseDetailModal');
    const modalContent = document.getElementById('exercise-modal-content');
    
    document.getElementById('modal-exercise-img').setAttribute('src', exercise.img || 'https://via.placeholder.com/400x200/4b5563/FFFFFF?text=SEM+IMAGEM');
    document.getElementById('modal-exercise-name').textContent = processedExercise.name;
    
    const methodContainer = document.getElementById('modal-exercise-method');
    methodContainer.querySelector('p').textContent = processedExercise.method || 'Não especificado';

    // Fix: Cast to HTMLInputElement to access value property
    const cargaInput = document.getElementById('carga-input') as HTMLInputElement;
    cargaInput.value = exercise.carga || '';

    renderCargaHistory(exercise.historicoCarga);

    const form = document.getElementById('edit-carga-form');
    // Clone and replace the form to remove old event listeners
    // Fix: Cast cloned node to HTMLElement
    const newForm = form.cloneNode(true) as HTMLElement;
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Fix: Cast to HTMLInputElement to access value property
        const newCarga = (document.getElementById('carga-input') as HTMLInputElement).value;
        if (newCarga) {
            exercise.carga = newCarga;
            const today = new Date().toISOString().split('T')[0];
            if (!exercise.historicoCarga) exercise.historicoCarga = [];
            
            // Check if there is already an entry for today and update it, otherwise add new
            const todayEntry = exercise.historicoCarga.find(h => h.data === today);
            if(todayEntry) {
                todayEntry.carga = newCarga;
            } else {
                exercise.historicoCarga.push({ data: today, carga: newCarga });
            }

            saveDatabase(database);
            renderCargaHistory(exercise.historicoCarga);
            closeExerciseModal();
        }
    });

    modal.classList.remove('hidden');
    modalContent.classList.add('scale-100', 'opacity-100');
}

function renderCargaHistory(history) {
    const historyList = document.getElementById('carga-history-list');
    historyList.innerHTML = '';
    if (history && history.length > 0) {
        // Sort history descending by date
        const sortedHistory = [...history].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        sortedHistory.forEach(item => {
            const date = new Date(item.data);
            const formattedDate = `${date.getUTCDate().toString().padStart(2, '0')}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            historyList.innerHTML += `
                <div class="flex justify-between items-center bg-gray-700 p-2 rounded-md text-sm">
                    <span>${formattedDate}</span>
                    <span class="font-bold">${item.carga} kg</span>
                </div>
            `;
        });
    } else {
        historyList.innerHTML = '<p class="text-center text-sm">Nenhum histórico de carga.</p>';
    }
}

function closeExerciseModal() {
    const modal = document.getElementById('exerciseDetailModal');
    const modalContent = document.getElementById('exercise-modal-content');
    modalContent.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => modal.classList.add('hidden'), 300);
}
document.getElementById('closeExerciseModalBtn').addEventListener('click', closeExerciseModal);


// --- OUTDOOR TRACKING LOGIC ---

function initializeOutdoorSelectionScreen() {
    const buttons = document.querySelectorAll('.outdoor-activity-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const activity = (btn as HTMLElement).dataset.activity;
            if (activity) {
                const currentScreen = document.getElementById('outdoorSelectionScreen');
                const targetScreen = document.getElementById('outdoorTrackingScreen');
                if (currentScreen && targetScreen) {
                     renderOutdoorTrackingScreen(activity);
                     transitionScreen(currentScreen, targetScreen, 'right');
                }
            }
        });
    });

    const backBtn = document.querySelector('#outdoorTrackingScreen .outdoor-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
             const currentScreen = document.getElementById('outdoorTrackingScreen');
             const targetScreen = document.getElementById('outdoorSelectionScreen');
             
             if (outdoorTrackingState.isTracking) {
                 if (confirm("Deseja encerrar o treino atual sem salvar?")) {
                     stopOutdoorTracking(false);
                     transitionScreen(currentScreen, targetScreen, 'left');
                 }
             } else {
                 transitionScreen(currentScreen, targetScreen, 'left');
             }
        });
    }

    document.getElementById('start-tracking-btn')?.addEventListener('click', startOutdoorTracking);
    document.getElementById('pause-tracking-btn')?.addEventListener('click', pauseOutdoorTracking);
    document.getElementById('stop-tracking-btn')?.addEventListener('click', () => stopOutdoorTracking(true));
}

function renderOutdoorTrackingScreen(activityType) {
    outdoorTrackingState.activityType = activityType;
    outdoorTrackingState.isTracking = false;
    outdoorTrackingState.isPaused = false;
    outdoorTrackingState.startTime = 0;
    outdoorTrackingState.elapsedTime = 0;
    outdoorTrackingState.totalDistance = 0;
    outdoorTrackingState.positions = [];
    
    if (outdoorTrackingState.map) {
        outdoorTrackingState.map.remove();
        outdoorTrackingState.map = null;
        outdoorTrackingState.polyline = null;
    }

    const titleEl = document.getElementById('tracking-activity-title');
    if(titleEl) titleEl.textContent = activityType;

    const distEl = document.getElementById('tracking-distance');
    if(distEl) distEl.textContent = "0.00 km";
    
    const timeEl = document.getElementById('tracking-time');
    if(timeEl) timeEl.textContent = "00:00:00";
    
    const paceEl = document.getElementById('tracking-pace');
    if(paceEl) paceEl.textContent = "--:-- /km";

    document.getElementById('start-tracking-btn')?.classList.remove('hidden');
    document.getElementById('pause-tracking-btn')?.classList.add('hidden');
    document.getElementById('stop-tracking-btn')?.classList.add('hidden');

    setTimeout(() => {
        initializeMap();
    }, 500);
}

function initializeMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Default center (Rio)
    const defaultLat = -22.9068;
    const defaultLng = -43.1729;

    outdoorTrackingState.map = L.map('map').setView([defaultLat, defaultLng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(outdoorTrackingState.map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            if (outdoorTrackingState.map) {
                outdoorTrackingState.map.setView([latitude, longitude], 16);
                L.marker([latitude, longitude]).addTo(outdoorTrackingState.map);
            }
        }, err => console.error("Error getting location", err));
    }
}

function startOutdoorTracking() {
    outdoorTrackingState.isTracking = true;
    outdoorTrackingState.isPaused = false;
    outdoorTrackingState.startTime = Date.now() - (outdoorTrackingState.elapsedTime * 1000);

    document.getElementById('start-tracking-btn')?.classList.add('hidden');
    document.getElementById('pause-tracking-btn')?.classList.remove('hidden');
    document.getElementById('stop-tracking-btn')?.classList.remove('hidden');

    outdoorTrackingState.timerInterval = window.setInterval(updateOutdoorTimer, 1000);

    if (navigator.geolocation) {
        outdoorTrackingState.watchId = navigator.geolocation.watchPosition(
            processPosition,
            err => console.error("Watch Position Error", err),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
    }
}

function pauseOutdoorTracking() {
    outdoorTrackingState.isPaused = true;
    if (outdoorTrackingState.timerInterval) clearInterval(outdoorTrackingState.timerInterval);
    if (outdoorTrackingState.watchId) navigator.geolocation.clearWatch(outdoorTrackingState.watchId);

    document.getElementById('start-tracking-btn')?.classList.remove('hidden');
    document.getElementById('pause-tracking-btn')?.classList.add('hidden');
}

function stopOutdoorTracking(save = true) {
    outdoorTrackingState.isTracking = false;
    outdoorTrackingState.isPaused = false;
    if (outdoorTrackingState.timerInterval) clearInterval(outdoorTrackingState.timerInterval);
    if (outdoorTrackingState.watchId) navigator.geolocation.clearWatch(outdoorTrackingState.watchId);
    
    if (save) {
        const email = getCurrentUser();
        if (email) {
            const today = new Date().toISOString().split('T')[0];
            if (!database.completedWorkouts) database.completedWorkouts = {};
            if (!database.completedWorkouts[email]) database.completedWorkouts[email] = [];
            
            database.completedWorkouts[email].push({
                date: today,
                type: outdoorTrackingState.activityType,
                duration: outdoorTrackingState.elapsedTime,
                obs: `Distância: ${(outdoorTrackingState.totalDistance / 1000).toFixed(2)}km`
            });
            saveDatabase(database);
            alert('Treino Outdoor Salvo!');
            renderTrainingHistory(email);
        }
    }

    const currentScreen = document.getElementById('outdoorTrackingScreen');
    const targetScreen = document.getElementById('outdoorSelectionScreen');
    transitionScreen(currentScreen, targetScreen, 'left');
}

function updateOutdoorTimer() {
    if (outdoorTrackingState.isPaused) return;
    const now = Date.now();
    outdoorTrackingState.elapsedTime = Math.floor((now - outdoorTrackingState.startTime) / 1000);
    
    const timeEl = document.getElementById('tracking-time');
    if (timeEl) {
        const hrs = Math.floor(outdoorTrackingState.elapsedTime / 3600);
        const mins = Math.floor((outdoorTrackingState.elapsedTime % 3600) / 60);
        const secs = outdoorTrackingState.elapsedTime % 60;
        timeEl.textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
}

function processPosition(position) {
    if (outdoorTrackingState.isPaused || !outdoorTrackingState.isTracking) return;
    
    const { latitude, longitude, accuracy } = position.coords;
    if (accuracy > 50) return;

    const newPos = { lat: latitude, lng: longitude };
    
    if (outdoorTrackingState.positions.length > 0) {
        const lastPos = outdoorTrackingState.positions[outdoorTrackingState.positions.length - 1];
        const dist = calculateDistance(lastPos.lat, lastPos.lng, latitude, longitude);
        outdoorTrackingState.totalDistance += dist;
    }
    outdoorTrackingState.positions.push(newPos);

    const distEl = document.getElementById('tracking-distance');
    if(distEl) distEl.textContent = `${(outdoorTrackingState.totalDistance / 1000).toFixed(2)} km`;

    if (outdoorTrackingState.totalDistance > 0) {
        const pace = (outdoorTrackingState.elapsedTime / 60) / (outdoorTrackingState.totalDistance / 1000);
        const paceMin = Math.floor(pace);
        const paceSec = Math.floor((pace - paceMin) * 60);
        const paceEl = document.getElementById('tracking-pace');
        if(paceEl) paceEl.textContent = `${paceMin}'${String(paceSec).padStart(2, '0')}'' /km`;
    }

    if (outdoorTrackingState.map) {
        if (!outdoorTrackingState.polyline) {
            outdoorTrackingState.polyline = L.polyline([[latitude, longitude]], { color: 'red', weight: 4 }).addTo(outdoorTrackingState.map);
        } else {
            outdoorTrackingState.polyline.addLatLng([latitude, longitude]);
        }
        outdoorTrackingState.map.setView([latitude, longitude]);
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

// Dummy Physio initialization to prevent crash
function initializePhysioAssessmentScreen() {
    console.log("Physio Assessment Module Loaded");
}

// --- ADDED MISSING FUNCTIONS IMPLEMENTATION ---

function renderEvolutionScreen(email: string) {
    const user = database.users.find(u => u.email === email);
    if (!user) return;
    
    // Placeholder implementation for charts
    const ctx = document.getElementById('evolution-chart') as HTMLCanvasElement;
    if (ctx && Chart) {
        // Destroy existing chart if any (need to track it, but simplifying for fix)
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: user.weightHistory?.map(w => w.date) || [],
                datasets: [{
                    label: 'Peso (kg)',
                    data: user.weightHistory?.map(w => w.weight) || [],
                    borderColor: 'rgb(239, 68, 68)',
                    tension: 0.1
                }]
            }
        });
    }
}

function handleRunningCheckIn(email: string, date: string, isChecked: boolean) {
    const workouts = database.userRunningWorkouts[email];
    if (!workouts) return;
    const workout = workouts.find(w => w.date === date);
    if (workout) {
        workout.completed = isChecked;
        saveDatabase(database);
    }
}

function renderRunningScreen(email: string) {
    const list = document.getElementById('running-workouts-list');
    if (!list) return;
    list.innerHTML = '';
    
    const workouts = database.userRunningWorkouts[email] || [];
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sortedWorkouts.forEach(w => {
        const date = new Date(w.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const isChecked = w.completed;
        
        const html = `
            <div class="running-session-card bg-gray-800 p-4 rounded-xl mb-3 border-l-4 ${isChecked ? 'border-green-500' : 'border-blue-500'}" data-workout-date="${w.date}">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-xs font-bold text-gray-400 block mb-1">${date} - ${w.type}</span>
                        <p class="text-sm text-gray-200 mb-2">${w.description}</p>
                        <div class="flex gap-3 text-xs text-gray-500">
                            <span><i data-feather="fast-forward" class="w-3 h-3 inline"></i> ${w.speed} km/h</span>
                            <span><i data-feather="clock" class="w-3 h-3 inline"></i> ${w.duration}'</span>
                            <span><i data-feather="activity" class="w-3 h-3 inline"></i> ${w.pace}</span>
                        </div>
                         ${w.performance ? `<div class="mt-2 p-2 bg-gray-900 rounded text-xs text-green-400">Realizado: ${w.performance.distance}km em ${w.performance.time}</div>` : ''}
                    </div>
                    <div class="flex flex-col items-center gap-2">
                         <input type="checkbox" class="form-checkbox h-5 w-5 text-blue-600 rounded" ${isChecked ? 'checked' : ''}>
                         <button class="text-xs text-blue-400 hover:text-blue-300 open-log-btn">Registrar</button>
                    </div>
                </div>
            </div>
        `;
        list.innerHTML += html;
    });
    feather.replace();
}

function openRunningLogModal(email: string, date: string) {
    // Simple implementation using prompt
    const dist = prompt("Qual a distância percorrida (km)?");
    if (!dist) return;
    const time = prompt("Qual o tempo total (mm:ss)?");
    if (!time) return;
    
    const workouts = database.userRunningWorkouts[email];
    const workout = workouts.find(w => w.date === date);
    if (workout) {
        workout.performance = { distance: dist, time: time };
        workout.completed = true;
        saveDatabase(database);
        renderRunningScreen(email);
    }
}

function renderPeriodizationScreen(email: string) {
    // FIX: Select correct HTML element ID
    const container = document.getElementById('periodization-content-wrapper');
    if (!container) return;
    
    const user = database.users.find(u => u.email === email);
    const plans = database.trainingPlans.periodizacao[email];
    
    if (!plans) {
        container.innerHTML = '<p class="text-white text-center">Nenhum plano disponível.</p>';
        return;
    }
    
    const currentWeek = getCurrentTrainingWeek(user);
    
    let html = '<div class="space-y-4">';
    plans.forEach((phase) => {
        let activeClass = 'bg-gray-800 border-gray-700';
        const weekRange = phase.week.match(/\d+/g);
        if (weekRange) {
             const start = parseInt(weekRange[0]);
             const end = weekRange[1] ? parseInt(weekRange[1]) : start;
             if (currentWeek >= start && currentWeek <= end) activeClass = 'bg-gray-700 border-l-4 border-yellow-500';
        }

        html += `
            <div class="p-4 rounded-lg border ${activeClass}">
                <h3 class="font-bold text-white mb-1">${phase.week} - ${phase.phase}</h3>
                <p class="text-sm text-gray-300 mb-2">${phase.methods}</p>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
                    <div><span class="font-semibold">Vol:</span> ${phase.volume}</div>
                    <div><span class="font-semibold">Int:</span> ${phase.intensity}</div>
                    <div><span class="font-semibold">Reps:</span> ${phase.reps}</div>
                    <div><span class="font-semibold">Rec:</span> ${phase.recovery}</div>
                </div>
                 ${phase.descricao ? `<p class="mt-2 text-xs text-gray-500 italic border-t border-gray-600 pt-2">${phase.descricao}</p>` : ''}
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderWeightControlScreen(email: string) {
    const user = database.users.find(u => u.email === email);
    if (!user) return;
    
    const list = document.getElementById('weight-history-list');
    if (list) {
        list.innerHTML = '';
        (user.weightHistory || []).slice().reverse().forEach(w => {
             list.innerHTML += `<div class="flex justify-between p-3 bg-gray-800 rounded mb-2"><span class="text-white">${new Date(w.date).toLocaleDateString('pt-BR')}</span><span class="font-bold text-red-500">${w.weight} kg</span></div>`;
        });
    }
}

function renderNutritionistScreen(email: string) {
    // FIX: Select correct HTML element ID
    const container = document.getElementById('nutrition-content-wrapper');
    if (container) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-6"><i data-feather="message-circle" class="w-16 h-16 text-gray-500 mb-4"></i><p class="text-center text-gray-300 font-bold mb-2">Consulta Nutricional IA</p><p class="text-center text-gray-500 text-sm">Esta funcionalidade estará disponível em breve para auxiliar na sua dieta.</p></div>';
        feather.replace();
    }
}

function renderAiAnalysisScreen(email: string) {
    // Logic handled by performAiAnalysis
}

function renderStressLevelScreen(email: string) {
    const ctx = document.getElementById('stress-chart') as HTMLCanvasElement;
    const user = database.users.find(u => u.email === email);
    if (ctx && user && Chart) {
        if (stressChart) stressChart.destroy();
        stressChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: user.stressData?.assessments?.map(a => new Date(a.date).toLocaleDateString()) || [],
                datasets: [{
                    label: 'Nível de Estresse',
                    data: user.stressData?.assessments?.map(a => a.score) || [],
                    borderColor: 'rgb(248, 113, 113)',
                    tension: 0.1
                }]
            },
            options: { scales: { y: { beginAtZero: true, max: 20 } } }
        });
    }
}

function renderRaceCalendarScreen() {
    const list = document.getElementById('race-calendar-list');
    if (!list) return;
    list.innerHTML = '';
    
    database.raceCalendar.forEach(race => {
        const date = new Date(race.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        list.innerHTML += `
            <div class="bg-gray-800 p-4 rounded-xl mb-4 border border-gray-700">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-white text-lg">${race.name}</h3>
                    <span class="bg-red-900 text-red-100 text-xs px-2 py-1 rounded font-bold">${date}</span>
                </div>
                <div class="space-y-1 text-sm text-gray-300">
                    <p><i data-feather="map-pin" class="w-4 h-4 inline mr-1"></i> ${race.location}</p>
                    <p><i data-feather="flag" class="w-4 h-4 inline mr-1"></i> ${race.distances}</p>
                    <p><i data-feather="clock" class="w-4 h-4 inline mr-1"></i> ${race.time}</p>
                    <p><i data-feather="dollar-sign" class="w-4 h-4 inline mr-1"></i> ${race.price}</p>
                </div>
                <a href="${race.registrationLink}" target="_blank" class="block mt-4 text-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded transition">Inscrever-se</a>
            </div>
        `;
    });
    feather.replace();
}

function updateWeather() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
            const data = await res.json();
            
            const tempEl = document.getElementById('weather-temp');
            const descEl = document.getElementById('weather-desc');
            const iconEl = document.getElementById('weather-icon');
            
            if (tempEl) tempEl.textContent = `${Math.round(data.current.temperature_2m)}°C`;
            if (descEl) descEl.textContent = `${Math.round(data.daily.temperature_2m_min[0])}° / ${Math.round(data.daily.temperature_2m_max[0])}°`;
            if (iconEl) {
                iconEl.innerHTML = `<i data-feather="sun" class="text-yellow-500 w-8 h-8"></i>`;
                feather.replace();
            }
        } catch (e) {
            console.error(e);
        }
    });
}
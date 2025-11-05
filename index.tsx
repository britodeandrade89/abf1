
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
            { text: "Com Frequência", score: 1 },
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
        { id: 1, name: 'André Brito', email: 'britodeandrade@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3Zy4n6ZmWp9DW98VtXpO.jpeg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: null, stressData: { assessments: [] } },
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

// --- SISTEMA DE AVALIAção FÍSICA ---
const PHYSIO_DB_KEY = 'abfit_physio_alunos';
const getPhysioAlunosFromStorage = () => JSON.parse(localStorage.getItem(PHYSIO_DB_KEY) || '[]');
const savePhysioAlunosToStorage = (alunosData) => localStorage.setItem(PHYSIO_DB_KEY, JSON.stringify(alunosData));
const calculateBodyComposition = (avaliacao, aluno) => {
    const idade = aluno.nascimento ? new Date().getFullYear() - new Date(aluno.nascimento).getFullYear() : 0;
    const sexo = aluno.sexo;
    const peso = avaliacao.peso;
    const altura = avaliacao.altura;
    if (!peso || !altura) return {};
    const imc = (peso / ((altura / 100) ** 2));
    let somaDobras = 0;
    if (sexo === 'Masculino') {
        somaDobras = (parseFloat(avaliacao.dc_peitoral) || 0) + (parseFloat(avaliacao.dc_abdominal) || 0) + (parseFloat(avaliacao.dc_coxa) || 0);
    } else { // Feminino
        somaDobras = (parseFloat(avaliacao.dc_tricipital) || 0) + (parseFloat(avaliacao.dc_suprailiaca) || 0) + (parseFloat(avaliacao.dc_coxa) || 0);
    }
    if (somaDobras === 0 || !idade || !sexo) {
        return { imc: imc.toFixed(1) };
    }
    let densidadeCorporal = 0;
    if (sexo === 'Masculino') {
        densidadeCorporal = 1.10938 - (0.0008267 * somaDobras) + (0.0000016 * (somaDobras ** 2)) - (0.0002574 * idade);
    } else { // Feminino
        densidadeCorporal = 1.0994921 - (0.0009929 * somaDobras) + (0.0000023 * (somaDobras ** 2)) - (0.0001392 * idade);
    }
    const percentualGordura = densidadeCorporal > 0 ? ((4.95 / densidadeCorporal) - 4.5) * 100 : 0;
    const pesoGordo = peso * (percentualGordura / 100);
    const pesoMagro = peso - pesoGordo;
    return {
        somaDobras: somaDobras.toFixed(1),
        densidadeCorporal: densidadeCorporal.toFixed(4),
        percentualGordura: percentualGordura.toFixed(1),
        pesoGordo: pesoGordo.toFixed(1),
        pesoMagro: pesoMagro.toFixed(1),
        imc: imc.toFixed(1)
    };
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
        });
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

    const treinosA_AndreBrito_Semana3e4 = [
        { name: 'Agachamento parcial no Smith (CONJUGADO 1)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/dMXSfHrCe2BQAKRvIvIg.png', sets: '4', reps: '9', carga: '20', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Agachamento Livre com HBC (CONJUGADO 1)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/77Uth2fQUxtPXvqu1UCb.png', sets: '4', reps: '9', carga: '16', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Agachamento Búlgaro com HBC no banco ou step', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/jo9jsMXR96Q17m4pXn7B.jpg', sets: '4', reps: '9', carga: '8', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Cadeira extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/rQ8l64KvygQUAa8FZXyp.jpg', sets: '4', reps: '9', carga: '7', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Supino inclinado com HBC (CONJUGADO 2)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/fWBlaY5LXefUGcXHz2tO.jpg', sets: '4', reps: '9', carga: '14', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Desenvolvimento aberto com HBC (CONJUGADO 2)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/niXdGuQHlniNh7f6xh5i.png', sets: '4', reps: '9', carga: '9', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Crucifixo aberto no banco inclinado com HBC (CONJUGADO 3)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/6RBiU0w8EtT9enxOTM6Q.jpg', sets: '4', reps: '9', carga: '6', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Extensão de cotovelos no solo (CONJUGADO 3)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/eGNCCvzlv1jGWpSbs5nH.png', sets: '4', reps: '9', carga: '0', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Tríceps fechado no solo de joelhos', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/cVidpH3PfsrBhLcAGKmI.jpg', sets: '6', reps: '9', carga: '0', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Abdominal supra no solo', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/7M5vMfWh1Jb7DnLIUs4g.png', sets: '6', reps: '9', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' }
    ];

    const treinosB_AndreBrito_Semana3e4 = [
        { name: 'Agachamento sumô com HBC (CONJUGADO 1)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/sGz9YqGUPf7lIqX8vULE.png', sets: '4', reps: '9', carga: '22', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Agachamento no smith ao fundo pés alinhados a barra (CONJUGADO 1)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qF4Qx4su0tiGLT3oTZqu.png', sets: '4', reps: '9', carga: '14', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Stiff em pé com HBM (CONJUGADO 2)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/isKs5qzBPblirwR4IHPO.png', sets: '4', reps: '9', carga: '7', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Flexão de joelho em pé com caneleira (CONJUGADO 2)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ZEcYnpswJBmu24PWZXwq.jpg', sets: '4', reps: '9', carga: '14', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Remada declinada no Smith (CONJUGADO 3)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/gSfHTcM8MNU22aYUa0zH.jpg', sets: '4', reps: '9', carga: '7', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Abdominal supra no solo (CONJUGADO 3)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/De8VrobzH9PPMDIAr7Cn.png', sets: '4', reps: '9', carga: '8', obs: 'Método Simples (15 RM)', recovery: '30s' },
        { name: 'Remada curvada supinada no cross barra reta (CONJUGADO 4)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/Vw4Wjum0oI5o4JiuTomc.jpg', sets: '4', reps: '9', carga: '4', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Bíceps em pé no cross barra reta (CONJUGADO 4)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/o8z8KzDoOqceSMHJvdLB.jpg', sets: '4', reps: '9', carga: '6', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Puxada aberta no pulley alto (CONJUGADO 5)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/EqnYYAVM1GKUbaAUibQF.jpg', sets: '4', reps: '9', carga: '11', obs: 'Método Simples (9 RM)', recovery: '30s' },
        { name: 'Puxada supinada no pulley alto (CONJUGADO 5)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/Rmve8zGQZaEmRNHZC1G6.jpg', sets: '4', reps: '10', carga: '10', obs: 'Método Simples (9 RM)', recovery: '30s' }
    ];

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
            { name: 'Agachamento Livre', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/9bgKMf2SJ3Dpq9EnDPsV.png', sets: '3', reps: '20', carga: '0', obs: 'Método Simples (20 RM)', recovery: '30s' },
            { name: 'Agachamento Livre em isometria', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/UuNZ7xD4j6Hyfv5MxtNa.png', sets: '3', reps: '20', carga: '0', obs: 'Método Simples (20 RM)', recovery: '30s' },
            { name: 'Agachamento sumô com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ppcH4fGDEECXlMqXrCE6.png', sets: '4', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Stiff em pé com HBM', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3K80Z1TYwuZVPzJGl6hF.png', sets: '4', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Extensão de quadril com caneleira', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/sSegYH7wUf0Xq08nCzxJ.png', sets: '4', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Remada aberta na máquina (ou aberta sentada pulley baixo)', img: '', sets: '3', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Crucifixo inverso com HBC (ou curvada com HBC)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/74otdJGwmHzhduMk2bkb.png', sets: '3', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Bíceps em pé no cross barra reta', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/Ee9RkUYguPhJsylsOOr2.avif', sets: '3', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' }
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
    // Hide nav bar on non-primary screens
    if (toScreen.id !== 'studentProfileScreen' && toScreen.id !== 'evolutionScreen') {
        navBar.classList.add('nav-hidden');
    } else {
        navBar.classList.remove('nav-hidden');
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
        <button data-target="trainingScreen" data-training-type="A" class="training-btn bg-blue-500 hover:bg-blue-600 text-white font-bold p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="clipboard"></i><span class="text-xs">Treino A</span></button>
        <button data-target="trainingScreen" data-training-type="B" class="training-btn bg-green-500 hover:bg-green-600 text-white font-bold p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="clipboard"></i><span class="text-xs">Treino B</span></button>
        <button data-target="runningScreen" id="running-btn" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="wind"></i><span class="text-xs">Corrida</span></button>
        <button data-target="periodizationScreen" id="periodization-btn" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="calendar"></i><span class="text-xs">Periodização</span></button>
        <button data-target="weightControlScreen" id="weight-control-btn" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="bar-chart-2"></i><span class="text-xs">Peso</span></button>
        <button data-target="iaNutritionistScreen" id="ia-nutritionist-btn" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="heart"></i><span class="text-xs">Nutri IA</span></button>
        <button data-target="stressLevelScreen" id="stress-level-btn" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="activity"></i><span class="text-xs">Estresse</span></button>
        <button data-target="raceCalendarScreen" id="race-calendar-btn" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="award"></i><span class="text-xs">Corridas</span></button>
        <button data-target="aiAnalysisScreen" id="ai-analysis-btn" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="cpu"></i><span class="text-xs">Análise IA</span></button>
        <button data-target="physioAssessmentScreen" id="physio-btn" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="users"></i><span class="text-xs">Avaliação</span></button>
        <button data-target="outdoorSelectionScreen" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="sun"></i><span class="text-xs">Outdoor</span></button>
        <button data-target="exerciciosScreen" id="exercicios-btn" class="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold p-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center h-24"><i data-feather="book-open"></i><span class="text-xs">Biblioteca</span></button>
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
// FIX: renderRaceCalendarScreen was not defined
                renderRaceCalendarScreen(email);
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
            <p class="text-xs">Versão 1.1</p>
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

        calendarGrid.innerHTML += `<div class="${classes}" data-day="${day}">${day}</div>`;
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
    processedExercises.forEach(ex => {
        const today = new Date().toISOString().split('T')[0];
        const isChecked = ex.checkIns && ex.checkIns.includes(today);
        const originalName = ex.name.substring(ex.name.indexOf(' ') + 1);

        const conjugadoColors = {
            1: 'border-l-blue-500',
            2: 'border-l-green-500',
            3: 'border-l-purple-500',
            4: 'border-l-orange-500',
        };
        const conjugadoClass = ex.conjugado ? `border-l-4 ${conjugadoColors[ex.conjugado]}` : '';

        cardsHtml += `
            <div class="exercise-card bg-gray-800 p-3 rounded-xl border border-gray-700 flex items-center gap-3 ${conjugadoClass}" data-exercise-name="${originalName}" data-training-type="${trainingType}">
                <img src="${ex.img || 'https://via.placeholder.com/100x100/4b5563/FFFFFF?text=SEM+IMG'}" alt="thumbnail" class="exercise-thumbnail">
                <div class="flex-grow">
                    <h3 class="font-bold text-md text-yellow-400">${ex.name}</h3>
                    <p class="text-sm">Séries: ${ex.sets} | Reps: ${ex.reps} | Carga: ${ex.carga} kg</p>
                </div>
                <input type="checkbox" class="exercise-checkbox flex-shrink-0 w-6 h-6 rounded-md border-2 border-gray-600 bg-gray-700 focus:ring-0" ${isChecked ? 'checked' : ''}>
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
        if (!card) return;

        const exerciseName = (card as HTMLElement).dataset.exerciseName;
        const currentTrainingType = (card as HTMLElement).dataset.trainingType;

        // Fix: Cast to HTMLInputElement to access type and checked properties
        if ((target as HTMLInputElement).type === 'checkbox') {
            handleExerciseCheckIn(email, currentTrainingType, exerciseName, (target as HTMLInputElement).checked);
            updateSaveButtonVisibility();
        } else {
             if (currentTrainingType === 'A' || currentTrainingType === 'B') {
                openExerciseModal(email, currentTrainingType, exerciseName);
            }
        }
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

function renderPeriodizationScreen(email) {
    const contentWrapper = document.getElementById('periodization-content-wrapper');
    contentWrapper.innerHTML = '';
    
    const user = database.users.find(u => u.email === email);
    if (!user) return;
    
    const currentWeekNumber = getCurrentTrainingWeek(user);
    
    const periodizationPlan = database.trainingPlans.periodizacao[email];
    if (!periodizationPlan) {
        contentWrapper.innerHTML = '<p class="text-center text-white">Nenhum plano de periodização encontrado.</p>';
        return;
    }
    
    periodizationPlan.forEach(phase => {
        let isCurrentPhase = false;
        if (currentWeekNumber !== -1) {
            const weekRange = phase.week.match(/\d+/g);
            if (weekRange) {
                const startWeek = parseInt(weekRange[0], 10);
                const endWeek = weekRange[1] ? parseInt(weekRange[1], 10) : startWeek;
                if (currentWeekNumber >= startWeek && currentWeekNumber <= endWeek) {
                    isCurrentPhase = true;
                }
            }
        }

        const cardClasses = isCurrentPhase 
            ? 'bg-yellow-800 border-yellow-500' 
            : 'bg-gray-800 border-gray-700';
            
        let detailsHtml = `
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="p-3 bg-gray-900/50 rounded-lg"><strong>Repetições:</strong> ${phase.reps}</div>
                <div class="p-3 bg-gray-900/50 rounded-lg"><strong>Volume:</strong> ${phase.volume}</div>
                <div class="p-3 bg-gray-900/50 rounded-lg"><strong>Intensidade:</strong> ${phase.intensity}</div>
                <div class="p-3 bg-gray-900/50 rounded-lg"><strong>Recuperação:</strong> ${phase.recovery}</div>
            </div>
        `;

        if (phase.metodo_desc && phase.descricao) {
             detailsHtml += `
                <div class="mt-4 pt-4 border-t border-gray-600">
                    <h4 class="font-bold text-md mb-2">${phase.metodo_desc}</h4>
                    <p class="text-sm">${phase.descricao}</p>
                </div>
             `;
        }

        const cardHtml = `
            <div class="p-4 rounded-xl border ${cardClasses}">
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <p class="text-xs uppercase tracking-wider">${phase.week}</p>
                        <h3 class="text-xl font-bold">${phase.phase}</h3>
                    </div>
                    ${isCurrentPhase ? '<span class="text-xs font-bold py-1 px-3 bg-yellow-500 text-black rounded-full">FASE ATUAL</span>' : ''}
                </div>
                <p class="mb-3 text-sm"><strong>Métodos:</strong> ${phase.methods}</p>
                ${detailsHtml}
            </div>
        `;
        
        contentWrapper.innerHTML += cardHtml;
    });
}

// --- Tela de Corrida ---
function renderRunningScreen(email) {
    const runningWorkoutsList = document.getElementById('running-workouts-list');
    runningWorkoutsList.innerHTML = '';
    const workouts = database.userRunningWorkouts[email] || [];

    if (workouts.length === 0) {
        runningWorkoutsList.innerHTML = '<p class="text-center text-sm p-4">Nenhum treino de corrida agendado.</p>';
        return;
    }

    workouts.forEach(workout => {
        const workoutDate = new Date(workout.date);
        const formattedDate = `${workoutDate.getUTCDate().toString().padStart(2, '0')}/${(workoutDate.getUTCMonth() + 1).toString().padStart(2, '0')}`;
        const isChecked = workout.completed;

        const cardHtml = `
            <div class="running-session-card bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-start gap-3" data-workout-date="${workout.date}">
                <input type="checkbox" class="exercise-checkbox flex-shrink-0 w-6 h-6 rounded-md border-2 border-gray-600 bg-gray-700 focus:ring-0 mt-1" ${isChecked ? 'checked' : ''}>
                <div class="flex-grow">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-bold text-sm">${formattedDate}</span>
                        <span class="running-title-${workout.type.toLowerCase()} text-xs font-bold py-1 px-2 rounded-full">${workout.type}</span>
                    </div>
                    <p class="text-sm mb-3 whitespace-pre-line">${workout.description}</p>
                    <div class="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-gray-700">
                        <div>
                            <span class="font-semibold opacity-80">Velocidade</span>
                            <p class="font-bold text-base">${workout.performance ? workout.performance.avgSpeed.toFixed(1) : workout.speed} km/h</p>
                        </div>
                        <div>
                            <span class="font-semibold opacity-80">Pace</span>
                            <p class="font-bold text-base">${workout.performance ? workout.performance.avgPace : workout.pace} /km</p>
                        </div>
                        <div>
                            <span class="font-semibold opacity-80">Duração</span>
                            <p class="font-bold text-base">${workout.performance ? workout.performance.time : workout.duration} min</p>
                        </div>
                    </div>
                    ${workout.performance ? `
                    <div class="text-center text-xs pt-3 mt-3 border-t border-gray-700">
                        <span class="font-semibold opacity-80">Calorias Queimadas</span>
                        <p class="font-bold text-base">${workout.performance.calories} kcal</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        runningWorkoutsList.innerHTML += cardHtml;
    });
}

function handleRunningCheckIn(email, workoutDate, isChecked) {
    const workout = database.userRunningWorkouts[email]?.find(w => w.date === workoutDate);
    if (workout) {
        workout.completed = isChecked;
        saveDatabase(database);
    }
}

function openRunningLogModal(email, workoutDate) {
    const workout = database.userRunningWorkouts[email]?.find(w => w.date === workoutDate);
    if (!workout) return;

    const modal = document.getElementById('runningLogModal');
    const modalContent = document.getElementById('running-log-modal-content');
    const dateEl = document.getElementById('running-log-date');
    // Fix: Cast to HTMLInputElement to access value property
    const distanceInput = document.getElementById('running-distance') as HTMLInputElement;
    const timeInput = document.getElementById('running-time') as HTMLInputElement;
    
    const summaryPace = document.getElementById('summary-pace');
    const summarySpeed = document.getElementById('summary-speed');
    const summaryCalories = document.getElementById('summary-calories');

    const workoutDateObj = new Date(workout.date);
    dateEl.textContent = `Treino de ${workoutDateObj.toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;

    if (workout.performance) {
        distanceInput.value = workout.performance.distance || '';
        timeInput.value = workout.performance.time || '';
        summaryPace.textContent = workout.performance.avgPace || '--:--';
        summarySpeed.textContent = workout.performance.avgSpeed?.toFixed(1) || '0.0';
        summaryCalories.textContent = workout.performance.calories || '0';
    } else {
        distanceInput.value = '';
        timeInput.value = '';
        summaryPace.textContent = '--:--';
        summarySpeed.textContent = '0.0';
        summaryCalories.textContent = '0';
    }

    const form = document.getElementById('running-log-form');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Fix: Cast to HTMLInputElement to access value property
        const distance = parseFloat((document.getElementById('running-distance') as HTMLInputElement).value.replace(',', '.'));
        const time = parseFloat((document.getElementById('running-time') as HTMLInputElement).value.replace(',', '.'));
        
        if (!isNaN(distance) && !isNaN(time) && distance > 0 && time > 0) {
            const speed = distance / (time / 60);
            const paceDecimal = time / distance;
            const paceMinutes = Math.floor(paceDecimal);
            const paceSeconds = Math.round((paceDecimal - paceMinutes) * 60);
            const pace = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;

            const user = database.users.find(u => u.email === email);
            // Use the last recorded weight, or a default of 70kg if no history exists.
            let userWeight = 70; // Default weight in kg
            if (user && user.weightHistory && user.weightHistory.length > 0) {
                userWeight = user.weightHistory[user.weightHistory.length - 1].weight;
            }
    
            // Calorie estimation formula: distance (km) * weight (kg) * METs multiplier (approx. 1.036 for running)
            const calories = Math.round(distance * userWeight * 1.036);
            
            workout.performance = {
                distance: distance,
                time: time,
                avgPace: pace,
                avgSpeed: speed,
                calories: calories
            };
            workout.completed = true;
            saveDatabase(database);
            
            summaryPace.textContent = pace;
            summarySpeed.textContent = speed.toFixed(1);
            summaryCalories.textContent = calories.toString();
            
            closeRunningLogModal();
            renderRunningScreen(email); 
            renderCalendar(email);
        } else {
            alert('Por favor, insira valores numéricos válidos e positivos para distância e tempo.');
        }
    });

    modal.classList.remove('hidden');
    modalContent.classList.add('scale-100', 'opacity-100');
    // Fix: Call feather.replace() to render icons
    feather.replace();
}

function closeRunningLogModal() {
    const modal = document.getElementById('runningLogModal');
    const modalContent = document.getElementById('running-log-modal-content');
    modalContent.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => modal.classList.add('hidden'), 300);
}
document.getElementById('closeRunningLogModalBtn').addEventListener('click', closeRunningLogModal);


// --- Tela de Evolução ---
let treinoAChart: any = null;
let treinoBChart: any = null;
function renderEvolutionScreen(email) {
    const selectA = document.getElementById('select-treino-a');
    const selectB = document.getElementById('select-treino-b');
    const user = database.users.find(u => u.email === email);
    const currentWeek = getCurrentTrainingWeek(user);
    
    const treinoAExercises = getTrainingPlanForWeek(email, 'A', currentWeek);
    const treinoBExercises = getTrainingPlanForWeek(email, 'B', currentWeek);

    selectA.innerHTML = treinoAExercises.map((ex, index) => `<option value="${index}">${processExercises([ex], email)[0].name}</option>`).join('');
    selectB.innerHTML = treinoBExercises.map((ex, index) => `<option value="${index}">${processExercises([ex], email)[0].name}</option>`).join('');
    
    selectA.onchange = () => updateChart('A', email);
    selectB.onchange = () => updateChart('B', email);

    updateChart('A', email);
    updateChart('B', email);
}

function updateChart(type, email) {
    // Fix: Cast to HTMLSelectElement to access value property
    const select = document.getElementById(`select-treino-${type.toLowerCase()}`) as HTMLSelectElement;
    const exerciseIndex = parseInt(select.value);

    const user = database.users.find(u => u.email === email);
    const currentWeek = getCurrentTrainingWeek(user);
    const exercises = getTrainingPlanForWeek(email, type, currentWeek);
    const exercise = exercises[exerciseIndex];

    // Fix: Cast to HTMLCanvasElement to access getContext method
    const chartCanvas = document.getElementById(`treino${type}Chart`) as HTMLCanvasElement;
    let chartInstance = type === 'A' ? treinoAChart : treinoBChart;

    if (chartInstance) {
        chartInstance.destroy();
    }

    const data = exercise.historicoCarga ? exercise.historicoCarga.map(h => ({ x: h.data, y: parseFloat(h.carga) })) : [];
    
    // Sort data by date
    data.sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

    const ctx = chartCanvas.getContext('2d');
    // Fix: Use Chart.js constructor
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Carga (kg)',
                data: data,
                borderColor: type === 'A' ? '#3b82f6' : '#10b981',
                backgroundColor: type === 'A' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'dd/MM/yyyy'
                    },
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            }
        }
    });

    if (type === 'A') {
        treinoAChart = chartInstance;
    } else {
        treinoBChart = chartInstance;
    }
}

// --- Tela de Controle de Peso ---
let weightChart: any = null;

function renderWeightControlScreen(email) {
    const user = database.users.find(u => u.email === email);
    if (!user) return;
    if (!user.weightHistory) user.weightHistory = [];

    renderWeightChart(user.weightHistory);
    renderWeightHistoryList(user.weightHistory);

    const saveWeightBtn = document.getElementById('save-weight-btn');
    // Fix: Cast to HTMLInputElement to access value property
    const weightInput = document.getElementById('weight-input') as HTMLInputElement;

    const saveWeightHandler = () => {
        const newWeightStr = weightInput.value.replace(',', '.');
        const newWeight = parseFloat(newWeightStr);
        if (newWeight > 0) {
            const today = new Date().toISOString().split('T')[0];
            
            const todayEntryIndex = user.weightHistory.findIndex(h => h.date === today);
            if(todayEntryIndex > -1) {
                user.weightHistory[todayEntryIndex].weight = newWeight;
            } else {
                 user.weightHistory.push({ date: today, weight: newWeight });
            }
           
            saveDatabase(database);
            renderWeightChart(user.weightHistory);
            renderWeightHistoryList(user.weightHistory);
            weightInput.value = '';
        }
    };
    
    const newSaveWeightBtn = saveWeightBtn.cloneNode(true);
    saveWeightBtn.parentNode.replaceChild(newSaveWeightBtn, saveWeightBtn);
    newSaveWeightBtn.addEventListener('click', saveWeightHandler);
}

function renderWeightChart(history) {
    if (weightChart) {
        weightChart.destroy();
    }
    // Fix: Cast to HTMLCanvasElement to access getContext method
    const ctx = (document.getElementById('weightChart') as HTMLCanvasElement).getContext('2d');
    const data = history.map(h => ({ x: h.date, y: h.weight })).sort((a,b) => new Date(a.x).getTime() - new Date(b.x).getTime());

    // Fix: Use Chart.js constructor
    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Peso (kg)',
                data: data,
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.2)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day', tooltipFormat: 'dd/MM/yyyy' },
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: { legend: { labels: { color: 'white' } } }
        }
    });
}

function renderWeightHistoryList(history) {
    const listEl = document.getElementById('weight-history-list');
    listEl.innerHTML = '';
    if (!history || history.length === 0) {
        listEl.innerHTML = '<p class="text-center text-sm">Nenhum registro de peso.</p>';
        return;
    }
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    sortedHistory.forEach(item => {
        const date = new Date(item.date);
        const formattedDate = `${date.getUTCDate().toString().padStart(2, '0')}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        listEl.innerHTML += `
            <div class="flex justify-between items-center bg-gray-700 p-2 rounded-md text-sm">
                <span>${formattedDate}</span>
                <span class="font-bold">${item.weight.toFixed(1)} kg</span>
            </div>
        `;
    });
}

// --- Weather Widget ---
async function updateWeather() {
    const widget = document.getElementById('weather-widget');
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-22.9068&longitude=-43.1729&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=America/Sao_Paulo');
        const data = await response.json();
        const weatherCode = data.current.weather_code;
        const temp = Math.round(data.current.temperature_2m);
        const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
        const minTemp = Math.round(data.daily.temperature_2m_min[0]);
        
        const weatherIcons = {
            0: 'sun', 1: 'sun', 2: 'cloud', 3: 'cloud',
            45: 'cloud', 48: 'cloud', 51: 'cloud-drizzle', 53: 'cloud-drizzle', 55: 'cloud-drizzle',
            61: 'cloud-rain', 63: 'cloud-rain', 65: 'cloud-rain',
            80: 'cloud-rain', 81: 'cloud-rain', 82: 'cloud-rain',
            95: 'cloud-lightning', 96: 'cloud-lightning', 99: 'cloud-lightning'
        };

        const icon = weatherIcons[weatherCode] || 'sun';
        
        widget.innerHTML = `
            <div class="flex items-center justify-end">
                <i data-feather="${icon}" class="w-5 h-5 text-white mr-2"></i>
                <span class="text-xl font-bold text-white">${temp}°C</span>
            </div>
            <div class="text-xs text-white text-right">
                <span>Max: ${maxTemp}°</span> / <span>Min: ${minTemp}°</span>
            </div>
        `;
        // Fix: Call feather.replace() to render icons
        feather.replace();
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        widget.innerHTML = '<span class="text-xs">Clima indisponível</span>';
    }
}

// --- NUTRICIONISTA IA ---
const consultationQuestions = [
    { 
        id: 'goal', 
        question: "Olá! Sou sua nutricionista IA. Para começarmos, qual é o seu principal objetivo?", 
        type: 'select', 
        options: ['Perder peso', 'Ganhar massa muscular', 'Manter o peso atual', 'Melhorar hábitos alimentares'] 
    },
    { 
        id: 'personal_info', 
        question: "Ótimo! Agora preciso de alguns dados básicos.", 
        type: 'multi-input', 
        fields: [
            { id: 'age', label: 'Idade', type: 'number' },
            { id: 'gender', label: 'Sexo', type: 'select', options: ['Masculino', 'Feminino'] },
            { id: 'height', label: 'Altura (cm)', type: 'number' }
        ] 
    },
    {
        id: 'activity_level',
        question: "Qual é o seu nível de atividade física semanal?",
        type: 'select',
        options: ['Sedentário (pouco ou nenhum exercício)', 'Levemente ativo (exercício leve 1-3 dias/semana)', 'Moderadamente ativo (exercício moderado 3-5 dias/semana)', 'Muito ativo (exercício intenso 6-7 dias/semana)', 'Extremamente ativo (trabalho físico + exercício intenso)']
    },
    {
        id: 'dietary_restrictions',
        question: "Você tem alguma restrição alimentar, alergia ou intolerância? (Ex: lactose, glúten, vegetariano)",
        type: 'textarea',
        placeholder: 'Se não tiver, escreva "nenhuma".'
    },
    {
        id: 'food_preferences',
        question: "Quais são os alimentos saudáveis que você mais gosta?",
        type: 'textarea',
        placeholder: 'Ex: Frango, brócolis, batata doce, frutas...'
    },
    {
        id: 'disliked_foods',
        question: "E quais alimentos você não gosta ou gostaria de evitar?",
        type: 'textarea',
        placeholder: 'Ex: Fígado, jiló, peixe...'
    },
    {
        id: 'daily_routine',
        question: "Descreva um pouco da sua rotina diária (horários que acorda, trabalha, treina, dorme).",
        type: 'textarea',
        placeholder: 'Isso me ajuda a encaixar as refeições nos melhores horários para você.'
    },
    {
        id: 'budget',
        question: "Qual é o seu orçamento aproximado para alimentação?",
        type: 'select',
        options: ['Econômico', 'Moderado', 'Flexível', 'Sem restrições']
    }
];

// Fix: Add missing function definitions to resolve errors.
function renderNutritionistScreen(email: string) {
    const user = database.users.find(u => u.email === email);
    if (!user) return;

    const contentWrapper = document.getElementById('nutrition-content-wrapper');
    if (!contentWrapper) {
        console.error('nutrition-content-wrapper element not found');
        return;
    }

    const status = user.nutritionistData.status;
    const lastPlan = user.nutritionistData.plans && user.nutritionistData.plans.length > 0
        ? user.nutritionistData.plans[user.nutritionistData.plans.length - 1]
        : null;

    if (status === 'loading') {
        contentWrapper.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                <div class="loader mb-4"></div>
                <p class="text-white text-lg font-semibold">Analisando suas respostas...</p>
                <p class="text-gray-400">Estou criando seu plano alimentar personalizado. Isso pode levar um momento.</p>
            </div>
        `;
    } else if (status === 'complete' && lastPlan) {
        const planHtml = marked.parse(lastPlan.plan);
        contentWrapper.innerHTML = `
            <div class="prose prose-invert max-w-none p-4">${planHtml}</div>
            <div class="p-4 sticky bottom-0 bg-gray-900 border-t border-gray-700">
                <button id="start-new-consultation-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">Iniciar Nova Consulta</button>
            </div>
        `;
        document.getElementById('start-new-consultation-btn')?.addEventListener('click', () => {
            if (confirm('Isso arquivará seu plano atual e iniciará uma nova consulta. Deseja continuar?')) {
                user.nutritionistData.status = 'idle';
                user.nutritionistData.consultation = { step: 0, answers: {} };
                saveDatabase(database);
                renderNutritionistScreen(email);
            }
        });
    } else { // 'idle' or consultation in progress
        const step = user.nutritionistData.consultation.step || 0;
        const currentQuestion = consultationQuestions[step];

        if (currentQuestion) {
            let formHtml = `<div class="p-4 space-y-6 flex flex-col h-full">`;
            formHtml += `<div class="flex-grow space-y-4">`
            formHtml += `<p class="text-white text-lg">${currentQuestion.question}</p>`;

            if (currentQuestion.type === 'select') {
                formHtml += `<select id="consultation-input" class="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">`;
                (currentQuestion as any).options.forEach(opt => formHtml += `<option value="${opt}">${opt}</option>`);
                formHtml += `</select>`;
            } else if (currentQuestion.type === 'textarea') {
// FIX: Accessing placeholder on a union type. Cast to any.
                formHtml += `<textarea id="consultation-input" class="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows="5" placeholder="${(currentQuestion as any).placeholder || ''}"></textarea>`;
            } else if (currentQuestion.type === 'multi-input') {
                formHtml += `<div class="space-y-3">`;
// FIX: Accessing fields on a union type. Cast to any.
                (currentQuestion as any).fields.forEach(field => {
                    formHtml += `<div><label class="block text-sm font-medium text-gray-300 mb-1">${field.label}</label>`;
                    if (field.type === 'select') {
                        formHtml += `<select id="consultation-input-${field.id}" class="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">`;
                        field.options.forEach(opt => formHtml += `<option value="${opt}">${opt}</option>`);
                        formHtml += `</select>`;
                    } else {
                        formHtml += `<input type="${field.type}" id="consultation-input-${field.id}" class="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">`;
                    }
                    formHtml += `</div>`;
                });
                formHtml += `</div>`;
            }
            formHtml += `</div>` // flex-grow end

            formHtml += `
                <div class="flex justify-between items-center pt-4 border-t border-gray-700">
                    <button id="prev-question-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg ${step === 0 ? 'invisible' : ''}">Voltar</button>
                    <div class="text-sm text-gray-400">${step + 1} / ${consultationQuestions.length}</div>
                    <button id="next-question-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Próximo</button>
                </div>
            </div>`;
            contentWrapper.innerHTML = formHtml;

            document.getElementById('next-question-btn')?.addEventListener('click', () => {
                const answers = user.nutritionistData.consultation.answers || {};
                if ((currentQuestion as any).type === 'multi-input') {
                    const multiAnswers = {};
                    let allValid = true;
// FIX: Accessing fields on a union type. Cast to any.
                    (currentQuestion as any).fields.forEach(field => {
                        const inputEl = document.getElementById(`consultation-input-${field.id}`) as HTMLInputElement;
                        if (inputEl && inputEl.value) {
                            multiAnswers[field.id] = inputEl.value;
                        } else {
                            allValid = false;
                        }
                    });
                    if (!allValid) { alert('Por favor, preencha todos os campos.'); return; }
                    answers[currentQuestion.id] = multiAnswers;
                } else {
                    const inputEl = document.getElementById('consultation-input') as HTMLInputElement;
                    if (!inputEl || !inputEl.value) { alert('Por favor, responda à pergunta.'); return; }
                    answers[currentQuestion.id] = inputEl.value;
                }
                user.nutritionistData.consultation.answers = answers;

                if (step < consultationQuestions.length - 1) {
                    user.nutritionistData.consultation.step++;
                } else {
                    // Last question, generate plan
// FIX: generateMealPlan was not defined
                    generateMealPlan(email);
                    return; // Skip rerender
                }
                saveDatabase(database);
                renderNutritionistScreen(email);
            });
            document.getElementById('prev-question-btn')?.addEventListener('click', () => {
                if (step > 0) {
                    user.nutritionistData.consultation.step--;
                    saveDatabase(database);
                    renderNutritionistScreen(email);
                }
            });

        } else {
            contentWrapper.innerHTML = `<p class="text-center text-white p-4">Ocorreu um erro na consulta. Por favor, reinicie.</p>`;
        }
    }
}

// FIX: Add missing function generateMealPlan
async function generateMealPlan(email: string) {
    const user = database.users.find(u => u.email === email);
    if (!user) return;

    user.nutritionistData.status = 'loading';
    saveDatabase(database);
    renderNutritionistScreen(email); // Show loader

    try {
        // As per guidelines, initialize GenAI right before use
        const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

        const answers = user.nutritionistData.consultation.answers;
        const lastWeight = user.weightHistory?.length > 0 ? user.weightHistory[user.weightHistory.length - 1].weight : 'não informado';
        
        const prompt = `
            Crie um plano alimentar semanal detalhado e personalizado para um cliente com as seguintes características e objetivos.
            Responda em formato Markdown.

            **Dados do Cliente:**
            - Objetivo: ${(answers as any).goal}
            - Idade: ${(answers as any).personal_info.age} anos
            - Sexo: ${(answers as any).personal_info.gender}
            - Altura: ${(answers as any).personal_info.height} cm
            - Peso Atual: ${lastWeight} kg
            - Nível de Atividade: ${(answers as any).activity_level}
            - Restrições Alimentares/Alergias: ${(answers as any).dietary_restrictions}
            - Preferências Alimentares: ${(answers as any).food_preferences}
            - Alimentos que não gosta: ${(answers as any).disliked_foods}
            - Rotina Diária: ${(answers as any).daily_routine}
            - Orçamento para alimentação: ${(answers as any).budget}

            **Instruções para o Plano:**
            1.  **Estrutura:** Crie um plano para 7 dias da semana (Segunda a Domingo).
            2.  **Refeições:** Inclua 5 a 6 refeições por dia: Café da Manhã, Lanche da Manhã, Almoço, Lanche da Tarde, Jantar e Ceia (opcional).
            3.  **Detalhes:** Para cada refeição, especifique os alimentos, as quantidades (em gramas ou medidas caseiras) e o modo de preparo se necessário.
            4.  **Hidratação:** Inclua uma recomendação geral de ingestão de água.
            5.  **Flexibilidade:** Ofereça 2-3 opções para cada tipo de refeição para dar variedade.
            6.  **Observações:** Adicione uma seção no final com dicas gerais, como a importância de ler rótulos, sugestões de temperos saudáveis, e a importância de um "dia livre" ou refeição livre para adesão a longo prazo.
            7.  **Tom:** Use uma linguagem motivadora, clara e encorajadora, como um nutricionista faria.
            8.  **Formato:** Use títulos (##), listas (*) e negrito (**) para organizar bem a informação. Comece com um título como "# Seu Plano Alimentar Personalizado".
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const generatedPlan = response.text;

        const newPlan = {
            date: new Date().toISOString(),
            plan: generatedPlan,
            answers: user.nutritionistData.consultation.answers
        };

        if (!user.nutritionistData.plans) user.nutritionistData.plans = [];
        user.nutritionistData.plans.push(newPlan);
        user.nutritionistData.status = 'complete';
        user.nutritionistData.consultation = { step: 0, answers: {} }; // Reset for next time
        saveDatabase(database);
        renderNutritionistScreen(email);

    } catch (error) {
        console.error("Error generating meal plan:", error);
        user.nutritionistData.status = 'idle'; // Reset on error
        saveDatabase(database);
        renderNutritionistScreen(email);
        alert(`Ocorreu um erro ao gerar seu plano: ${(error as Error).message}`);
    }
}

function renderAiAnalysisScreen(email: string) {
    const resultDiv = document.getElementById('ai-analysis-result');
    const spinner = document.getElementById('ai-analysis-spinner');
    const initialView = document.querySelector('#aiAnalysisScreen .bg-gray-800');

    // Reset view to initial state
    if (initialView) (initialView as HTMLElement).style.display = 'block';
    resultDiv.innerHTML = '';
    resultDiv.classList.add('hidden');
    spinner.classList.add('hidden');
}

// FIX: Add missing function renderRaceCalendarScreen
function renderRaceCalendarScreen(email: string) {
    const listEl = document.getElementById('race-calendar-list');
    if (!listEl) return;

    const races = database.raceCalendar;
    if (!races || races.length === 0) {
        listEl.innerHTML = `<p class="text-center text-white p-4">Nenhum evento de corrida encontrado no momento.</p>`;
        return;
    }

    listEl.innerHTML = races.map(race => {
        const raceDate = new Date(race.date);
        const formattedDate = raceDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });

        return `
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-3">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-sm font-semibold text-red-400">${formattedDate} - ${race.time}</p>
                        <h3 class="text-lg font-bold text-white">${race.name}</h3>
                        <p class="text-xs text-gray-400 flex items-center mt-1"><i data-feather="map-pin" class="w-3 h-3 mr-1"></i> ${race.location}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-gray-700">
                    <div>
                        <p class="font-semibold text-gray-300">Distâncias</p>
                        <p>${race.distances}</p>
                    </div>
                     <div>
                        <p class="font-semibold text-gray-300">Valor</p>
                        <p>${race.price}</p>
                    </div>
                </div>
                 <a href="${race.registrationLink}" target="_blank" rel="noopener noreferrer" class="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg mt-3">
                    Inscrever-se
                </a>
            </div>
        `;
    }).join('');
    feather.replace(); // To render icons
}

function renderStressLevelScreen(email) {
    const user = database.users.find(u => u.email === email);
    if (!user) return;
    if (!user.stressData) user.stressData = { assessments: [] };

    const today = new Date().toISOString().split('T')[0];
    const todaysAssessments = user.stressData.assessments
        .filter(a => a.date.startsWith(today))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const summaryListEl = document.getElementById('stress-history-summary-list');
    if (todaysAssessments.length > 0) {
        summaryListEl.innerHTML = todaysAssessments.slice(0, 5).map(a => {
            const date = new Date(a.date);
            const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg text-sm">
                    <span>${time}</span>
                    <span class="font-bold text-lg">${a.score} / 100</span>
                </div>
            `;
        }).join('');
    } else {
        summaryListEl.innerHTML = '<p class="text-center text-sm p-4">Nenhuma avaliação hoje.</p>';
    }

    if (stressChart) stressChart.destroy();
    const chartCanvas = document.getElementById('stressChart') as HTMLCanvasElement;
    const ctx = chartCanvas.getContext('2d');
    const chartData = todaysAssessments.map(a => ({
        x: new Date(a.date).getTime(),
        y: a.score
    })).reverse(); // Reverse for chronological order in chart

    stressChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Nível de Estresse',
                data: chartData,
                borderColor: '#facc15',
                backgroundColor: 'rgba(250, 204, 21, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'hour', tooltipFormat: 'HH:mm' },
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    min: 0,
                    max: 100,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    document.getElementById('start-stress-assessment-btn').onclick = () => {
        stressAssessmentState = { currentQuestionIndex: 0, answers: [] };
        transitionScreen(document.getElementById('stressLevelScreen'), document.getElementById('stressAssessmentScreen'));
        renderStressAssessmentScreen();
    };

    document.getElementById('view-stress-history-btn').onclick = () => {
        renderStressHistoryScreen(email);
        transitionScreen(document.getElementById('stressLevelScreen'), document.getElementById('stressHistoryScreen'));
    };
}

function renderStressHistoryScreen(email) {
    const user = database.users.find(u => u.email === email);
    if (!user || !user.stressData) return;

    const listEl = document.getElementById('stress-history-full-list');
    const allAssessments = [...user.stressData.assessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (allAssessments.length === 0) {
        listEl.innerHTML = '<p class="text-center text-white bg-gray-800 p-4 rounded-lg">Nenhum histórico encontrado.</p>';
        return;
    }

    listEl.innerHTML = allAssessments.map(a => {
        const date = new Date(a.date);
        const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
        const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        let scoreColor = 'text-green-400';
        if (a.score >= 40 && a.score < 70) scoreColor = 'text-yellow-400';
        else if (a.score >= 70) scoreColor = 'text-red-500';

        return `
            <div class="bg-gray-800 p-3 rounded-lg flex justify-between items-center border-l-4 border-gray-600">
                <div>
                    <p class="font-bold">${formattedDate}</p>
                    <p class="text-xs">${time}</p>
                </div>
                <p class="text-2xl font-bold ${scoreColor}">${a.score}<span class="text-sm">/100</span></p>
            </div>
        `;
    }).join('');
}


function renderStressAssessmentScreen() {
    const container = document.getElementById('stress-question-container');
    const questionIndex = stressAssessmentState.currentQuestionIndex;
    const questionData = stressAssessmentQuestions[questionIndex];

    if (!questionData) {
        console.error("Question not found for index:", questionIndex);
        return;
    }

    let optionsHtml = questionData.options.map(opt => 
        `<button class="stress-question-option" data-score="${opt.score}">${opt.text}</button>`
    ).join('');

    container.innerHTML = `
        <p class="text-2xl font-semibold mb-8">${questionData.question}</p>
        <div class="space-y-4 w-full flex flex-col items-center">
            ${optionsHtml}
        </div>
        <div class="mt-8 text-sm">${questionIndex + 1} / ${stressAssessmentQuestions.length}</div>
    `;

    container.querySelectorAll('.stress-question-option').forEach(button => {
        button.addEventListener('click', (e) => {
            const score = parseInt((e.currentTarget as HTMLElement).dataset.score, 10);
            stressAssessmentState.answers.push(score);

            if (stressAssessmentState.currentQuestionIndex < stressAssessmentQuestions.length - 1) {
                stressAssessmentState.currentQuestionIndex++;
                renderStressAssessmentScreen();
            } else {
                calculateAndShowStressResult();
            }
        });
    });
}

function calculateAndShowStressResult() {
    const totalScore = stressAssessmentState.answers.reduce((sum, score) => sum + score, 0);
    const maxScore = stressAssessmentQuestions.length * 4;
    const scorePercentage = Math.round((totalScore / maxScore) * 100);

    const email = getCurrentUser();
    const user = database.users.find(u => u.email === email);
    if (user) {
        if (!user.stressData) user.stressData = { assessments: [] };
        user.stressData.assessments.push({
            date: new Date().toISOString(),
            score: scorePercentage
        });
        saveDatabase(database);
    }
    
    renderStressResultScreen(scorePercentage);
    const currentScreen = document.getElementById('stressAssessmentScreen');
    const targetScreen = document.getElementById('stressResultScreen');
    transitionScreen(currentScreen, targetScreen);
}

function renderStressResultScreen(score) {
    const scoreEl = document.getElementById('stress-result-score');
    const levelEl = document.getElementById('stress-result-level');
    const barEl = document.getElementById('stress-gauge-bar');
    const markerEl = document.getElementById('stress-gauge-marker');

    scoreEl.textContent = score.toString();
    barEl.style.width = `${score}%`;
    markerEl.style.left = `${score}%`;

    if (score < 40) {
        levelEl.textContent = 'Baixo';
        scoreEl.className = 'text-7xl font-extrabold text-green-400 my-4';
    } else if (score < 70) {
        levelEl.textContent = 'Moderado';
        scoreEl.className = 'text-7xl font-extrabold text-yellow-400 my-4';
    } else {
        levelEl.textContent = 'Alto';
        scoreEl.className = 'text-7xl font-extrabold text-red-500 my-4';
    }

    const assessAgainBtn = document.getElementById('assess-again-btn');
    assessAgainBtn.onclick = () => {
        stressAssessmentState = { currentQuestionIndex: 0, answers: [] };
        const currentScreen = document.getElementById('stressResultScreen');
        const targetScreen = document.getElementById('stressAssessmentScreen');
        renderStressAssessmentScreen();
        transitionScreen(currentScreen, targetScreen, 'left');
    };
}


function initializeOutdoorSelectionScreen() {
    console.log('Initializing Outdoor Selection Screen...');
    // Placeholder for outdoor selection screen logic
}

// --- AVALIAÇÃO FÍSICA & CÂMERA ---
let cameraStream: MediaStream | null = null;
let currentAlunoIdForPhoto = null;

async function openCameraModal(alunoId) {
    currentAlunoIdForPhoto = alunoId;
    const modal = document.getElementById('cameraModal');
    // Fix: Cast to HTMLVideoElement to access srcObject
    const video = document.getElementById('camera-stream') as HTMLVideoElement;
    
    modal.classList.remove('hidden');

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = cameraStream;
    } catch (err) {
        console.error("Error accessing camera: ", err);
        alert("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
        closeCameraModal();
    }
}

function closeCameraModal() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    cameraStream = null;
    currentAlunoIdForPhoto = null;
    const modal = document.getElementById('cameraModal');
    modal.classList.add('hidden');
}

function capturePhoto() {
    if (!currentAlunoIdForPhoto) return;

    // Fix: Cast to HTMLVideoElement and HTMLCanvasElement
    const video = document.getElementById('camera-stream') as HTMLVideoElement;
    const canvas = document.getElementById('camera-canvas') as HTMLCanvasElement;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg');
    
    const alunos = getPhysioAlunosFromStorage();
    const alunoIndex = alunos.findIndex(a => a.id === currentAlunoIdForPhoto);
    if (alunoIndex !== -1) {
        alunos[alunoIndex].photo = dataUrl;
        savePhysioAlunosToStorage(alunos);
        
        const photoEl = document.getElementById('physio-aluno-photo');
        if (photoEl) {
            // Fix: Cast to HTMLImageElement to set src
            (photoEl as HTMLImageElement).src = dataUrl;
        }
        
        const alunoCardPhoto = document.querySelector(`.aluno-card[data-aluno-id="${currentAlunoIdForPhoto}"] img`);
        if (alunoCardPhoto) {
            // Fix: Cast to HTMLImageElement to set src
            (alunoCardPhoto as HTMLImageElement).src = dataUrl;
        }
    }

    closeCameraModal();
}

function initializePhysioAssessmentScreen() {
    const professorView = document.getElementById('view-professor');
    const alunoView = document.getElementById('view-aluno');
    const professorTab = document.getElementById('tab-professor');
    const alunoTab = document.getElementById('tab-aluno');
    
    const professorDashboard = document.getElementById('professor-dashboard');
    const formAvaliacao = document.getElementById('form-avaliacao');
    const viewAlunoData = document.getElementById('view-aluno-data');

    professorTab.addEventListener('click', () => {
        professorTab.classList.add('tab-active');
        alunoTab.classList.remove('tab-active');
        professorView.style.display = 'block';
        alunoView.style.display = 'none';
    });

    alunoTab.addEventListener('click', () => {
        alunoTab.classList.add('tab-active');
        professorTab.classList.remove('tab-active');
        alunoView.style.display = 'block';
        professorView.style.display = 'none';
        renderAlunoViewSelector();
    });

    professorTab.click();
    
    const addAlunoModal = document.getElementById('modal-add-aluno');
    const addAlunoModalContent = document.getElementById('modal-add-aluno-content');
    const addAlunoBtn = document.getElementById('btn-add-aluno');
    const cancelAlunoBtn = document.getElementById('btn-cancel-modal');
    // Fix: Cast to HTMLFormElement to access reset method
    const saveAlunoForm = document.getElementById('form-novo-aluno') as HTMLFormElement;

    const openAddAlunoModal = () => {
        const nascimentoInput = document.getElementById('nascimento-aluno') as HTMLInputElement;
        // Set min and max dates to provide a reasonable range for date of birth, fixing browser inconsistencies.
        if (nascimentoInput) {
            const today = new Date();
            const farInThePast = new Date(today.getFullYear() - 125, today.getMonth(), today.getDate());
            
            nascimentoInput.max = today.toISOString().split('T')[0];
            nascimentoInput.min = farInThePast.toISOString().split('T')[0];
        }

        addAlunoModal.classList.remove('hidden');
        setTimeout(() => {
            addAlunoModalContent.classList.remove('scale-95', 'opacity-0');
        }, 10);
    };

    const closeAddAlunoModal = () => {
        addAlunoModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            addAlunoModal.classList.add('hidden');
        }, 300);
    };
    
    addAlunoBtn.addEventListener('click', openAddAlunoModal);
    cancelAlunoBtn.addEventListener('click', closeAddAlunoModal);
    addAlunoModal.addEventListener('click', (e) => {
        if (e.target === addAlunoModal) closeAddAlunoModal();
    });

    saveAlunoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Fix: Cast to access value property
        const nome = (document.getElementById('nome-aluno') as HTMLInputElement).value;
        const sexo = (document.getElementById('sexo-aluno') as HTMLSelectElement).value;
        const nascimento = (document.getElementById('nascimento-aluno') as HTMLInputElement).value;
        
        const alunos = getPhysioAlunosFromStorage();
        const newAluno = {
            id: `aluno-${Date.now()}`,
            nome,
            sexo,
            nascimento,
            avaliacoes: [],
            photo: null
        };
        alunos.push(newAluno);
        savePhysioAlunosToStorage(alunos);
        
        saveAlunoForm.reset();
        closeAddAlunoModal();
        renderProfessorDashboard();
    });
    
    document.getElementById('close-camera-modal-btn').addEventListener('click', closeCameraModal);
    document.getElementById('capture-photo-btn').addEventListener('click', capturePhoto);

    renderProfessorDashboard();
}

function renderProfessorDashboard() {
    const alunos = getPhysioAlunosFromStorage();
    const listaAlunosEl = document.getElementById('lista-alunos');
    const loader = document.getElementById('loader');
    const noAlunosMsg = document.getElementById('no-alunos-message');
    
    document.getElementById('professor-dashboard').style.display = 'block';
    document.getElementById('form-avaliacao').style.display = 'none';
    document.getElementById('view-aluno-data').style.display = 'none';

    loader.style.display = 'block';
    listaAlunosEl.style.display = 'none';
    noAlunosMsg.style.display = 'none';

    setTimeout(() => {
        loader.style.display = 'none';
        if (alunos.length === 0) {
            noAlunosMsg.style.display = 'block';
        } else {
            listaAlunosEl.innerHTML = '';
            alunos.forEach(aluno => {
                const card = document.createElement('div');
                card.className = 'aluno-card bg-gray-800 p-4 rounded-xl shadow-md flex items-center justify-between cursor-pointer hover:bg-gray-700 transition';
                card.dataset.alunoId = aluno.id;
                card.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <img src="${aluno.photo || 'https://via.placeholder.com/64x64/4b5563/FFFFFF?text=SEM+FOTO'}" alt="Foto do Aluno" class="w-16 h-16 rounded-full object-cover border-2 border-gray-600">
                        <div>
                            <h4 class="font-bold text-lg">${aluno.nome}</h4>
                            <p class="text-sm">${aluno.avaliacoes.length} avaliações</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-400"></i>
                `;
                card.addEventListener('click', () => renderPhysioAlunoData(aluno.id));
                listaAlunosEl.appendChild(card);
            });
            listaAlunosEl.style.display = 'grid';
        }
    }, 500);
}

function renderPhysioAlunoData(alunoId) {
    const aluno = getPhysioAlunosFromStorage().find(a => a.id === alunoId);
    if (!aluno) return;

    document.getElementById('professor-dashboard').style.display = 'none';
    document.getElementById('form-avaliacao').style.display = 'none';
    const viewContainer = document.getElementById('view-aluno-data');
    viewContainer.style.display = 'block';

    const idade = aluno.nascimento ? new Date().getFullYear() - new Date(aluno.nascimento).getFullYear() : 'N/A';

    viewContainer.innerHTML = `
        <div class="flex items-center mb-6">
            <button id="btn-back-to-physio-dashboard" class="mr-4 bg-gray-700 hover:bg-gray-600 p-2 rounded-full text-white"><i class="fas fa-arrow-left"></i></button>
            <h2 class="text-2xl font-semibold text-white">Perfil de <span class="text-blue-400">${aluno.nome}</span></h2>
        </div>
        <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-6">
            <div class="flex items-center space-x-4">
                <div class="relative">
                    <img id="physio-aluno-photo" src="${aluno.photo || 'https://via.placeholder.com/100x100/4b5563/FFFFFF?text=SEM+FOTO'}" alt="Foto do Aluno" class="w-24 h-24 rounded-full object-cover border-4 border-blue-500">
                    <button id="update-photo-btn" aria-label="Atualizar foto do perfil" class="absolute bottom-0 right-0 bg-white text-gray-800 p-2 rounded-full shadow-md hover:bg-gray-200 transition">
                        <i data-feather="camera" class="w-4 h-4" aria-hidden="true"></i>
                    </button>
                </div>
                <div>
                    <h3 class="text-xl font-bold">${aluno.nome}</h3>
                    <p>${aluno.sexo}</p>
                    <p>${idade} anos</p>
                </div>
            </div>
        </div>
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-white">Histórico de Avaliações</h3>
            <button id="btn-nova-avaliacao" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"><i class="fas fa-plus mr-2"></i> Nova Avaliação</button>
        </div>
        <div id="assessments-history-list" class="space-y-4"></div>
    `;
    // Fix: Call feather.replace() to render icons
    feather.replace();
    renderAssessmentsHistory(aluno);
    
    document.getElementById('btn-back-to-physio-dashboard').addEventListener('click', renderProfessorDashboard);
    document.getElementById('update-photo-btn').addEventListener('click', () => openCameraModal(aluno.id));
    document.getElementById('btn-nova-avaliacao').addEventListener('click', () => renderNewAssessmentForm(aluno.id));
}

function renderNewAssessmentForm(alunoId) {
    const alunos = getPhysioAlunosFromStorage();
    const aluno = alunos.find(a => a.id === alunoId);
    if (!aluno) return;

    // Show form, hide other views
    document.getElementById('professor-dashboard').style.display = 'none';
    document.getElementById('view-aluno-data').style.display = 'none';
    document.getElementById('form-avaliacao').style.display = 'block';

    // Populate student name
    document.getElementById('form-aluno-nome').textContent = aluno.nome;

    // Configure form
    const form = document.getElementById('avaliacao-form') as HTMLFormElement;
    form.reset();
    (document.getElementById('data') as HTMLInputElement).value = new Date().toISOString().split('T')[0];
    
    // Show skinfold fields based on gender
    document.querySelectorAll('.skinfold-field-wrapper').forEach(el => {
        const element = el as HTMLElement;
        const requiredGender = element.dataset.gender;
        if (requiredGender && requiredGender.includes(aluno.sexo)) {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    });

    // Handle form submission (clone to prevent duplicate listeners)
    const newForm = form.cloneNode(true) as HTMLFormElement;
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newAvaliacao = {
            // Dados Básicos
            data: (document.getElementById('data') as HTMLInputElement).value,
            peso: (document.getElementById('peso') as HTMLInputElement).value,
            altura: (document.getElementById('altura') as HTMLInputElement).value,
            
            // Dobras Cutâneas
            dc_peitoral: (document.getElementById('dc_peitoral') as HTMLInputElement).value,
            dc_abdominal: (document.getElementById('dc_abdominal') as HTMLInputElement).value,
            dc_tricipital: (document.getElementById('dc_tricipital') as HTMLInputElement).value,
            dc_suprailiaca: (document.getElementById('dc_suprailiaca') as HTMLInputElement).value,
            dc_coxa: (document.getElementById('dc_coxa') as HTMLInputElement).value,

            // Perímetros
            p_torax: (document.getElementById('p_torax') as HTMLInputElement).value,
            p_abdomen: (document.getElementById('p_abdomen') as HTMLInputElement).value,
            p_cintura: (document.getElementById('p_cintura') as HTMLInputElement).value,
            p_quadril: (document.getElementById('p_quadril') as HTMLInputElement).value,
            p_braco_d: (document.getElementById('p_braco_d') as HTMLInputElement).value,
            p_braco_e: (document.getElementById('p_braco_e') as HTMLInputElement).value,
            p_antebraco_d: (document.getElementById('p_antebraco_d') as HTMLInputElement).value,
            p_antebraco_e: (document.getElementById('p_antebraco_e') as HTMLInputElement).value,
            p_coxa_prox_d: (document.getElementById('p_coxa_prox_d') as HTMLInputElement).value,
            p_coxa_prox_e: (document.getElementById('p_coxa_prox_e') as HTMLInputElement).value,
            p_coxa_medial_d: (document.getElementById('p_coxa_medial_d') as HTMLInputElement).value,
            p_coxa_medial_e: (document.getElementById('p_coxa_medial_e') as HTMLInputElement).value,
            p_coxa_distal_d: (document.getElementById('p_coxa_distal_d') as HTMLInputElement).value,
            p_coxa_distal_e: (document.getElementById('p_coxa_distal_e') as HTMLInputElement).value,
            p_panturrilha_d: (document.getElementById('p_panturrilha_d') as HTMLInputElement).value,
            p_panturrilha_e: (document.getElementById('p_panturrilha_e') as HTMLInputElement).value,

            // Bioimpedância
            bio_agua: (document.getElementById('bio_agua') as HTMLInputElement).value,
            bio_proteina: (document.getElementById('bio_proteina') as HTMLInputElement).value,
            bio_minerais: (document.getElementById('bio_minerais') as HTMLInputElement).value,
            bio_massa_gordura: (document.getElementById('bio_massa_gordura') as HTMLInputElement).value,
            bio_massa_magra: (document.getElementById('bio_massa_magra') as HTMLInputElement).value,
            bio_tmb: (document.getElementById('bio_tmb') as HTMLInputElement).value,
            bio_gordura_visceral: (document.getElementById('bio_gordura_visceral') as HTMLInputElement).value,
            bio_grau_obesidade: (document.getElementById('bio_grau_obesidade') as HTMLInputElement).value,
        };

        const alunoIndex = alunos.findIndex(a => a.id === alunoId);
        if (alunoIndex !== -1) {
            if (!alunos[alunoIndex].avaliacoes) {
                alunos[alunoIndex].avaliacoes = [];
            }
            alunos[alunoIndex].avaliacoes.push(newAvaliacao);
            savePhysioAlunosToStorage(alunos);
            alert('Avaliação salva com sucesso!');
            renderPhysioAlunoData(alunoId); // Go back to student profile
        }
    });
    
    // Handle back button on the form screen
    document.getElementById('btn-back-to-dashboard').addEventListener('click', () => renderPhysioAlunoData(alunoId));
}

function renderAssessmentsHistory(aluno) {
    const listEl = document.getElementById('assessments-history-list');
    if (!aluno.avaliacoes || aluno.avaliacoes.length === 0) {
        listEl.innerHTML = '<p class="text-center p-4 bg-gray-800 rounded-lg">Nenhuma avaliação registrada.</p>';
        return;
    }
    listEl.innerHTML = aluno.avaliacoes.map(av => `<div class="bg-gray-800 p-4 rounded-lg">Avaliação de ${new Date(av.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>`).join('');
}

function renderAlunoViewSelector() {
    const selector = document.getElementById('aluno-selector');
    const alunos = getPhysioAlunosFromStorage();
    if (alunos.length > 0) {
        selector.innerHTML = '<option value="">Selecione seu nome</option>' + alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    } else {
        selector.innerHTML = '<option>Nenhum aluno cadastrado</option>';
    }
}

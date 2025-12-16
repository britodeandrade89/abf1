import { GoogleGenAI, Chat } from "@google/genai";

// Globals defined by imported scripts
declare var feather: any;
declare var Chart: any;
declare var marked: any;
declare var L: any; // Leaflet global

// --- CONFIGURATION ---
// No splash duration needed

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

// --- AI CHAT STATE ---
let chatSession: Chat | null = null;
const CHAT_SYSTEM_INSTRUCTION = `Você é o coach virtual da ABFIT, uma assessoria esportiva de alta performance fundada por André Brito.
Seu nome é AB Coach.
Seu objetivo é ajudar os alunos com dúvidas sobre:
1. Execução de exercícios (dê dicas técnicas).
2. Nutrição e suplementação (dicas gerais, não prescrição médica).
3. Motivação e disciplina.
4. Explicação sobre periodização de treino.

Personalidade:
- Energético, motivador e profissional.
- Use emojis relacionados a esporte (💪, 🏋️, 🔥).
- Respostas concisas e fáceis de ler no celular.
- Se não souber, diga que vai consultar o André Brito.`;

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
// Default user data structure for fallback
const defaultDatabase = {
    users: [
        { id: 1, name: 'André Brito', email: 'britodeandrade@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3Zy4n6ZmWp9DW98VtXpO.jpeg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: '2025-01-15', stressData: { assessments: [] } },
        { id: 2, name: 'Marcelly Bispo', email: 'marcellybispo92@gmail.com', photo: 'marcelly.jpg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: '2025-01-15', stressData: { assessments: [] } }
    ],
    trainingPlans: { treinosA: {}, treinosB: {}, periodizacao: {} },
    userRunningWorkouts: {},
    completedWorkouts: {}, 
    activeSessions: {},
    raceCalendar: []
};

// --- STORAGE ---
const STORAGE_KEYS = {
    DATABASE: 'abfit_database_v8', 
    CURRENT_USER: 'abfit_current_user'
};

function getDatabase() {
    const saved = localStorage.getItem(STORAGE_KEYS.DATABASE);
    return saved ? JSON.parse(saved) : defaultDatabase;
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
    try {
        const db = getDatabase();
        
        // Ensure emails are lowercase for consistency
        const usersToInit = ['britodeandrade@gmail.com', 'marcellybispo92@gmail.com'];
        
        // Ensure Marcelly is in the user list if loaded from old DB
        const marcelly = db.users.find((u: any) => u.email === 'marcellybispo92@gmail.com');
        if (!marcelly) {
            db.users.push({ id: 2, name: 'Marcelly Bispo', email: 'marcellybispo92@gmail.com', photo: 'marcelly.jpg', weightHistory: [], nutritionistData: { consultation: { step: 0, answers: {} }, plans: [], status: 'idle' }, periodizationStartDate: '2025-01-15', stressData: { assessments: [] } });
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
            if (email === 'marcellybispo92@gmail.com') {
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
    } catch (e) {
        console.error("Initialization error:", e);
    }
}

// --- AI CHAT LOGIC ---
async function loadAIAnalysisScreen() {
    const screen = document.getElementById('aiAnalysisScreen');
    if (!screen) return;

    // Build Chat Interface
    screen.innerHTML = `
        <div class="flex flex-col h-full bg-gray-900 relative">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur border-b border-gray-700 shadow-lg z-20">
                <button onclick="showScreen('studentProfileScreen')" class="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                    <i data-feather="arrow-left"></i>
                </button>
                <div class="flex flex-col items-center">
                    <h2 class="text-lg font-black text-white italic tracking-wide flex items-center gap-2">
                        ABFIT <span class="text-teal-400">AI</span>
                    </h2>
                </div>
                <div class="w-8"></div>
            </div>

            <!-- Chat Messages -->
            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 pb-32 scroll-smooth">
                <!-- Welcome -->
                <div class="flex justify-start animate-fadeIn">
                    <div class="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center mr-2 border border-teal-500/50 flex-shrink-0">
                        <i class="fas fa-robot text-teal-400 text-xs"></i>
                    </div>
                    <div class="bg-gray-800 text-gray-200 p-3 rounded-2xl rounded-tl-none max-w-[80%] shadow-sm border border-gray-700">
                        <p class="text-sm">Fala! Sou a inteligência artificial da ABFIT. 💪<br>Tem alguma dúvida sobre seu treino ou dieta hoje?</p>
                    </div>
                </div>
            </div>

            <!-- Input Area -->
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-gray-900/95 border-t border-gray-800 z-20 pb-8">
                <form onsubmit="handleChatSubmit(event)" class="flex gap-2 items-end">
                    <div class="flex-1 relative">
                        <input type="text" id="chat-input" 
                            class="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-4 py-3 pr-4 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder-gray-500 max-h-32" 
                            placeholder="Digite sua dúvida..." 
                            autocomplete="off">
                    </div>
                    <button type="submit" 
                        class="bg-teal-500 hover:bg-teal-600 active:scale-95 text-gray-900 font-bold p-3 rounded-xl transition-all shadow-lg shadow-teal-500/20 flex-shrink-0">
                        <i data-feather="send" class="w-5 h-5"></i>
                    </button>
                </form>
            </div>
        </div>
    `;

    if (typeof feather !== 'undefined') feather.replace();
    showScreen('aiAnalysisScreen');

    // Init Chat Session
    if (!chatSession) {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            chatSession = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: CHAT_SYSTEM_INSTRUCTION,
                }
            });
        } catch (e) {
            console.error("AI Init Error:", e);
        }
    }
}

(window as any).handleChatSubmit = async (e: Event) => {
    e.preventDefault();
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const container = document.getElementById('chat-messages');
    const msg = input.value.trim();
    if (!msg || !chatSession) return;

    input.value = '';

    // User Message
    const userDiv = document.createElement('div');
    userDiv.className = 'flex justify-end animate-fadeIn';
    userDiv.innerHTML = `
        <div class="bg-teal-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] shadow-md">
            <p class="text-sm">${msg.replace(/\n/g, '<br>')}</p>
        </div>
    `;
    container?.appendChild(userDiv);
    container?.scrollTo(0, container.scrollHeight);

    // Loading Bubble
    const loaderId = 'chat-loader-' + Date.now();
    const loaderDiv = document.createElement('div');
    loaderDiv.id = loaderId;
    loaderDiv.className = 'flex justify-start animate-fadeIn';
    loaderDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center mr-2 border border-teal-500/50 flex-shrink-0">
            <i class="fas fa-robot text-teal-400 text-xs"></i>
        </div>
        <div class="bg-gray-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-700 flex gap-1.5 items-center">
            <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
            <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
            <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
        </div>
    `;
    container?.appendChild(loaderDiv);
    container?.scrollTo(0, container.scrollHeight);

    try {
        const response = await chatSession.sendMessage({ message: msg });
        const text = response.text;
        
        document.getElementById(loaderId)?.remove();

        const aiDiv = document.createElement('div');
        aiDiv.className = 'flex justify-start animate-fadeIn';
        // Use marked for formatting
        const contentHtml = (typeof marked !== 'undefined') ? marked.parse(text) : text;
        
        aiDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center mr-2 border border-teal-500/50 flex-shrink-0 mt-1">
                <i class="fas fa-robot text-teal-400 text-xs"></i>
            </div>
            <div class="bg-gray-800 text-gray-200 p-3 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm border border-gray-700 prose prose-invert prose-sm leading-snug">
                ${contentHtml}
            </div>
        `;
        container?.appendChild(aiDiv);
        container?.scrollTo(0, container.scrollHeight);
    } catch (err) {
        document.getElementById(loaderId)?.remove();
        console.error(err);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'flex justify-start animate-fadeIn';
        errorDiv.innerHTML = `
             <div class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mr-2 border border-red-500/50 flex-shrink-0">
                <i class="fas fa-exclamation text-red-400 text-xs"></i>
            </div>
            <div class="bg-gray-800 text-red-300 p-3 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm border border-red-900/50">
                <p class="text-sm">Erro ao conectar com a IA. Tente novamente.</p>
            </div>
        `;
        container?.appendChild(errorDiv);
        container?.scrollTo(0, container.scrollHeight);
    }
};

// --- NAVIGATION ---
function showScreen(screenId: string) {
    // 1. Hide all screens by removing active class
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
        s.classList.remove('active');
        // Ensure we remove any lingering hidden classes from manual manipulation
        s.classList.remove('hidden'); 
        (s as HTMLElement).style.display = '';
    });

    // 2. Show target screen
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        target.classList.remove('hidden'); // Double check
        console.log(`Navigating to: ${screenId}`);
    } else {
        console.error(`Screen not found: ${screenId}`);
    }
    window.scrollTo(0, 0);
}

// --- RENDER HISTORY LIST ---
function renderTrainingHistory(email: string) {
    const historyContainer = document.getElementById('training-history-container');
    if (!historyContainer) return;

    const db = getDatabase();
    let history = db.completedWorkouts?.[email] || [];
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const monthlyHistory = history.filter((h: any) => h.date.startsWith(monthPrefix))
                                  .sort((a: any, b: any) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());

    if (monthlyHistory.length === 0) {
        historyContainer.innerHTML = '<p class="text-gray-400 text-center text-sm mt-4">Nenhum histórico neste mês.</p>';
        return;
    }

    let html = '<h3 class="text-lg font-bold text-white mb-3 px-1">Histórico Recente</h3><div class="space-y-2">';
    
    monthlyHistory.forEach((item: any, idx: number) => {
        const dateObj = new Date(item.date + 'T00:00:00');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hasPhoto = item.photo ? true : false;
        
        html += `
            <div onclick="openHistoryDetail('${item.timestamp}')" class="flex items-center justify-between bg-gray-800/80 p-3 rounded-xl border border-gray-700 cursor-pointer hover:bg-gray-700 transition">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gray-700 rounded-lg flex flex-col items-center justify-center border border-gray-600 relative overflow-hidden">
                        ${hasPhoto ? `<img src="${item.photo}" class="absolute inset-0 w-full h-full object-cover opacity-60">` : ''}
                        <span class="text-xs text-gray-400 uppercase font-bold z-10 drop-shadow-md">DIA</span>
                        <span class="text-lg font-bold text-white leading-none z-10 drop-shadow-md">${day}</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <p class="text-white font-bold text-sm">${item.type}</p>
                            ${hasPhoto ? '<i class="fas fa-camera text-xs text-blue-400"></i>' : ''}
                        </div>
                        <div class="flex items-center gap-1">
                            <i data-feather="check-circle" class="w-3 h-3 text-green-500"></i>
                            <span class="text-xs text-green-400 font-medium">Concluído</span>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-400 font-bold uppercase mb-0.5">Tempo</p>
                    <p class="text-white font-bold font-mono bg-gray-900/50 px-2 py-1 rounded text-xs border border-gray-600">${item.duration}</p>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    historyContainer.innerHTML = html;
    if (typeof feather !== 'undefined') feather.replace();
}

// Global open history detail
(window as any).openHistoryDetail = (timestamp: string) => {
    const db = getDatabase();
    const email = getCurrentUser();
    const item = db.completedWorkouts?.[email]?.find((x: any) => x.timestamp === timestamp || x.date === timestamp /* fallback */);

    if (item) {
        document.getElementById('history-modal-type')!.textContent = item.type;
        document.getElementById('history-modal-date')!.textContent = formatDate(new Date(item.date + 'T00:00:00'));
        document.getElementById('history-modal-duration')!.textContent = item.duration;
        
        const distBox = document.getElementById('history-modal-distance-box');
        if (item.distance) {
            document.getElementById('history-modal-distance')!.textContent = item.distance;
            distBox?.classList.remove('hidden');
        } else {
            distBox?.classList.add('hidden');
        }

        const imgEl = document.getElementById('history-modal-img') as HTMLImageElement;
        const noImgEl = document.getElementById('history-modal-no-img');

        if (item.photo) {
            imgEl.src = item.photo;
            imgEl.classList.remove('hidden');
            noImgEl?.classList.add('hidden');
        } else {
            imgEl.classList.add('hidden');
            noImgEl?.classList.remove('hidden');
        }

        document.getElementById('workoutResultModal')?.classList.remove('hidden');
        if (typeof feather !== 'undefined') feather.replace();
    }
};

// Global open info modal (Footer)
(window as any).openInfoModal = (key: string) => {
    const data = footerContent[key];
    if(data) {
        document.getElementById('info-modal-title')!.textContent = data.title;
        document.getElementById('info-modal-body')!.innerHTML = data.body;
        const modal = document.getElementById('infoModal');
        modal?.classList.remove('hidden');
        if (typeof feather !== 'undefined') feather.replace();
    }
};


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
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day opacity-0 pointer-events-none';
        grid.appendChild(empty);
    }

    const db = getDatabase();
    const email = getCurrentUser();

    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day transition-all hover:bg-gray-700 cursor-default';
        cell.textContent = d.toString();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        if (year === today.getFullYear() && month === today.getMonth() && d === today.getDate()) {
            cell.classList.add('today');
        }
        if (db.trainingPlans && email) {
            let hasA = db.trainingPlans.treinosA?.[email]?.some((ex: any) => ex.checkIns && ex.checkIns.includes(dateStr));
            let hasB = db.trainingPlans.treinosB?.[email]?.some((ex: any) => ex.checkIns && ex.checkIns.includes(dateStr));
            if (hasA && hasB) cell.classList.add('treino-A-B-completed');
            else if (hasA) cell.classList.add('treino-A-completed');
            else if (hasB) cell.classList.add('treino-B-completed');
        }
        grid.appendChild(cell);
    }

    if (email) renderTrainingHistory(email);
}

// Global toggleSet
(window as any).toggleSet = (idx: number, type: string, setNum: number) => {
    const db = getDatabase();
    const email = getCurrentUser();
    if (!email) return;

    const exercise = db.trainingPlans[`treinos${type}`][email][idx];
    const todayStr = new Date().toISOString().split('T')[0];
    if (!exercise.doneSets) exercise.doneSets = [];
    if (exercise.doneSets.includes(setNum)) exercise.doneSets = exercise.doneSets.filter((s: number) => s !== setNum);
    else exercise.doneSets.push(setNum);

    const totalSets = parseInt(exercise.sets) || 3;
    if (exercise.doneSets.length >= totalSets) {
        if (!exercise.checkIns) exercise.checkIns = [];
        if (!exercise.checkIns.includes(todayStr)) exercise.checkIns.push(todayStr);
    }
    saveDatabase(db);
    (window as any).loadTrainingScreen(type);
    if (window.event) window.event.stopPropagation();
};

// --- TRAINING SCREEN LOGIC ---
function loadTrainingScreen(type: string, email?: string) {
    const userEmail = email || getCurrentUser();
    if (!userEmail) return;

    const db = getDatabase();
    const plan = db.trainingPlans[`treinos${type}`]?.[userEmail] || [];
    
    // --- Setup Header Button for Finish Flow ---
    const saveBtn = document.getElementById('save-training-btn');
    if (saveBtn) {
        // Clone to remove old listeners
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode?.replaceChild(newBtn, saveBtn);
        newBtn.addEventListener('click', () => (window as any).openFinishWorkoutModal(type));
    }

    const titleEl = document.getElementById('training-title');
    if (titleEl) titleEl.textContent = `TREINO ${type}`;

    // --- Workout Navigation Logic ---
    const navContainer = document.getElementById('workout-nav-bar');
    if (navContainer) {
        let navHtml = '';
        if (type === 'A') {
            // Left empty (disabled), Right points to B
            navHtml = `
                <div></div>
                <button onclick="loadTrainingScreen('B')" class="flex items-center justify-end gap-2 text-xs font-bold text-gray-400 hover:text-white transition group text-right">
                    <span class="group-hover:text-red-500 transition">Treino B</span> <i data-feather="chevron-right"></i>
                </button>
            `;
        } else if (type === 'B') {
            // Left points to A, Right empty
            navHtml = `
                <button onclick="loadTrainingScreen('A')" class="flex items-center justify-start gap-2 text-xs font-bold text-gray-400 hover:text-white transition group text-left">
                    <i data-feather="chevron-left"></i> <span class="group-hover:text-red-500 transition">Treino A</span>
                </button>
                <div></div>
            `;
        } else {
            navHtml = ''; // Clear for other types if any
        }
        navContainer.innerHTML = navHtml;
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

    const listContainer = document.getElementById('training-content-wrapper');
    if (listContainer) {
        listContainer.innerHTML = '';
        const todayStr = new Date().toISOString().split('T')[0];

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
            const totalSets = parseInt(ex.sets) || 3; 
            const doneSets = ex.doneSets || [];
            let setsHtml = '';
            
            for (let s = 1; s <= totalSets; s++) {
                const isDone = doneSets.includes(s);
                const bgClass = isDone ? 'bg-green-500 border-green-600 text-white' : 'bg-gray-400/50 border-gray-400 text-gray-700 hover:bg-gray-400';
                setsHtml += `<div onclick="toggleSet(${i}, '${type}', ${s})" class="w-6 h-6 rounded-full border ${bgClass} flex items-center justify-center font-bold text-xs cursor-pointer shadow-sm transition-all active:scale-95 shrink-0">${s}</div>`;
            }

            const wrapper = document.createElement('div');
            if (conjugadoId) wrapper.className = 'superset-wrapper';
            let lineHTML = lineType ? `<div class="superset-line ${lineType}"></div>` : '';

            wrapper.innerHTML = `
                ${lineHTML}
                <div class="metal-card-exercise flex-col !items-stretch !gap-3 h-auto" onclick="openExerciseModal(${i}, '${type}')">
                    <div class="flex items-start gap-3 relative">
                        <div class="relative shrink-0">
                            <img src="${ex.img}" class="exercise-thumbnail w-16 h-16 object-cover rounded-lg shadow-sm border border-gray-400">
                            <div class="absolute inset-0 flex items-center justify-center"><i data-feather="play-circle" class="text-white w-6 h-6 drop-shadow-md opacity-80"></i></div>
                        </div>
                        <div class="flex-grow min-w-0 pt-0.5">
                            <h3 class="font-black text-gray-900 text-sm leading-tight pr-10 uppercase tracking-tight">${i + 1}. ${cleanName}</h3>
                            ${label ? `<p class="text-[10px] font-bold text-red-600 mt-0.5 tracking-wider">${label}</p>` : ''}
                        </div>
                        <div class="toggle-switch absolute top-0 right-0" onclick="event.stopPropagation()">
                            <label><input type="checkbox" class="exercise-check" data-idx="${i}" ${isChecked ? 'checked' : ''}><span class="slider"></span></label>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                         <div class="bg-gray-300/60 rounded-lg p-1.5 border border-gray-400 flex flex-col justify-between shadow-inner h-20" onclick="event.stopPropagation()">
                             <div class="flex flex-col items-center justify-center border-b border-gray-400/30 pb-1"><span class="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Séries</span><span class="text-xl font-black text-blue-800 leading-none">${ex.sets}</span></div>
                             <div class="flex justify-evenly items-center w-full h-full pt-1 px-0.5 overflow-hidden">${setsHtml}</div>
                         </div>
                         <div class="bg-gray-300/60 rounded-lg p-1.5 border border-gray-400 flex flex-col items-center justify-center shadow-inner h-20">
                            <span class="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Reps</span><span class="text-2xl font-black text-orange-700 leading-none">${ex.reps}</span>
                         </div>
                         <div class="bg-gray-300/60 rounded-lg p-1.5 border border-gray-400 flex flex-col items-center justify-center shadow-inner h-20">
                            <span class="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Carga</span><span class="text-2xl font-black text-red-700 leading-none">${ex.carga}<span class="text-xs ml-0.5 font-bold">kg</span></span>
                         </div>
                    </div>
                </div>
            `;
            return wrapper;
        });

        renderedItems.forEach((el: HTMLElement) => listContainer.appendChild(el));
        
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
                if (document.getElementById('studentProfileScreen')?.style.display === 'block') renderCalendar(currentCalendarDate);
                loadTrainingScreen(type); 
            });
        });
        if (typeof feather !== 'undefined') feather.replace();
    }
    showScreen('trainingScreen');
}

// --- NEW: FINISH WORKOUT LOGIC (SELFIE) ---
(window as any).openFinishWorkoutModal = (type: string, extraData: any = null) => {
    // Stop timers but keep variables until save
    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    if (trackingTimerInterval) clearInterval(trackingTimerInterval);
    if (trackingWatchId) navigator.geolocation.clearWatch(trackingWatchId);

    // Capture Data
    const duration = extraData ? extraData.duration : (document.getElementById('workout-timer')?.textContent || "00:00:00");
    tempWorkoutData = {
        type: type === 'Corrida' ? 'Corrida' : `Treino ${type}`,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        duration: duration,
        ...extraData // merges distance/pace if available
    };
    tempWorkoutImage = null; // Reset image

    // UI Updates
    const modal = document.getElementById('finishWorkoutModal');
    const summary = document.getElementById('finish-modal-summary');
    const imgPreview = document.getElementById('finish-photo-preview') as HTMLImageElement;
    const placeholder = document.getElementById('finish-photo-placeholder');
    const input = document.getElementById('workout-photo-input') as HTMLInputElement;

    if (summary) {
        summary.innerHTML = `
            <div class="text-center mb-1">
                <p class="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Tempo Total</p>
                <p class="text-5xl font-black text-white font-mono tracking-tight my-2">${tempWorkoutData.duration}</p>
                ${tempWorkoutData.distance ? `<div class="inline-block bg-gray-900 px-3 py-1 rounded-full border border-gray-700"><p class="text-orange-500 font-bold text-sm">🏁 ${tempWorkoutData.distance}</p></div>` : ''}
            </div>
        `;
    }

    if (input) input.value = '';
    if (imgPreview) {
        imgPreview.src = '';
        imgPreview.classList.add('hidden');
    }
    if (placeholder) placeholder.classList.remove('hidden');

    modal?.classList.remove('hidden');
};

// Image Compression Logic
(window as any).handlePhotoSelect = (event: any) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = 800; // Resize to max 800px width
                
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG 0.6 quality
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                tempWorkoutImage = compressedBase64;
                
                // Update Preview
                const imgPreview = document.getElementById('finish-photo-preview') as HTMLImageElement;
                const placeholder = document.getElementById('finish-photo-placeholder');
                if(imgPreview) {
                    imgPreview.src = compressedBase64;
                    imgPreview.classList.remove('hidden');
                }
                if(placeholder) placeholder.classList.add('hidden');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};

(window as any).saveFinishedWorkout = () => {
    const db = getDatabase();
    const email = getCurrentUser();
    if (!email) return;

    if (!db.completedWorkouts[email]) db.completedWorkouts[email] = [];
    
    // Add photo if taken
    const finalRecord = {
        ...tempWorkoutData,
        photo: tempWorkoutImage
    };
    
    db.completedWorkouts[email].push(finalRecord);
    saveDatabase(db);
    
    // Close Modal
    document.getElementById('finishWorkoutModal')?.classList.add('hidden');
    
    // Go home
    renderTrainingHistory(email);
    showScreen('studentProfileScreen');
};


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
                            <div class="flex items-start gap-3"><div class="w-6 flex justify-center mt-0.5"><i class="fas fa-fire-alt text-yellow-500 text-sm"></i></div><div><p class="text-xs font-bold text-gray-300 uppercase tracking-wide">Aquecimento</p><p class="text-sm text-gray-200 leading-snug">${w.aquecimento || 'Consultar descrição'}</p></div></div>
                            <div class="flex items-start gap-3 relative"><div class="absolute left-3 top-0 bottom-0 w-px bg-gray-700 -z-10"></div><div class="w-6 flex justify-center mt-0.5"><i class="fas fa-running text-orange-500 text-lg animate-pulse"></i></div><div class="bg-gray-700/50 p-2 rounded-lg border border-gray-600 w-full"><p class="text-xs font-bold text-orange-400 uppercase tracking-wide mb-1">Principal</p><p class="text-sm font-medium text-white leading-snug">${w.principal || w.description}</p></div></div>
                            <div class="flex items-start gap-3"><div class="w-6 flex justify-center mt-0.5"><i class="fas fa-snowflake text-blue-400 text-sm"></i></div><div><p class="text-xs font-bold text-gray-300 uppercase tracking-wide">Desaquecimento</p><p class="text-sm text-gray-200 leading-snug">${w.desaquecimento || 'Consultar descrição'}</p></div></div>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    }
    showScreen('runningScreen');
}

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
                 const card = document.createElement('div');
                 card.className = 'bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-xl relative';
                 card.innerHTML = `
                    <div class="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-blob"></div>
                    <div class="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-600 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-blob animation-delay-2000"></div>
                    <div class="flex">
                        <div class="w-24 bg-gradient-to-b from-gray-900 to-gray-800 border-r-2 border-dashed border-gray-600 flex flex-col items-center justify-center p-2 relative">
                            <div class="absolute -top-3 -right-3 w-6 h-6 bg-[#000000] rounded-full z-10"></div>
                            <div class="absolute -bottom-3 -right-3 w-6 h-6 bg-[#000000] rounded-full z-10"></div>
                            <span class="text-xs text-gray-400 font-bold tracking-widest">${year}</span>
                            <span class="text-3xl font-black text-white leading-none mt-1">${day}</span>
                            <span class="text-sm font-bold text-blue-400 uppercase tracking-wider mt-1">${month}</span>
                        </div>
                        <div class="flex-1 p-4 relative z-10 flex flex-col justify-center">
                            <h3 class="font-bold text-white text-lg leading-tight mb-2">${r.name}</h3>
                            <div class="flex flex-col gap-1.5">
                                <div class="flex items-center gap-2 text-xs text-gray-300"><div class="w-5 flex justify-center"><i class="fas fa-map-marker-alt text-red-500"></i></div><span>${r.location}</span></div>
                                <div class="flex items-center gap-2 text-xs text-gray-300"><div class="w-5 flex justify-center"><i class="fas fa-flag-checkered text-green-500"></i></div><span class="font-bold text-white">${r.distance}</span></div>
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

    trackingPath = [];
    trackingElapsedTime = 0;
    trackingDistance = 0;
    isTrackingPaused = false;
    if (trackingWatchId) navigator.geolocation.clearWatch(trackingWatchId);
    if (trackingTimerInterval) clearInterval(trackingTimerInterval);
    
    document.getElementById('tracking-distance')!.textContent = "0.00 km";
    document.getElementById('tracking-time')!.textContent = "00:00:00";
    document.getElementById('tracking-pace')!.textContent = "--:-- /km";
    
    document.getElementById('start-tracking-btn')!.classList.remove('hidden');
    document.getElementById('pause-tracking-btn')!.classList.add('hidden');
    document.getElementById('stop-tracking-btn')!.classList.add('hidden');

    showScreen('outdoorTrackingScreen');
    setTimeout(() => {
        if (!map) {
            map = L.map('map').setView([-22.9068, -43.1729], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
            mapPolyline = L.polyline([], { color: 'red', weight: 4 }).addTo(map);
        } else {
            map.invalidateSize();
            mapPolyline.setLatLngs([]);
        }
        map.locate({setView: true, maxZoom: 16});
    }, 300);
}

function startOutdoorTracking() {
    if (!isTrackingPaused) trackingStartTime = Date.now();
    else trackingStartTime = Date.now() - trackingElapsedTime;
    isTrackingPaused = false;

    document.getElementById('start-tracking-btn')!.classList.add('hidden');
    document.getElementById('pause-tracking-btn')!.classList.remove('hidden');
    document.getElementById('stop-tracking-btn')!.classList.remove('hidden');

    trackingTimerInterval = window.setInterval(() => {
        trackingElapsedTime = Date.now() - trackingStartTime;
        document.getElementById('tracking-time')!.textContent = formatDuration(trackingElapsedTime);
        document.getElementById('tracking-pace')!.textContent = calculatePace(trackingElapsedTime, trackingDistance) + " /km";
    }, 1000);

    trackingWatchId = navigator.geolocation.watchPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        const latLng = [latitude, longitude];
        if (trackingPath.length > 0) {
            const lastPoint = trackingPath[trackingPath.length - 1];
            const dist = map.distance(lastPoint, latLng); 
            if (dist > 5) {
                 trackingDistance += dist;
                 trackingPath.push(latLng);
                 mapPolyline.setLatLngs(trackingPath);
                 map.setView(latLng);
                 document.getElementById('tracking-distance')!.textContent = (trackingDistance / 1000).toFixed(2) + " km";
            }
        } else {
            trackingPath.push(latLng);
            map.setView(latLng, 16);
        }
    }, (err) => { console.error("GPS Error", err); }, { enableHighAccuracy: true });
}

function pauseOutdoorTracking() {
    isTrackingPaused = true;
    if (trackingTimerInterval) clearInterval(trackingTimerInterval);
    if (trackingWatchId) navigator.geolocation.clearWatch(trackingWatchId);
    document.getElementById('pause-tracking-btn')!.classList.add('hidden');
    document.getElementById('start-tracking-btn')!.classList.remove('hidden');
}

function stopOutdoorTracking() {
    // Instead of alerting, open the finish modal
    const extraData = {
        distance: (trackingDistance / 1000).toFixed(2) + ' km',
        duration: formatDuration(trackingElapsedTime),
        pace: calculatePace(trackingElapsedTime, trackingDistance) + " /km"
    };
    (window as any).openFinishWorkoutModal(currentActivityType, extraData);
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
        if (item.status === 'Não Começou') item.status = 'Em Andamento';
        else if (item.status === 'Em Andamento') item.status = 'Concluído';
        else item.status = 'Não Começou';
        saveDatabase(db);
        loadPeriodizationScreen(); 
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
                <div class="text-gray-200 text-sm leading-relaxed border-t border-gray-600 pt-3 mt-2">${item.detalhes || 'Sem detalhes disponíveis'}</div>
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
            const sortedPeriodization = [...periodizacao].sort((a, b) => a.id - b.id);
            sortedPeriodization.forEach((p: any, index: number) => {
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
                if (!isLocked) card.onclick = () => openPeriodizationModal(p.id);
                let actionButton = isLocked ? `
                        <div class="text-xs font-bold px-3 py-1.5 rounded-full border bg-gray-800 text-gray-500 border-gray-600 flex items-center gap-1.5 shadow-md z-10">
                            <i data-feather="lock" class="w-3.5 h-3.5"></i> Bloqueado
                        </div>
                    ` : `
                        <button onclick="event.stopPropagation(); togglePeriodizationStatus(${p.id})" class="text-xs font-bold px-3 py-1.5 rounded-full border ${statusBg} ${statusColor} flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md z-10">
                            <i data-feather="${statusIcon}" class="w-3.5 h-3.5"></i> ${p.status}
                        </button>
                    `;
                card.innerHTML = `
                    <div class="absolute top-0 left-0 w-1.5 h-full ${borderColor}"></div>
                    <div class="flex justify-between items-start mb-2 pl-3">
                        <h3 class="text-lg font-bold text-white">${p.fase}</h3>
                        ${actionButton}
                    </div>
                    <div class="pl-3 space-y-2">
                        <div class="flex items-center gap-2 text-sm text-gray-300"><i data-feather="calendar" class="w-4 h-4 text-gray-500"></i><span>${p.inicio} - ${p.fim}</span></div>
                        <div class="flex items-center gap-2 text-sm text-gray-300"><i data-feather="target" class="w-4 h-4 text-red-500"></i><span class="font-medium text-gray-200">Objetivo:</span> ${p.objetivo}</div>
                         <div class="flex items-center gap-4 mt-2 pt-2 border-t border-gray-700/50">
                            <div class="flex items-center gap-1.5"><span class="text-xs text-gray-500 uppercase font-bold">Séries</span><span class="text-sm font-bold text-white">${p.series || '-'}</span></div>
                            <div class="flex items-center gap-1.5"><span class="text-xs text-gray-500 uppercase font-bold">Reps</span><span class="text-sm font-bold text-white">${p.repeticoes || '-'}</span></div>
                        </div>
                        ${!isLocked ? `<div class="flex items-center gap-2 text-xs text-blue-400 mt-2"><i data-feather="info" class="w-3 h-3"></i><span>Toque para ver detalhes</span></div>` : ''}
                    </div>
                `;
                container.appendChild(card);
            });
            if (typeof feather !== 'undefined') feather.replace();
        }
    }
    showScreen('periodizationScreen');
}

// --- WEATHER ---
async function fetchWeather() {
    const display = document.getElementById('weather-display');
    if (!display) return;

    try {
        // Rio de Janeiro coordinates
        const lat = -22.9068;
        const lng = -43.1729;
        
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=America%2FSao_Paulo`);
        if (!response.ok) throw new Error('Weather fetch failed');
        
        const data = await response.json();
        const temp = Math.round(data.current.temperature_2m);
        const code = data.current.weather_code;
        
        // WMO Weather interpretation codes (simplified)
        let icon = 'sun';
        let color = 'text-yellow-400';
        
        if (code >= 1 && code <= 3) { icon = 'cloud'; color = 'text-gray-400'; }
        else if (code >= 51) { icon = 'cloud-rain'; color = 'text-blue-400'; }
        else if (code >= 95) { icon = 'cloud-lightning'; color = 'text-purple-400'; }

        display.innerHTML = `
            <div class="flex flex-col items-end">
                <div class="flex items-center gap-1.5">
                    <i data-feather="${icon}" class="${color} w-5 h-5"></i>
                    <span class="text-2xl font-black text-white leading-none">${temp}°</span>
                </div>
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rio de Janeiro</span>
            </div>
        `;
        if (typeof feather !== 'undefined') feather.replace();
        
    } catch (e) {
        console.warn('Weather widget error:', e);
        display.innerHTML = '';
    }
}

function loadStudentProfile(email: string) {
    const db = getDatabase();
    const user = db.users.find((u: any) => u.email === email);
    if (!user) return; 

    const profileInfo = document.getElementById('student-profile-info');
    if (profileInfo) {
        profileInfo.innerHTML = `
            <img src="${user.photo}" class="w-14 h-14 rounded-full border-2 border-red-600 object-cover">
            <div>
                <h2 class="text-lg font-bold text-white">Olá, ${user.name.split(' ')[0]}</h2>
                <p class="text-xs text-gray-400">Aluno(a) ABFIT</p>
            </div>
            <div id="weather-display" class="ml-auto"></div>
        `;
        profileInfo.classList.remove('hidden');
    }

    const btnContainer = document.getElementById('student-profile-buttons');
    if (btnContainer) {
        btnContainer.className = "grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 mt-4";
        btnContainer.innerHTML = `
            <button onclick="loadTrainingScreen('A')" class="metal-btn-highlight p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28"><i class="fas fa-dumbbell text-2xl"></i><span class="text-sm font-bold">TREINO A</span></button>
            <button onclick="loadTrainingScreen('B')" class="metal-btn-highlight p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28"><i class="fas fa-dumbbell text-2xl"></i><span class="text-sm font-bold">TREINO B</span></button>
            <button onclick="loadRunningScreen()" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28"><i class="fas fa-running text-orange-500 text-2xl"></i><span class="text-sm font-bold">CORRIDA</span></button>
            <button onclick="loadPeriodizationScreen()" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28"><i class="fas fa-calendar-alt text-yellow-500 text-2xl"></i><span class="text-sm font-bold">PERIODIZAÇÃO</span></button>
            <button onclick="showScreen('outdoorSelectionScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28"><i class="fas fa-map-marked-alt text-green-500 text-2xl"></i><span class="text-sm font-bold">OUTDOOR</span></button>
            <button onclick="loadRaceCalendarScreen()" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28"><i class="fas fa-flag-checkered text-blue-500 text-2xl"></i><span class="text-sm font-bold">PROVAS</span></button>
             <button onclick="showScreen('physioAssessmentScreen')" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28"><i class="fas fa-clipboard-user text-red-400 text-2xl"></i><span class="text-sm font-bold">AVALIAÇÃO</span></button>
             <button onclick="loadAIAnalysisScreen()" class="metal-btn p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform h-28"><i class="fas fa-brain text-teal-400 text-2xl"></i><span class="text-sm font-bold">ANÁLISE IA</span></button>
        `;
    }
    renderCalendar(currentCalendarDate);
    fetchWeather();
    showScreen('studentProfileScreen');
}

// --- BOOTSTRAP (INITIALIZATION) ---
document.addEventListener('DOMContentLoaded', () => {
    
    const appContainer = document.getElementById('appContainer');
    const user = getCurrentUser();

    // 2. Initial Routing Logic
    let startScreen = 'loginScreen';
    let emailToLoad = null;

    initializeDatabase();

    if (user) {
        const db = getDatabase();
        // Verify user exists
        if (db.users.find((u: any) => u.email.toLowerCase() === user.toLowerCase())) {
            startScreen = 'studentProfileScreen';
            emailToLoad = user;
        } else {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
    }

    // 3. Prepare Initial Screen (Immediately visible)
    if (appContainer) {
        appContainer.classList.remove('init-hidden');
    }
    
    showScreen(startScreen);
    
    if (startScreen === 'studentProfileScreen' && emailToLoad) {
        loadStudentProfile(emailToLoad);
    }

    // 4. Login Form Setup
    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email') as HTMLInputElement;
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = loginEmailInput.value.trim().toLowerCase();
            
            if (!email) {
                if (loginError) loginError.textContent = "Digite seu e-mail.";
                return;
            }

            // Feedback
            if (loginBtn) {
                const originalText = loginBtn.innerText;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
                
                setTimeout(() => {
                    const db = getDatabase();
                    const userExists = db.users.find((u: any) => u.email.toLowerCase() === email);

                    if (userExists) {
                        setCurrentUser(email);
                        loadStudentProfile(email);
                        showScreen('studentProfileScreen');
                    } else {
                        if (loginError) loginError.textContent = "E-mail não encontrado.";
                        loginBtn.innerText = originalText;
                    }
                }, 800); // Small UX delay
            }
        });
    }

    // Init icons
    if (typeof feather !== 'undefined') feather.replace();
    
    // Setup listeners for other UI elements (Modals, Nav, etc)
    setupEventListeners();
    
    // Signal loaded (for any listeners waiting)
    (window as any).isAppLoaded = true;
});

function setupEventListeners() {
    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('button');
        
        if (btn && btn.getAttribute('data-target')) {
            const targetScreen = btn.getAttribute('data-target');
            if (targetScreen) {
                if (targetScreen === 'studentProfileScreen') renderCalendar(currentCalendarDate);
                showScreen(targetScreen);
            }
        }
        if (btn && btn.id === 'logout-btn') {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            location.reload();
        }
    });

    // PWA Logic (simplified)
    const banner = document.getElementById('pwa-install-banner');
    if (banner && !window.matchMedia('(display-mode: standalone)').matches) {
        setTimeout(() => banner.classList.remove('hidden'), 4500);
        document.getElementById('pwa-close-btn')?.addEventListener('click', () => banner.classList.add('hidden'));
    }

    if (typeof feather !== 'undefined') feather.replace();

    document.getElementById('prev-month-btn')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar(currentCalendarDate);
    });

    document.getElementById('next-month-btn')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar(currentCalendarDate);
    });

    document.querySelectorAll('.outdoor-back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if(target) showScreen(target);
        });
    });

    document.querySelectorAll('.outdoor-activity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const activity = btn.getAttribute('data-activity');
            if(activity) loadOutdoorTrackingScreen(activity);
        });
    });

    document.getElementById('start-tracking-btn')?.addEventListener('click', startOutdoorTracking);
    document.getElementById('pause-tracking-btn')?.addEventListener('click', pauseOutdoorTracking);
    document.getElementById('stop-tracking-btn')?.addEventListener('click', stopOutdoorTracking);
    
    (window as any).openExerciseModal = (idx: number, type: string) => {
        const db = getDatabase();
        const email = getCurrentUser();
        const exercise = db.trainingPlans[`treinos${type}`][email][idx];
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

    document.getElementById('closePeriodizationModalBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('periodizationDetailModal');
        const content = document.getElementById('periodization-modal-content');
        if (content) {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
        }
        setTimeout(() => modal?.classList.add('hidden'), 200);
    });
}

(window as any).loadTrainingScreen = loadTrainingScreen;
(window as any).loadPeriodizationScreen = loadPeriodizationScreen;
(window as any).togglePeriodizationStatus = togglePeriodizationStatus;
(window as any).openPeriodizationModal = openPeriodizationModal;
(window as any).showScreen = showScreen;
(window as any).loadRunningScreen = loadRunningScreen;
(window as any).loadRaceCalendarScreen = loadRaceCalendarScreen;
(window as any).loadStudentProfile = loadStudentProfile;
(window as any).loadAIAnalysisScreen = loadAIAnalysisScreen;
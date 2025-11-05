// Estado da aplicação
let currentAlunoId = null;
let alunos = [];

// Elementos da UI
const tabProfessor = document.getElementById('tab-professor');
const tabAluno = document.getElementById('tab-aluno');
const viewProfessor = document.getElementById('view-professor');
const viewAluno = document.getElementById('view-aluno');
const professorDashboard = document.getElementById('professor-dashboard');
const formAvaliacao = document.getElementById('form-avaliacao');
const viewAlunoData = document.getElementById('view-aluno-data');
const loader = document.getElementById('loader');
const listaAlunosEl = document.getElementById('lista-alunos');
const noAlunosMessage = document.getElementById('no-alunos-message');

// --- LÓGICA DE ARMAZENAMENTO LOCAL (localStorage) ---
const DB_KEY = 'physiapp_alunos';

const getAlunosFromStorage = () => {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
};

const saveAlunosToStorage = (alunosData) => {
    localStorage.setItem(DB_KEY, JSON.stringify(alunosData));
};

// Funções de navegação e UI
const showView = (view) => {
    professorDashboard.classList.add('hidden');
    formAvaliacao.classList.add('hidden');
    viewAlunoData.classList.add('hidden');
    document.getElementById(view).classList.remove('hidden');
};

const toggleTabs = (activeTab) => {
    if (activeTab === 'professor') {
        tabProfessor.classList.add('tab-active');
        tabAluno.classList.remove('tab-active');
        viewProfessor.classList.remove('hidden');
        viewAluno.classList.add('hidden');
        showView('professor-dashboard');
    } else {
        tabProfessor.classList.remove('tab-active');
        tabAluno.classList.add('tab-active');
        viewProfessor.classList.add('hidden');
        viewAluno.classList.remove('hidden');
    }
};

// Modal de Adicionar Aluno
const modal = document.getElementById('modal-add-aluno');
const modalContent = document.getElementById('modal-content');
const openModal = () => {
    modal.classList.remove('hidden');
    setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
};
const closeModal = () => {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('form-novo-aluno').reset();
    }, 200);
};

// Lógica de Cálculo
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
        densidadeCorporal = 1.10938 - (0.0008267 * somaDobras) + (0.0000016 * (somaDobras**2)) - (0.0002574 * idade);
    } else { // Feminino
        densidadeCorporal = 1.0994921 - (0.0009929 * somaDobras) + (0.0000023 * (somaDobras**2)) - (0.0001392 * idade);
    }

    const percentualGordura = densidadeCorporal > 0 ? ((4.95 / densidadeCorporal) - 4.5) * 100 : 0;
    const pesoGordo = peso * (percentualGordura / 100);
    const pesoMagro = peso - pesoGordo;
    const rcq = avaliacao.p_quadril > 0 && avaliacao.p_cintura > 0 ? (avaliacao.p_cintura / avaliacao.p_quadril) : 0;

    return {
        somaDobras: somaDobras.toFixed(1),
        densidadeCorporal: densidadeCorporal.toFixed(4),
        percentualGordura: percentualGordura.toFixed(1),
        pesoGordo: pesoGordo.toFixed(1),
        pesoMagro: pesoMagro.toFixed(1),
        imc: imc.toFixed(1),
        rcq: rcq.toFixed(2)
    };
};

// Funções de renderização
const renderAlunoList = (alunosData) => {
    alunos = alunosData;
    loader.classList.add('hidden');

    if (alunosData.length === 0) {
        noAlunosMessage.classList.remove('hidden');
        listaAlunosEl.classList.add('hidden');
    } else {
        noAlunosMessage.classList.add('hidden');
        listaAlunosEl.classList.remove('hidden');
        listaAlunosEl.innerHTML = '';
        alunosData.forEach(aluno => {
            const idade = aluno.nascimento ? new Date().getFullYear() - new Date(aluno.nascimento).getFullYear() : 'N/A';
            const card = `
                <div class="bg-white rounded-xl shadow-md p-6 flex flex-col justify-between transform hover:-translate-y-1 transition-transform">
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">${aluno.nome}</h3>
                        <p class="text-gray-600 text-sm">Idade: ${idade} anos | Sexo: ${aluno.sexo || 'N/A'}</p>
                    </div>
                    <div class="mt-4 flex space-x-2">
                        <button data-id="${aluno.id}" class="btn-nova-avaliacao flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-3 rounded-lg"><i class="fas fa-plus mr-1"></i> Nova</button>
                        <button data-id="${aluno.id}" class="btn-ver-dados flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-bold py-2 px-3 rounded-lg"><i class="fas fa-chart-line mr-1"></i> Ver Dados</button>
                        <button data-id="${aluno.id}" class="btn-deletar-aluno bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-3 rounded-lg"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            listaAlunosEl.innerHTML += card;
        });
    }
    renderAlunoSelector(alunosData);
};

const renderAlunoSelector = (alunosData) => {
    const selector = document.getElementById('aluno-selector');
    selector.innerHTML = '<option value="">Selecione seu nome...</option>';
    alunosData.forEach(aluno => {
        selector.innerHTML += `<option value="${aluno.id}">${aluno.nome}</option>`;
    });
}

const renderAlunoDataView = (alunoId) => {
    const aluno = alunos.find(a => a.id === alunoId);
    const avaliacoes = (aluno.avaliacoes || []).sort((a, b) => new Date(b.data) - new Date(a.data));

    let content = `
        <div class="flex items-center mb-6">
             <button id="btn-back-to-dashboard-from-data" class="mr-4 bg-gray-200 hover:bg-gray-300 p-2 rounded-full"><i class="fas fa-arrow-left"></i></button>
             <h2 class="text-2xl font-semibold text-gray-900">Histórico de <span class="text-blue-500">${aluno.nome}</span></h2>
        </div>
    `;
    
    if (avaliacoes.length > 0) {
        const ultimaAvaliacao = avaliacoes[0];
        const resultados = calculateBodyComposition(ultimaAvaliacao, aluno);

        const createDataPoint = (label, value, unit = '') => {
            const displayValue = (value !== null && value !== undefined && value !== 0 && !isNaN(value)) ? `${value}${unit}` : 'N/A';
            return `
                <div class="bg-gray-200/60 p-3 rounded-lg">
                    <p class="text-sm text-gray-600">${label}</p>
                    <p class="text-lg font-bold text-gray-900">${displayValue}</p>
                </div>
            `;
        };

        content += `
            <div class="bg-white p-6 rounded-xl shadow-lg mb-8">
                <h3 class="text-xl font-bold mb-4 text-gray-900">Resultados da Última Avaliação (${new Date(ultimaAvaliacao.data + 'T03:00:00Z').toLocaleDateString('pt-BR')})</h3>

                <!-- Composição Corporal -->
                <div class="mb-6">
                    <h4 class="font-bold text-lg mb-3 text-blue-600 border-b border-gray-200 pb-2">Composição Corporal</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        ${createDataPoint('Peso Corporal', ultimaAvaliacao.peso, ' kg')}
                        ${createDataPoint('Altura', ultimaAvaliacao.altura, ' cm')}
                        ${createDataPoint('IMC', resultados.imc)}
                        ${createDataPoint('% Gordura', resultados.percentualGordura, '%')}
                        ${createDataPoint('Peso Gordo', resultados.pesoGordo, ' kg')}
                        ${createDataPoint('Peso Magro', resultados.pesoMagro, ' kg')}
                        ${createDataPoint('Dens. Corporal', resultados.densidadeCorporal)}
                        ${createDataPoint('Soma 3 Dobras', resultados.somaDobras, ' mm')}
                        ${createDataPoint('RCQ', resultados.rcq)}
                    </div>
                </div>

                <!-- Perímetros -->
                <div class="mb-6">
                    <h4 class="font-bold text-lg mb-3 text-blue-600 border-b border-gray-200 pb-2">Perímetros (cm)</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        ${createDataPoint('Tórax', ultimaAvaliacao.p_torax)}
                        ${createDataPoint('Abdômen', ultimaAvaliacao.p_abdomen)}
                        ${createDataPoint('Cintura', ultimaAvaliacao.p_cintura)}
                        ${createDataPoint('Quadril', ultimaAvaliacao.p_quadril)}
                        ${createDataPoint('Braço Direito', ultimaAvaliacao.p_braco_d)}
                        ${createDataPoint('Braço Esquerdo', ultimaAvaliacao.p_braco_e)}
                        ${createDataPoint('Antebraço Direito', ultimaAvaliacao.p_antebraco_d)}
                        ${createDataPoint('Antebraço Esquerdo', ultimaAvaliacao.p_antebraco_e)}
                        ${createDataPoint('Coxa Proximal D', ultimaAvaliacao.p_coxa_proximal_d)}
                        ${createDataPoint('Coxa Proximal E', ultimaAvaliacao.p_coxa_proximal_e)}
                        ${createDataPoint('Coxa Medial D', ultimaAvaliacao.p_coxa_d)}
                        ${createDataPoint('Coxa Medial E', ultimaAvaliacao.p_coxa_e)}
                        ${createDataPoint('Coxa Distal D', ultimaAvaliacao.p_coxa_distal_d)}
                        ${createDataPoint('Coxa Distal E', ultimaAvaliacao.p_coxa_distal_e)}
                        ${createDataPoint('Panturrilha Direita', ultimaAvaliacao.p_panturrilha_d)}
                        ${createDataPoint('Panturrilha Esquerda', ultimaAvaliacao.p_panturrilha_e)}
                    </div>
                </div>

                <!-- Dobras Cutâneas -->
                <div class="mb-6">
                    <h4 class="font-bold text-lg mb-3 text-blue-600 border-b border-gray-200 pb-2">Dobras Cutâneas (mm)</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        ${aluno.sexo === 'Masculino' ? `
                            ${createDataPoint('Peitoral', ultimaAvaliacao.dc_peitoral)}
                            ${createDataPoint('Abdominal', ultimaAvaliacao.dc_abdominal)}
                            ${createDataPoint('Coxa', ultimaAvaliacao.dc_coxa)}
                        ` : `
                            ${createDataPoint('Tricipital', ultimaAvaliacao.dc_tricipital)}
                            ${createDataPoint('Suprailíaca', ultimaAvaliacao.dc_suprailiaca)}
                            ${createDataPoint('Coxa', ultimaAvaliacao.dc_coxa)}
                        `}
                    </div>
                </div>

                <!-- Bioimpedância -->
                <div>
                    <h4 class="font-bold text-lg mb-3 text-blue-600 border-b border-gray-200 pb-2">Bioimpedância</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        ${createDataPoint('Água Corporal', ultimaAvaliacao.bio_agua_corporal, '%')}
                        ${createDataPoint('Proteína', ultimaAvaliacao.bio_proteina, '%')}
                        ${createDataPoint('Minerais', ultimaAvaliacao.bio_minerais, '%')}
                        ${createDataPoint('Massa de Gordura', ultimaAvaliacao.bio_massa_gordura, ' kg')}
                        ${createDataPoint('Massa Magra', ultimaAvaliacao.bio_massa_magra, ' kg')}
                        ${createDataPoint('TMB', ultimaAvaliacao.bio_tmb, ' kcal')}
                        ${createDataPoint('Gordura Visceral', ultimaAvaliacao.bio_gordura_visceral)}
                        ${createDataPoint('Grau de Obesidade', ultimaAvaliacao.bio_grau_obesidade, '%')}
                    </div>
                </div>

            </div>
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <h3 class="text-xl font-bold p-6 text-gray-900">Histórico Completo</h3>
                <div class="overflow-x-auto"><table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                            <th class="p-4 font-medium">Data</th><th class="p-4 font-medium">Peso</th><th class="p-4 font-medium">% Gordura</th><th class="p-4 font-medium">Peso Magro</th><th class="p-4 font-medium">IMC</th><th class="p-4 font-medium">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        avaliacoes.forEach(av => {
            const res = calculateBodyComposition(av, aluno);
            content += `
                <tr class="border-b border-gray-200 hover:bg-gray-100">
                    <td class="p-4 whitespace-nowrap">${new Date(av.data + 'T03:00:00Z').toLocaleDateString('pt-BR')}</td>
                    <td class="p-4">${av.peso} kg</td>
                    <td class="p-4">${res.percentualGordura || '-'}%</td>
                    <td class="p-4">${res.pesoMagro || '-'} kg</td>
                    <td class="p-4">${res.imc || '-'}</td>
                    <td class="p-4"><button data-aluno-id="${alunoId}" data-avaliacao-id="${av.id}" class="btn-deletar-avaliacao text-red-500 hover:text-red-400 text-sm"><i class="fas fa-trash"></i> Deletar</button></td>
                </tr>`;
        });
        content += '</tbody></table></div></div>';
    } else {
         content += `<div class="text-center p-8 bg-white rounded-lg shadow-md"><i class="fas fa-file-excel text-4xl text-gray-400 mb-4"></i><h3 class="text-xl font-semibold text-gray-800">Nenhuma avaliação encontrada</h3><p class="text-gray-600">Realize a primeira avaliação para este aluno.</p></div>`;
    }
    
    viewAlunoData.innerHTML = content;
    showView('view-aluno-data');
};

const renderAlunoDashboard = (alunoId) => {
    const aluno = alunos.find(a => a.id === alunoId);
    const avaliacoes = (aluno.avaliacoes || []).sort((a, b) => new Date(b.data) - new Date(a.data));
    const dashboardEl = document.getElementById('aluno-dashboard');

    if(avaliacoes.length === 0) {
         dashboardEl.innerHTML = `<p class="text-gray-600">Nenhuma avaliação encontrada. Fale com seu professor.</p>`;
         dashboardEl.classList.remove('hidden');
         return;
    }

    const ultimaAvaliacao = avaliacoes[0];
    const resultados = calculateBodyComposition(ultimaAvaliacao, aluno);
    
    const createDataPoint = (label, value, unit = '') => {
        const displayValue = (value !== null && value !== undefined && value !== 0 && !isNaN(value)) ? `${value}${unit}` : 'N/A';
        return `
            <div class="bg-gray-200/60 p-3 rounded-lg">
                <p class="text-sm text-gray-600">${label}</p>
                <p class="text-lg font-bold text-gray-900">${displayValue}</p>
            </div>
        `;
    };
    
    let content = `
        <h2 class="text-3xl font-bold mb-2 text-gray-900">Seu Painel de Progresso</h2>
        <p class="mb-8 text-gray-600">Resultados da sua última avaliação em: ${new Date(ultimaAvaliacao.data + 'T03:00:00Z').toLocaleDateString('pt-BR')}</p>
        
        <div class="bg-white p-6 rounded-xl shadow-lg">
            <!-- Composição Corporal -->
            <div class="mb-6">
                <h4 class="font-bold text-lg mb-3 text-blue-600 border-b border-gray-200 pb-2">Composição Corporal</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    ${createDataPoint('Peso Corporal', ultimaAvaliacao.peso, ' kg')}
                    ${createDataPoint('Altura', ultimaAvaliacao.altura, ' cm')}
                    ${createDataPoint('IMC', resultados.imc)}
                    ${createDataPoint('% Gordura', resultados.percentualGordura, '%')}
                    ${createDataPoint('Peso Gordo', resultados.pesoGordo, ' kg')}
                    ${createDataPoint('Peso Magro', resultados.pesoMagro, ' kg')}
                    ${createDataPoint('Dens. Corporal', resultados.densidadeCorporal)}
                    ${createDataPoint('Soma 3 Dobras', resultados.somaDobras, ' mm')}
                    ${createDataPoint('RCQ', resultados.rcq)}
                </div>
            </div>

            <!-- Perímetros -->
            <div class="mb-6">
                <h4 class="font-bold text-lg mb-3 text-blue-600 border-b border-gray-200 pb-2">Perímetros (cm)</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    ${createDataPoint('Tórax', ultimaAvaliacao.p_torax)}
                    ${createDataPoint('Abdômen', ultimaAvaliacao.p_abdomen)}
                    ${createDataPoint('Cintura', ultimaAvaliacao.p_cintura)}
                    ${createDataPoint('Quadril', ultimaAvaliacao.p_quadril)}
                    ${createDataPoint('Braço Direito', ultimaAvaliacao.p_braco_d)}
                    ${createDataPoint('Braço Esquerdo', ultimaAvaliacao.p_braco_e)}
                    ${createDataPoint('Antebraço Direito', ultimaAvaliacao.p_antebraco_d)}
                    ${createDataPoint('Antebraço Esquerdo', ultimaAvaliacao.p_antebraco_e)}
                    ${createDataPoint('Coxa Proximal D', ultimaAvaliacao.p_coxa_proximal_d)}
                    ${createDataPoint('Coxa Proximal E', ultimaAvaliacao.p_coxa_proximal_e)}
                    ${createDataPoint('Coxa Medial D', ultimaAvaliacao.p_coxa_d)}
                    ${createDataPoint('Coxa Medial E', ultimaAvaliacao.p_coxa_e)}
                    ${createDataPoint('Coxa Distal D', ultimaAvaliacao.p_coxa_distal_d)}
                    ${createDataPoint('Coxa Distal E', ultimaAvaliacao.p_coxa_distal_e)}
                    ${createDataPoint('Panturrilha Direita', ultimaAvaliacao.p_panturrilha_d)}
                    ${createDataPoint('Panturrilha Esquerda', ultimaAvaliacao.p_panturrilha_e)}
                </div>
            </div>

            <!-- Dobras Cutâneas -->
            <div class="mb-6">
                <h4 class="font-bold text-lg mb-3 text-blue-600 border-b border-gray-200 pb-2">Dobras Cutâneas (mm)</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    ${aluno.sexo === 'Masculino' ? `
                        ${createDataPoint('Peitoral', ultimaAvaliacao.dc_peitoral)}
                        ${createDataPoint('Abdominal', ultimaAvaliacao.dc_abdominal)}
                        ${createDataPoint('Coxa', ultimaAvaliacao.dc_coxa)}
                    ` : `
                        ${createDataPoint('Tricipital', ultimaAvaliacao.dc_tricipital)}
                        ${createDataPoint('Suprailíaca', ultimaAvaliacao.dc_suprailiaca)}
                        ${createDataPoint('Coxa', ultimaAvaliacao.dc_coxa)}
                    `}
                </div>
            </div>

            <!-- Bioimpedância -->
            <div>
                <h4 class="font-bold text-lg mb-3 text-blue-600 border-b border-gray-200 pb-2">Bioimpedância</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    ${createDataPoint('Água Corporal', ultimaAvaliacao.bio_agua_corporal, '%')}
                    ${createDataPoint('Proteína', ultimaAvaliacao.bio_proteina, '%')}
                    ${createDataPoint('Minerais', ultimaAvaliacao.bio_minerais, '%')}
                    ${createDataPoint('Massa de Gordura', ultimaAvaliacao.bio_massa_gordura, ' kg')}
                    ${createDataPoint('Massa Magra', ultimaAvaliacao.bio_massa_magra, ' kg')}
                    ${createDataPoint('TMB', ultimaAvaliacao.bio_tmb, ' kcal')}
                    ${createDataPoint('Gordura Visceral', ultimaAvaliacao.bio_gordura_visceral)}
                    ${createDataPoint('Grau de Obesidade', ultimaAvaliacao.bio_grau_obesidade, '%')}
                </div>
            </div>
        </div>
    `;

    dashboardEl.innerHTML = content;
    dashboardEl.classList.remove('hidden');
};

// CRUD
const addAluno = (nome, nascimento, sexo) => {
    const allAlunos = getAlunosFromStorage();
    const novoAluno = {
        id: crypto.randomUUID(),
        nome,
        nascimento,
        sexo,
        avaliacoes: []
    };
    allAlunos.push(novoAluno);
    saveAlunosToStorage(allAlunos);
    loadInitialData();
    closeModal();
};

const deleteAluno = (alunoId) => {
     if(confirm('Tem certeza que deseja excluir este aluno e todas as suas avaliações? Esta ação não pode ser desfeita.')) {
        let allAlunos = getAlunosFromStorage();
        allAlunos = allAlunos.filter(a => a.id !== alunoId);
        saveAlunosToStorage(allAlunos);
        loadInitialData();
        showView('professor-dashboard');
     }
};

const deleteAvaliacao = (alunoId, avaliacaoId) => {
    if(confirm('Deseja realmente excluir esta avaliação?')) {
        let allAlunos = getAlunosFromStorage();
        const alunoIndex = allAlunos.findIndex(a => a.id === alunoId);
        if (alunoIndex !== -1) {
            allAlunos[alunoIndex].avaliacoes = allAlunos[alunoIndex].avaliacoes.filter(av => av.id !== avaliacaoId);
            saveAlunosToStorage(allAlunos);
            loadInitialData();
            renderAlunoDataView(alunoId);
        }
    }
};

const addAvaliacao = (alunoId, dados) => {
    let allAlunos = getAlunosFromStorage();
    const alunoIndex = allAlunos.findIndex(a => a.id === alunoId);
    if (alunoIndex !== -1) {
        const novaAvaliacao = { ...dados, id: crypto.randomUUID() };
        if (!allAlunos[alunoIndex].avaliacoes) {
            allAlunos[alunoIndex].avaliacoes = [];
        }
        allAlunos[alunoIndex].avaliacoes.push(novaAvaliacao);
        saveAlunosToStorage(allAlunos);
        alert('Avaliação salva com sucesso!');
        document.getElementById('avaliacao-form').reset();
        loadInitialData();
        renderAlunoDataView(alunoId);
    }
};

const setupSkinfoldForm = (sexo) => {
    const fields = document.querySelectorAll('.skinfold-field-wrapper');
    fields.forEach(field => {
        if (field.dataset.gender.includes(sexo)) {
            field.style.display = 'block';
        } else {
            field.style.display = 'none';
        }
    });
};

// Event Listeners
tabProfessor.addEventListener('click', () => toggleTabs('professor'));
tabAluno.addEventListener('click', () => toggleTabs('aluno'));
document.getElementById('btn-add-aluno').addEventListener('click', openModal);
document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);

document.getElementById('form-novo-aluno').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('nome-aluno').value;
    const nascimento = document.getElementById('nascimento-aluno').value;
    const sexo = document.getElementById('sexo-aluno').value;
    addAluno(nome, nascimento, sexo);
});

document.getElementById('btn-back-to-dashboard').addEventListener('click', () => showView('professor-dashboard'));

listaAlunosEl.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    const alunoId = button.dataset.id;
    
    if (button.classList.contains('btn-nova-avaliacao')) {
        currentAlunoId = alunoId;
        const aluno = alunos.find(a => a.id === alunoId);
        document.getElementById('form-aluno-nome').textContent = aluno.nome;
        document.getElementById('data').valueAsDate = new Date();
        setupSkinfoldForm(aluno.sexo);
        showView('form-avaliacao');
    } else if (button.classList.contains('btn-ver-dados')) {
        renderAlunoDataView(alunoId);
    } else if (button.classList.contains('btn-deletar-aluno')) {
        deleteAluno(alunoId);
    }
});

document.getElementById('avaliacao-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = {};
    const fields = ['data', 'peso', 'altura', 'dc_peitoral', 'dc_abdominal', 'dc_tricipital', 'dc_suprailiaca', 'dc_coxa', 'p_torax', 'p_abdomen', 'p_cintura', 'p_quadril', 'p_braco_d', 'p_braco_e', 'p_antebraco_d', 'p_antebraco_e', 'p_coxa_proximal_d', 'p_coxa_proximal_e', 'p_coxa_d', 'p_coxa_e', 'p_coxa_distal_d', 'p_coxa_distal_e', 'p_panturrilha_d', 'p_panturrilha_e', 'bio_agua_corporal', 'bio_proteina', 'bio_minerais', 'bio_massa_gordura', 'bio_massa_magra', 'bio_tmb', 'bio_gordura_visceral', 'bio_grau_obesidade'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if(el.type === 'number') dados[id] = parseFloat(el.value) || null;
        else dados[id] = el.value;
    });
    addAvaliacao(currentAlunoId, dados);
});

viewProfessor.addEventListener('click', (e) => {
     const button = e.target.closest('button');
     if (!button) return;

     if (button.id === 'btn-back-to-dashboard-from-data') {
        showView('professor-dashboard');
     } else if (button.classList.contains('btn-deletar-avaliacao')) {
        const alunoId = button.dataset.alunoId;
        const avaliacaoId = button.dataset.avaliacaoId;
        deleteAvaliacao(alunoId, avaliacaoId);
    }
});

document.getElementById('aluno-selector').addEventListener('change', (e) => {
    const alunoId = e.target.value;
    if(alunoId) {
        document.getElementById('aluno-login-screen').classList.add('hidden');
        renderAlunoDashboard(alunoId);
    } else {
         document.getElementById('aluno-login-screen').classList.remove('hidden');
         document.getElementById('aluno-dashboard').classList.add('hidden');
    }
});

// Carga inicial de dados
const loadInitialData = () => {
    const alunosData = getAlunosFromStorage();
    renderAlunoList(alunosData);
};

// Inicia a aplicação
loadInitialData();
toggleTabs('professor');

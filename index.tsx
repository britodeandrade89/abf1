declare var loadTrainingScreen: any;

document.addEventListener('DOMContentLoaded', () => {
    const modalAddAluno = document.getElementById('modal-add-aluno');
    const modalContentAluno = document.getElementById('modal-content');

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

    // --- PWA INSTALLATION LOGIC ---
    function setupPwa() {
        const banner = document.getElementById('pwa-install-banner');
        const installBtn = document.getElementById('pwa-install-btn');
        const closeBtn = document.getElementById('pwa-close-btn');
        let deferredPrompt: any = null;

        if (!banner || !installBtn || !closeBtn) return;

        // Check if app is already installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isStandalone) return; // Don't show if already installed

        // Android / Desktop Logic
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            // Show banner after a short delay to match splash screen fade out
            setTimeout(() => {
                 banner.classList.remove('hidden');
                 banner.classList.remove('translate-y-0'); // Ensure it's visible
            }, 3500);
        });

        // iOS Detection (Show banner instructions)
        const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        if (isIos && !isStandalone) {
             setTimeout(() => {
                 banner.classList.remove('hidden');
             }, 3500);
        }

        // Install Button Click
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                // Android/Desktop standard prompt
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
                banner.classList.add('hidden');
            } else if (isIos) {
                // iOS Instructions (Apple doesn't allow programmatic install)
                alert("Para instalar no iOS/iPhone:\n\n1. Toque no botão de Compartilhar (ícone do quadrado com seta).\n2. Role para baixo e selecione 'Adicionar à Tela de Início'.");
            } else {
                // Fallback
                 alert("Para instalar, procure a opção 'Adicionar à Tela de Início' no menu do seu navegador.");
            }
        });

        // Close Button Click
        closeBtn.addEventListener('click', () => {
            banner.classList.add('hidden');
        });
    }

    // Initialize PWA Logic
    setupPwa();
});

// Expose globals for HTML clicks
if (typeof loadTrainingScreen !== 'undefined') {
    (window as any).loadTrainingScreen = loadTrainingScreen;
}
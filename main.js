import { GameCore } from './game-core.js';

window.onload = () => {
    // Registrace Service Workeru pro PWA a offline funkčnost
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker zaregistrován.', reg))
            .catch(err => console.error('Chyba registrace Service Workeru:', err));
    }

    // Inicializace jádra hry
    new GameCore();
};


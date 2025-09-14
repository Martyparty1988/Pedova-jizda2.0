import { GameCore } from './game-core.js';

/**
 * Spustí se po načtení celé stránky.
 * Inicializuje Service Worker pro PWA a poté spustí jádro hry.
 */
window.onload = () => {
    // Registrace Service Workeru pro PWA a offline funkčnost
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker zaregistrován.', reg))
            .catch(err => console.error('Chyba registrace Service Workeru:', err));
    }

    // Inicializace a spuštění hry
    new GameCore();
};


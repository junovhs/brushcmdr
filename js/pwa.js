// js/pwa.js
let deferredPrompt;
const installButton = document.getElementById('installAppButton');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installButton && !window.matchMedia('(display-mode: standalone)').matches) {
        installButton.style.display = 'inline-block';
        console.log('`beforeinstallprompt` event was fired. Install button shown.');
    } else if (installButton) {
        installButton.style.display = 'none';
    }
});

function showInstallPrompt() {
    if (!deferredPrompt) {
        alert("To install, use your browser's 'Add to Home Screen' or 'Install app' option.");
        return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
            if (installButton) installButton.style.display = 'none';
        } else {
            console.log('User dismissed the A2HS prompt');
        }
        deferredPrompt = null;
    });
}

function initPWA() {
    if (installButton) {
        installButton.addEventListener('click', showInstallPrompt);
        if (window.matchMedia('(display-mode: standalone)').matches || !deferredPrompt) {
            installButton.style.display = 'none';
        } else {
            installButton.style.display = 'inline-block';
        }
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App is running in standalone mode.');
        if (installButton) installButton.style.display = 'none';
    } else {
        console.log('App is running in browser.');
    }
}
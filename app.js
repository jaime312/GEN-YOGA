// script.js

// 1. INICIALIZAR ICONOS
lucide.createIcons();

// 2. TEXTO ROTATIVO (CORREGIDO Y PROBADO)
const words = ["🔥", "🤸", "🏃🏼", "🧘🏼", "🧎🏽‍♀️‍➡️"];

let wordIndex = 0;
const textElement = document.getElementById("dynamic-text");

function changeWord() {
    if (!textElement) return;

    // 1. Desvanecer
    textElement.style.opacity = "0";
    textElement.style.transform = "translateY(10px)"; // Pequeño movimiento hacia abajo

    // 2. Cambiar texto y reaparecer después de 500ms
    setTimeout(() => {
        wordIndex = (wordIndex + 1) % words.length;
        textElement.innerText = words[wordIndex];

        // Reaparecer
        textElement.style.opacity = "1";
        textElement.style.transform = "translateY(0)";
    }, 500);
}

// Iniciar intervalo cada 3 segundos
if (textElement) {
    setInterval(changeWord, 3000);
}


// 3. SISTEMA DE MODALES (Gestión de apertura/cierre)
const modalOverlay = document.getElementById('modal-overlay');
const modalContents = document.querySelectorAll('.modal-content');

window.openModal = function (modalId) {
    // Resetear
    modalContents.forEach(el => el.classList.add('hidden'));

    const target = document.getElementById(`modal-${modalId}`);
    if (target) {
        target.classList.remove('hidden');
        modalOverlay.classList.remove('hidden');

        // Pequeño delay para permitir transición CSS
        setTimeout(() => {
            modalOverlay.classList.remove('opacity-0');
        }, 10);
    }
}

window.closeModal = function () {
    modalOverlay.classList.add('opacity-0');
    setTimeout(() => {
        modalOverlay.classList.add('hidden');
        modalContents.forEach(el => el.classList.add('hidden'));
    }, 300);
}

// Cerrar con tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// Cerrar click fuera
if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
}

// 4. LOGICA DEL CURSOR PERSONALIZADO Y DETECCIÓN DE PLATAFORMA
document.addEventListener('DOMContentLoaded', () => {

    // --- DETECCIÓN DE PLATAFORMA ---
    const ua = navigator.userAgent.toLowerCase();
    const body = document.body;

    // Variables de control global
    window.isIOS = /ipad|iphone|ipod/.test(ua) && !window.MSStream;
    window.isAndroid = /android/.test(ua);
    window.isWeb = !window.isIOS && !window.isAndroid; // Si no es móvil, asumimos Web/Desktop

    // Limpiar clases previas
    body.classList.remove('platform-ios', 'platform-android', 'platform-web');

    if (window.isIOS) {
        body.classList.add('platform-ios');
        console.log("Modo: iOS App");
    } else if (window.isAndroid) {
        body.classList.add('platform-android');
        console.log("Modo: Android App");
    } else {
        body.classList.add('platform-web');
        console.log("Modo: Web Desktop");
    }

    // --- CURSOR EMOJI ---
    // Solo creamos el cursor si estamos en web para ahorrar recursos, 
    // aunque CSS ya lo oculta en móvil.
    if (window.isWeb) {
        const cursor = document.createElement('div');
        cursor.classList.add('wink-cursor');
        cursor.innerText = '🧘🏼';
        document.body.appendChild(cursor);

        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
        document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
        document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));
        document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) cursor.style.display = 'none'; });
        document.addEventListener('mouseover', () => cursor.style.display = 'block');
    }
});
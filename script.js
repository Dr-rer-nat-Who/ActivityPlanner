// Toggle ready status indicator for demonstration
let ready = true;
const indicator = document.getElementById('ready-indicator');
setInterval(() => {
    ready = !ready;
    indicator.style.background = ready ? 'var(--color-green)' : 'var(--color-red)';
}, 2000);

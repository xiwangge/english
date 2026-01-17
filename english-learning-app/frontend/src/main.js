import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import './assets/style.css'

const app = createApp(App)

// Handle chunk loading errors globally (e.g. after a new deployment or network switch)
function handleChunkError(error) {
    const errorMsg = error?.message || error?.toString() || '';
    const isChunkError = /Failed to fetch dynamically imported module|Loading chunk|error loading dynamically imported module|Importing a module script failed/i.test(errorMsg);

    if (isChunkError) {
        console.warn('Chunk load failed detected:', errorMsg);

        // Prevent infinite reload loops (max 3 reloads within 1 minute)
        const now = Date.now();
        const lastReload = parseInt(sessionStorage.getItem('lastChunkErrorReload') || '0');
        const reloadCount = parseInt(sessionStorage.getItem('chunkErrorReloadCount') || '0');

        if (now - lastReload < 60000 && reloadCount > 3) {
            console.error('Too many chunk load failures, stopping auto-reload.');
            return;
        }

        sessionStorage.setItem('lastChunkErrorReload', now.toString());
        sessionStorage.setItem('chunkErrorReloadCount', (now - lastReload < 60000 ? reloadCount + 1 : 1).toString());

        console.warn('Reloading page to fetch latest version...');
        window.location.reload();
    }
}

window.addEventListener('error', (e) => {
    handleChunkError(e);
}, true);

window.addEventListener('unhandledrejection', (e) => {
    handleChunkError(e.reason);
});

app.use(router)
app.use(Toast, {})
app.mount('#app')

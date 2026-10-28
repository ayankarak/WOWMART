// Persistent theme shared across every page.
const KEY = 'wowmartTheme';

export function initTheme() {
    const apply = theme => {
        document.documentElement.dataset.theme = theme;
        const btn = document.querySelector('[data-theme-toggle]');
        if (btn) {
            btn.innerHTML = theme === 'dark' 
                ? '<i class="fa-solid fa-sun"></i> Light' 
                : '<i class="fa-solid fa-moon"></i> Dark';
            btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        }
    };

    let saved;
    try {
        saved = localStorage.getItem(KEY);
    } catch {}

    apply(saved === 'dark' ? 'dark' : 'light');

    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-theme-toggle]');
        if (!btn) return;
        
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        
        try {
            localStorage.setItem(KEY, next);
        } catch {}
        
        apply(next);
    });
}

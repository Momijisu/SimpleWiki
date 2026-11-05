// Set the last-used theme before the page paints, so it doesn't flash.
try { const t = localStorage.getItem('sw-last-theme'); if (t) document.documentElement.dataset.theme = t; } catch { /* storage blocked */ }

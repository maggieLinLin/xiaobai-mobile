document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initStatusBar();
    initHomeScreen();
    initSettings();
    initApps();
    initCalendar();
    initMusic();
    if (!state.wallpaper) {
        applyTheme(state.currentTheme);
    }
});

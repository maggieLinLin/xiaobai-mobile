const state = {
    currentPage: 0,
    currentTheme: 'cinnamoroll',
    apiConfig: { url: '', key: '', model: '', temperature: 0.7 },
    chatHistory: [],
    memos: {},
    customCSS: '',
    wallpaper: '',
    frameColor: '#333333',
    fontStyle: 'system',
    music: { current: null, playlist: [], favorites: [], isPlaying: false },
    selectedDate: null,
    calendarDate: null,
    customDateText: '',
    customFont: '',
    enableSystemRole: false,
    minimaxConfig: { groupId: '', apiKey: '', ttsModel: '' },
    savedApiConfigs: [],
    savedTtsConfigs: []
};

function loadState() {
    const saved = localStorage.getItem('xiaobai-state');
    if (saved) {
        Object.assign(state, JSON.parse(saved));
    }
}

function saveState() {
    localStorage.setItem('xiaobai-state', JSON.stringify(state));
}

function download(filename, text) {
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    a.download = filename;
    a.click();
}

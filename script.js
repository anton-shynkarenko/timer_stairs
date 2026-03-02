(function() {
    // ----- КОНФИГ
    const STORAGE_KEY = 'focus_ladder_stats';
    const CURRENT_MINUTE_KEY = 'focus_ladder_current_minute';
    const TICK_INTERVAL = 1000;
    const MAX_MINUTES = 30;

    // ----- СОСТОЯНИЕ
    let currentMinutes = 1;
    let timeLeftSeconds = currentMinutes * 60;
    let timerInterval = null;
    let isPaused = false;
    let isRunning = false;

    // звуки
    let tickAudio = null;
    let finishAudio = null;
    let audioInitialized = false;

    // DOM элементы
    const minutesDisplayEl = document.getElementById('minutesDisplay');
    const progressLabelEl = document.getElementById('progressLabel');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const restartBtn = document.getElementById('restartBtn');
    const nextBtn = document.getElementById('nextBtn');
    const statBtn = document.getElementById('statBtn');
    const statsPanel = document.getElementById('statsPanel');
    const todayDateSpan = document.getElementById('todayDate');
    const totalTimeDisplay = document.getElementById('totalTimeDisplay');
    const totalTimersDisplay = document.getElementById('totalTimersDisplay');
    const lastTimerDisplay = document.getElementById('lastTimerDisplay');

    // ---------- ЗАГРУЗКА И СОХРАНЕНИЕ ТЕКУЩЕЙ МИНУТЫ ----------
    function loadCurrentMinute() {
        try {
            const saved = localStorage.getItem(CURRENT_MINUTE_KEY);
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (!isNaN(parsed) && parsed >= 1 && parsed <= MAX_MINUTES) {
                    currentMinutes = parsed;
                    console.log('Загружена минута из localStorage:', currentMinutes);
                }
            }
        } catch (e) {
            console.warn('Ошибка загрузки текущей минуты', e);
        }
    }

    function saveCurrentMinute() {
        try {
            localStorage.setItem(CURRENT_MINUTE_KEY, currentMinutes.toString());
            console.log('Сохранена минута в localStorage:', currentMinutes);
        } catch (e) {
            console.warn('Ошибка сохранения текущей минуты', e);
        }
    }

    // ---------- ИНИЦИАЛИЗАЦИЯ ЗВУКОВ ----------
    function initSounds() {
        if (audioInitialized) return;

        try {
            console.log('Инициализация звуков...');

            // Тиканье (через Audio)
            createTickSound();

            // Фанфары (через Web Audio)
            createFanfareSound();

            audioInitialized = true;
        } catch (e) {
            console.warn('Ошибка инициализации звуков', e);
            createFallbackSounds();
        }
    }

    function createTickSound() {
        try {
            const originalTick = new Audio();
            originalTick.src = 'data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAAA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PA==';
            originalTick.volume = 0.2;

            tickAudio = function() {
                const tick = originalTick.cloneNode();
                tick.play().catch(() => {});
            };
        } catch (e) {
            tickAudio = function() {};
        }
    }

    function createFanfareSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContext();

            finishAudio = function() {
                if (audioContext.state === 'suspended') audioContext.resume();

                const now = audioContext.currentTime;

                const osc1 = audioContext.createOscillator();
                const gain1 = audioContext.createGain();
                osc1.type = 'sine';
                osc1.frequency.value = 523.25;
                gain1.gain.setValueAtTime(0.2, now);
                gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc1.connect(gain1);
                gain1.connect(audioContext.destination);

                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.type = 'sine';
                osc2.frequency.value = 659.25;
                gain2.gain.setValueAtTime(0.2, now + 0.15);
                gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);

                const osc3 = audioContext.createOscillator();
                const gain3 = audioContext.createGain();
                osc3.type = 'sine';
                osc3.frequency.value = 783.99;
                gain3.gain.setValueAtTime(0.2, now + 0.3);
                gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc3.connect(gain3);
                gain3.connect(audioContext.destination);

                const osc4 = audioContext.createOscillator();
                const gain4 = audioContext.createGain();
                osc4.type = 'sine';
                osc4.frequency.value = 1046.5;
                gain4.gain.setValueAtTime(0.25, now + 0.45);
                gain4.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
                osc4.connect(gain4);
                gain4.connect(audioContext.destination);

                osc1.start(now);
                osc1.stop(now + 0.2);
                osc2.start(now + 0.15);
                osc2.stop(now + 0.35);
                osc3.start(now + 0.3);
                osc3.stop(now + 0.5);
                osc4.start(now + 0.45);
                osc4.stop(now + 0.7);
            };
        } catch (e) {
            createFallbackFinish();
        }
    }

    function createFallbackFinish() {
        try {
            const audio = new Audio();
            audio.src = 'data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAAACABAAZGF0YXAAAABAQEAAPz8/QUFBRERERISEhIXFxcZGRkcHBwfHx8iIiIlJSUpKSktLS0xMTE2NjY7OztBQUFHR0dNTU1UVFRbW1tjY2tsbGx2dnZ/f3+JiYmTk5OcnJympqavr6+4uLjBwcHKysrT09Pb29vk5OTs7Oz09PT8/Pz8/PT07Ozs5OTk29vb09PTy8vLwsLCubm5sbGxqKion5+fl5eXj4+Ph4eHe3t7c3Nza2trZGRkXV1dVVVVTU1NRUVFPT09OTk5Nzc3MjIyLS0tKSkpJSUlISEhHh4eHBwcGRkZFhYWEhISDw8PCwsLBwcHAwMDAQI=';
            audio.volume = 0.5;
            finishAudio = function() {
                audio.cloneNode().play().catch(() => {});
            };
        } catch (e) {
            finishAudio = function() {};
        }
    }

    function createFallbackSounds() {
        createTickSound();
        createFallbackFinish();
        audioInitialized = true;
    }

    function playTick() {
        if (tickAudio && typeof tickAudio === 'function') tickAudio();
    }

    function playFinish() {
        if (finishAudio && typeof finishAudio === 'function') finishAudio();
    }

    // ---------- LOCALSTORAGE ДЛЯ СТАТИСТИКИ ----------
    function getTodayKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function loadStats() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return {};
            }
        }
        return {};
    }

    function saveStats(stats) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    }

    function getTodayStats() {
        const stats = loadStats();
        const key = getTodayKey();
        if (!stats[key]) {
            stats[key] = { totalSeconds: 0, timersCompleted: 0, lastTimerMinutes: 0 };
        }
        return { stats, key, todayData: stats[key] };
    }

    function addCompletedTimer(minutes) {
        const { stats, key, todayData } = getTodayStats();
        todayData.totalSeconds = (todayData.totalSeconds || 0) + minutes * 60;
        todayData.timersCompleted = (todayData.timersCompleted || 0) + 1;
        todayData.lastTimerMinutes = minutes;
        saveStats(stats);
        renderStatsPanel();
    }

    function renderStatsPanel() {
        const { todayData } = getTodayStats();
        const totalSec = todayData.totalSeconds || 0;
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        let timeStr = hours > 0 ? `${hours}ч ` : '';
        timeStr += `${mins}мин`;

        totalTimeDisplay.innerText = timeStr || '0мин';
        totalTimersDisplay.innerText = todayData.timersCompleted || 0;
        lastTimerDisplay.innerText = todayData.lastTimerMinutes ? `${todayData.lastTimerMinutes} мин` : '—';
        todayDateSpan.innerText = getTodayKey();
    }

    // ---------- ТАЙМЕР ----------
    function updateDisplay() {
        const mins = Math.floor(timeLeftSeconds / 60);
        const secs = timeLeftSeconds % 60;
        minutesDisplayEl.innerHTML = `${String(mins).padStart(2, '0')}<span> мин</span> ${String(secs).padStart(2, '0')}с`;
        progressLabelEl.innerText = `${currentMinutes} / 30`;
    }

    function showFinishNotification() {
        const timerBlock = document.querySelector('.timer-block');
        timerBlock.style.transition = 'border 0.2s, box-shadow 0.2s';
        timerBlock.style.border = '3px solid #ffaa00';
        timerBlock.style.boxShadow = '0 0 30px #ffaa00';
        setTimeout(() => {
            timerBlock.style.border = '1px solid #3d7e9a';
            timerBlock.style.boxShadow = 'inset 0 6px 8px rgba(0,0,0,0.5), 0 10px 20px rgba(0, 20, 30, 0.7)';
        }, 500);
    }

    function finishTimer() {
        console.log('Таймер завершён');
        if (!audioInitialized) initSounds();
        playFinish();
        showFinishNotification();

        // Сохраняем статистику (текущая минута завершена)
        addCompletedTimer(currentMinutes);

        // Таймер останавливается, минута НЕ увеличивается
        stopTimer();
        isRunning = false;
        isPaused = false;
        timeLeftSeconds = currentMinutes * 60; // сброс до полной минуты
        updateDisplay();
        updateButtonStates();
    }

    function tick() {
        if (!isRunning || isPaused) return;

        if (timeLeftSeconds <= 0) {
            finishTimer();
        } else {
            timeLeftSeconds--;
            playTick();
            updateDisplay();
        }
    }

    function startTimerIfNeeded() {
        if (!timerInterval) {
            timerInterval = setInterval(tick, TICK_INTERVAL);
        }
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function resetToCurrent(autoplay = false) {
        stopTimer();
        timeLeftSeconds = currentMinutes * 60;
        isPaused = false;
        isRunning = autoplay;
        updateDisplay();
        updateButtonStates();
        if (autoplay) startTimerIfNeeded();
    }

    function updateButtonStates() {
        if (isRunning && !isPaused) {
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            restartBtn.disabled = false;
            pauseBtn.innerText = '⏸ Пауза';
        } else if (isRunning && isPaused) {
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            restartBtn.disabled = false;
            pauseBtn.innerText = '▶ Продолжить';
        } else {
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            restartBtn.disabled = false;
            pauseBtn.innerText = '⏸ Пауза';
        }
    }

    // ---------- СОБЫТИЯ КНОПОК ----------
    startBtn.addEventListener('click', () => {
        if (!audioInitialized) initSounds();
        if (!isRunning) {
            isRunning = true;
            isPaused = false;
            startTimerIfNeeded();
            updateButtonStates();
        }
    });

    pauseBtn.addEventListener('click', () => {
        if (!isRunning) return;
        if (isPaused) {
            isPaused = false;
            startTimerIfNeeded();
        } else {
            isPaused = true;
            stopTimer();
        }
        updateButtonStates();
    });

    resetBtn.addEventListener('click', () => {
        stopTimer();
        currentMinutes = 1;
        timeLeftSeconds = 60;
        isRunning = false;
        isPaused = false;
        updateDisplay();
        updateButtonStates();
        saveCurrentMinute(); // Сохраняем новое значение
    });

    restartBtn.addEventListener('click', () => {
        stopTimer();
        timeLeftSeconds = currentMinutes * 60;
        isRunning = false;
        isPaused = false;
        updateDisplay();
        updateButtonStates();
    });

    nextBtn.addEventListener('click', () => {
        stopTimer();
        if (currentMinutes < MAX_MINUTES) {
            currentMinutes++;
        }
        timeLeftSeconds = currentMinutes * 60;
        isRunning = false;
        isPaused = false;
        updateDisplay();
        updateButtonStates();
        saveCurrentMinute(); // Сохраняем новое значение
    });

    statBtn.addEventListener('click', () => {
        if (statsPanel.style.display === 'none') {
            renderStatsPanel();
            statsPanel.style.display = 'block';
        } else {
            statsPanel.style.display = 'none';
        }
    });

    // ---------- СТАРТОВАЯ ИНИЦИАЛИЗАЦИЯ ----------
    window.addEventListener('load', () => {
        // Загружаем сохраненную минуту
        loadCurrentMinute();
        
        // Устанавливаем время в соответствии с загруженной минутой
        timeLeftSeconds = currentMinutes * 60;
        
        isRunning = false;
        isPaused = false;
        updateDisplay();
        updateButtonStates();
        renderStatsPanel();
        
        console.log('Инициализация завершена, текущая минута:', currentMinutes);
    });

    // Сохраняем минуту перед уходом со страницы
    window.addEventListener('beforeunload', () => {
        stopTimer();
        saveCurrentMinute();
    });

    // Активация звуков при первом взаимодействии
    document.body.addEventListener('click', () => {
        if (!audioInitialized) initSounds();
    }, { once: true });
})();

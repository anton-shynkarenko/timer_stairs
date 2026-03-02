(function() {
    // ----- КОНФИГ
    const STORAGE_KEY = 'focus_ladder_stats';
    const CURRENT_MINUTE_KEY = 'focus_ladder_current_minute';
    const LAST_COMPLETED_KEY = 'focus_ladder_last_completed';
    const TICK_INTERVAL = 1000;
    const MAX_MINUTES = 30;

    // ----- СОСТОЯНИЕ
    let currentMinutes = 1;
    let lastCompletedMinute = 0;
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
    const pauseBtn = document.getElementById('pauseBtn');
    const startRestartBtn = document.getElementById('startRestartBtn');
    const nextBtn = document.getElementById('nextBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statBtn = document.getElementById('statBtn');
    const statsPanel = document.getElementById('statsPanel');
    const todayDateSpan = document.getElementById('todayDate');
    const totalTimeDisplay = document.getElementById('totalTimeDisplay');
    const totalTimersDisplay = document.getElementById('totalTimersDisplay');
    const lastTimerDisplay = document.getElementById('lastTimerDisplay');

    // ---------- ЗАГРУЗКА И СОХРАНЕНИЕ СОСТОЯНИЯ ----------
    function loadState() {
        try {
            // Загружаем текущую минуту
            const savedMinute = localStorage.getItem(CURRENT_MINUTE_KEY);
            if (savedMinute) {
                const parsed = parseInt(savedMinute, 10);
                if (!isNaN(parsed) && parsed >= 1 && parsed <= MAX_MINUTES) {
                    currentMinutes = parsed;
                }
            }

            // Загружаем последнюю завершённую минуту
            const savedCompleted = localStorage.getItem(LAST_COMPLETED_KEY);
            if (savedCompleted) {
                const parsed = parseInt(savedCompleted, 10);
                if (!isNaN(parsed) && parsed >= 0 && parsed <= MAX_MINUTES) {
                    lastCompletedMinute = parsed;
                }
            }

            console.log(`Загружено: текущая ${currentMinutes}, завершено ${lastCompletedMinute}`);
        } catch (e) {
            console.warn('Ошибка загрузки состояния', e);
        }
    }

    function saveState() {
        try {
            localStorage.setItem(CURRENT_MINUTE_KEY, currentMinutes.toString());
            localStorage.setItem(LAST_COMPLETED_KEY, lastCompletedMinute.toString());
        } catch (e) {
            console.warn('Ошибка сохранения состояния', e);
        }
    }

    // ---------- ИНИЦИАЛИЗАЦИЯ ЗВУКОВ ----------
    function initSounds() {
        if (audioInitialized) return;
        try {
            createTickSound();
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
                originalTick.cloneNode().play().catch(() => {});
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
                
                const notes = [523.25, 659.25, 783.99, 1046.5];
                notes.forEach((freq, i) => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.2, now + i * 0.15);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.2);
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    osc.start(now + i * 0.15);
                    osc.stop(now + i * 0.15 + 0.2);
                });
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
        if (tickAudio) tickAudio();
    }

    function playFinish() {
        if (finishAudio) finishAudio();
    }

    // ---------- СТАТИСТИКА ----------
    function getTodayKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function loadStats() {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
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
        if (!audioInitialized) initSounds();
        playFinish();
        showFinishNotification();

        // Записываем завершённую минуту
        addCompletedTimer(currentMinutes);
        lastCompletedMinute = currentMinutes;
        saveState();

        stopTimer();
        isRunning = false;
        isPaused = false;
        timeLeftSeconds = currentMinutes * 60;
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

    // ---------- ЛОГИКА КНОПОК (ОБНОВЛЕНО) ----------
    function updateButtonStates() {
        const isCompleted = (lastCompletedMinute === currentMinutes);
        
        if (isRunning && !isPaused) {
            // Таймер идёт
            pauseBtn.disabled = false;
            pauseBtn.innerText = '⏸ Пауза';
            startRestartBtn.disabled = true;
            startRestartBtn.innerText = '▶ Начать';
            nextBtn.disabled = true;
            resetBtn.disabled = true;
        } 
        else if (isRunning && isPaused) {
            // Таймер на паузе
            pauseBtn.disabled = false;
            pauseBtn.innerText = '▶ Продолжить';
            startRestartBtn.disabled = true;
            startRestartBtn.innerText = '▶ Начать';
            nextBtn.disabled = false;
            resetBtn.disabled = false;
        }
        else if (isCompleted) {
            // Таймер завершён (можно заново или следующий)
            pauseBtn.disabled = true;
            pauseBtn.innerText = '⏸ Пауза';
            startRestartBtn.disabled = false;
            startRestartBtn.innerText = '↺ Заново';
            nextBtn.disabled = false;
            resetBtn.disabled = false;
        }
        else {
            // Таймер не запущен (новая минута)
            pauseBtn.disabled = true;
            pauseBtn.innerText = '⏸ Пауза';
            startRestartBtn.disabled = false;
            startRestartBtn.innerText = '▶ Начать';
            nextBtn.disabled = true;
            resetBtn.disabled = false;
        }
    }

    // ---------- ОБРАБОТЧИКИ ----------
    pauseBtn.addEventListener('click', () => {
        if (!isRunning) return;
        
        if (isPaused) {
            // Продолжить
            isPaused = false;
            startTimerIfNeeded();
        } else {
            // Пауза
            isPaused = true;
            stopTimer();
        }
        updateButtonStates();
    });

    startRestartBtn.addEventListener('click', () => {
        if (!audioInitialized) initSounds();
        
        if (lastCompletedMinute === currentMinutes) {
            // Режим "Заново" - перезапустить завершённую минуту
            stopTimer();
            timeLeftSeconds = currentMinutes * 60;
            isRunning = true;
            isPaused = false;
            updateDisplay();
            startTimerIfNeeded();
        } else {
            // Режим "Начать" - запустить новую минуту
            isRunning = true;
            isPaused = false;
            startTimerIfNeeded();
        }
        updateButtonStates();
    });

    nextBtn.addEventListener('click', () => {
        if (lastCompletedMinute !== currentMinutes) return; // Нельзя перейти, пока не завершена
        
        stopTimer();
        if (currentMinutes < MAX_MINUTES) {
            currentMinutes++;
        }
        timeLeftSeconds = currentMinutes * 60;
        isRunning = false;
        isPaused = false;
        // lastCompletedMinute остаётся предыдущей (новая минута не завершена)
        updateDisplay();
        saveState();
        updateButtonStates();
    });

    resetBtn.addEventListener('click', () => {
        stopTimer();
        currentMinutes = 1;
        lastCompletedMinute = 0; // Сбрасываем прогресс
        timeLeftSeconds = 60;
        isRunning = false;
        isPaused = false;
        updateDisplay();
        saveState();
        updateButtonStates();
    });

    statBtn.addEventListener('click', () => {
        if (statsPanel.style.display === 'none') {
            renderStatsPanel();
            statsPanel.style.display = 'block';
        } else {
            statsPanel.style.display = 'none';
        }
    });

    // ---------- ИНИЦИАЛИЗАЦИЯ ----------
    window.addEventListener('load', () => {
        loadState();
        timeLeftSeconds = currentMinutes * 60;
        isRunning = false;
        isPaused = false;
        updateDisplay();
        updateButtonStates();
        renderStatsPanel();
    });

    window.addEventListener('beforeunload', () => {
        stopTimer();
        saveState();
    });

    document.body.addEventListener('click', () => {
        if (!audioInitialized) initSounds();
    }, { once: true });
})();

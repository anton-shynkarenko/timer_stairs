(function() {
    // ----- КОНФИГ
    const STORAGE_KEY = 'focus_ladder_stats';
    const TICK_INTERVAL = 1000; // 1 сек
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
    let audioInitialized = false; // флаг инициализации звуков

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

    // ---------- ИНИЦИАЛИЗАЦИЯ ЗВУКОВ ----------
    function initSounds() {
        if (audioInitialized) return; // уже инициализированы
        
        try {
            console.log('Инициализация звуков...');
            
            // Создаем звук тиканья
            tickAudio = new Audio();
            tickAudio.src = 'data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAAA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PA==';
            tickAudio.volume = 0.3;
            tickAudio.preload = 'auto';
            
            // Создаем звук окончания
            finishAudio = new Audio();
            finishAudio.src = 'data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAAACABAAZGF0YXAAAABAQEAAPz8/QUFBRERERISEhIXFxcZGRkcHBwfHx8iIiIlJSUpKSktLS0xMTE2NjY7OztBQUFHR0dNTU1UVFRbW1tjY2tsbGx2dnZ/f3+JiYmTk5OcnJympqavr6+4uLjBwcHKysrT09Pb29vk5OTs7Oz09PT8/Pz8/PT07Ozs5OTk29vb09PTy8vLwsLCubm5sbGxqKion5+fl5eXj4+Ph4eHe3t7c3Nza2trZGRkXV1dVVVVTU1NRUVFPT09OTk5Nzc3MjIyLS0tKSkpJSUlISEhHh4eHBwcGRkZFhYWEhISDw8PCwsLBwcHAwMDAQI=';
            finishAudio.volume = 0.7;
            finishAudio.preload = 'auto';
            
            // Пробуем воспроизвести и сразу ставим на паузу для разблокировки
            const playPromise = tickAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    tickAudio.pause();
                    tickAudio.currentTime = 0;
                    console.log('Звуки инициализированы');
                    audioInitialized = true;
                }).catch(error => {
                    console.log('Звуки будут доступны после клика');
                });
            }
        } catch (e) {
            console.warn('Аудио не поддерживается', e);
        }
    }

    // Воспроизведение звука с проверкой инициализации
    function playSound(audio) {
        if (!audio) return;
        
        try {
            // Если звуки еще не инициализированы, пробуем инициализировать
            if (!audioInitialized) {
                initSounds();
            }
            
            // Создаем копию звука для воспроизведения (обход ограничений)
            const soundCopy = new Audio();
            soundCopy.src = audio.src;
            soundCopy.volume = audio.volume;
            
            const playPromise = soundCopy.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Воспроизведение звука возможно только после взаимодействия со страницей');
                });
            }
        } catch (e) {
            console.warn('Ошибка воспроизведения звука', e);
        }
    }

    // играть тик
    function playTick() {
        playSound(tickAudio);
    }

    function playFinish() {
        playSound(finishAudio);
    }

    // ---------- РАБОТА С LOCALSTORAGE ----------
    function getTodayKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
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
            stats[key] = {
                totalSeconds: 0,
                timersCompleted: 0,
                lastTimerMinutes: 0,
            };
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
        let timeStr = '';
        if (hours > 0) timeStr += `${hours}ч `;
        timeStr += `${mins}мин`;

        totalTimeDisplay.innerText = timeStr || '0мин';
        totalTimersDisplay.innerText = todayData.timersCompleted || 0;
        const last = todayData.lastTimerMinutes;
        lastTimerDisplay.innerText = last ? `${last} мин` : '—';
        todayDateSpan.innerText = getTodayKey();
    }

    // ---------- ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ----------
    function updateDisplay() {
        const mins = Math.floor(timeLeftSeconds / 60);
        const secs = timeLeftSeconds % 60;
        minutesDisplayEl.innerHTML = `${String(mins).padStart(2, '0')}<span> мин</span> ${String(secs).padStart(2, '0')}с`;
        progressLabelEl.innerText = `${currentMinutes} / 30`;
    }

    function finishTimer() {
        console.log('Таймер завершен, играем звук');
        playFinish();

        addCompletedTimer(currentMinutes);

        if (currentMinutes < MAX_MINUTES) {
            currentMinutes++;
            resetTimerToCurrent(true);
        } else {
            stopTimer();
            timeLeftSeconds = currentMinutes * 60;
            isRunning = false;
            isPaused = false;
            updateButtonStates();
            updateDisplay();
        }
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

    function resetTimerToCurrent(autoplay = false) {
        stopTimer();
        timeLeftSeconds = currentMinutes * 60;
        isPaused = false;
        isRunning = autoplay;
        updateDisplay();
        updateButtonStates();
        if (autoplay) {
            startTimerIfNeeded();
        }
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
            restartBtn.disabled = true;
            pauseBtn.innerText = '⏸ Пауза';
        }
    }

    // ---------- ОБРАБОТЧИКИ ----------
    startBtn.addEventListener('click', () => {
        // Инициализируем звуки при первом клике
        if (!audioInitialized) {
            initSounds();
        }
        
        if (!isRunning) {
            isRunning = true;
            isPaused = false;
            startTimerIfNeeded();
            updateDisplay();
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
    });

    restartBtn.addEventListener('click', () => {
        if (!isRunning) return;
        
        stopTimer();
        timeLeftSeconds = currentMinutes * 60;
        isRunning = true;
        isPaused = false;
        updateDisplay();
        startTimerIfNeeded();
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
    });

    statBtn.addEventListener('click', () => {
        if (statsPanel.style.display === 'none') {
            renderStatsPanel();
            statsPanel.style.display = 'block';
        } else {
            statsPanel.style.display = 'none';
        }
    });

    // Функция для принудительной инициализации звуков
    function forceInitSounds() {
        if (!audioInitialized) {
            initSounds();
        }
    }

    // Инициализация при загрузке (без звуков)
    window.addEventListener('load', () => {
        currentMinutes = 1;
        timeLeftSeconds = 60;
        isRunning = false;
        isPaused = false;
        updateDisplay();
        updateButtonStates();
        renderStatsPanel();
        
        // Создаем звуки, но не играем их
        try {
            tickAudio = new Audio();
            tickAudio.src = 'data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAAA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PA==';
            tickAudio.volume = 0.3;
            tickAudio.load();
            
            finishAudio = new Audio();
            finishAudio.src = 'data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAAACABAAZGF0YXAAAABAQEAAPz8/QUFBRERERISEhIXFxcZGRkcHBwfHx8iIiIlJSUpKSktLS0xMTE2NjY7OztBQUFHR0dNTU1UVFRbW1tjY2tsbGx2dnZ/f3+JiYmTk5OcnJympqavr6+4uLjBwcHKysrT09Pb29vk5OTs7Oz09PT8/Pz8/PT07Ozs5OTk29vb09PTy8vLwsLCubm5sbGxqKion5+fl5eXj4+Ph4eHe3t7c3Nza2trZGRkXV1dVVVVTU1NRUVFPT09OTk5Nzc3MjIyLS0tKSkpJSUlISEhHh4eHBwcGRkZFhYWEhISDw8PCwsLBwcHAwMDAQI=';
            finishAudio.volume = 0.7;
            finishAudio.load();
        } catch (e) {
            console.warn('Ошибка загрузки звуков', e);
        }
    });

    // Обработчики кликов для инициализации звуков
    document.body.addEventListener('click', function initOnClick() {
        if (!audioInitialized) {
            console.log('Инициализация звуков по клику');
            initSounds();
        }
    }, { once: true });

    // Также инициализируем при наведении на таймер (для удобства)
    document.querySelector('.timer-block').addEventListener('mouseenter', function() {
        if (!audioInitialized) {
            initSounds();
        }
    }, { once: true });

    window.addEventListener('beforeunload', () => {
        stopTimer();
    });
})();

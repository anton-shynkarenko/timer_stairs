(function() {
    // ----- КОНФИГ
    const STORAGE_KEY = 'focus_ladder_stats';
    const TICK_INTERVAL = 1000; // 1 сек
    const MAX_MINUTES = 30;

    // ----- СОСТОЯНИЕ
    let currentMinutes = 1;              // стартуем с 1
    let timeLeftSeconds = currentMinutes * 60; // оставшиеся секунды
    let timerInterval = null;
    let isPaused = false;
    let isRunning = false;                // false если остановлен (не пауза)

    // звуки
    let tickAudio = null;
    let finishAudio = null;

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
        try {
            // тиканье – короткий цикл
            tickAudio = new Audio();
            tickAudio.src = 'data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAAA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PA=='; // очень короткий тик
            tickAudio.volume = 0.25;

            finishAudio = new Audio();
            finishAudio.src = 'data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAAACABAAZGF0YXAAAABAQEAAPz8/QUFBRERERISEhIXFxcZGRkcHBwfHx8iIiIlJSUpKSktLS0xMTE2NjY7OztBQUFHR0dNTU1UVFRbW1tjY2tsbGx2dnZ/f3+JiYmTk5OcnJympqavr6+4uLjBwcHKysrT09Pb29vk5OTs7Oz09PT8/Pz8/PT07Ozs5OTk29vb09PTy8vLwsLCubm5sbGxqKion5+fl5eXj4+Ph4eHe3t7c3Nza2trZGRkXV1dVVVVTU1NRUVFPT09OTk5Nzc3MjIyLS0tKSkpJSUlISEhHh4eHBwcGRkZFhYWEhISDw8PCwsLBwcHAwMDAQI='; // простой сигнал
            finishAudio.volume = 0.5;
        } catch (e) {
            console.warn('Аудио не поддерживается', e);
        }
    }

    // играть тик
    function playTick() {
        if (tickAudio) {
            tickAudio.currentTime = 0;
            tickAudio.play().catch(e => { /* игнорируем если нельзя */ });
        }
    }

    function playFinish() {
        if (finishAudio) {
            finishAudio.currentTime = 0;
            finishAudio.play().catch(e => console.log('звук финиша заблокирован браузером'));
        }
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
                totalSeconds: 0,     // отработанные секунды (завершённые таймеры)
                timersCompleted: 0,
                lastTimerMinutes: 0,  // последний таймер (минуты)
            };
        }
        return { stats, key, todayData: stats[key] };
    }

    // Обновить статистику: добавить завершённый таймер длиной minutes
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

    // Завершение таймера (звук, логика)
    function finishTimer() {
        playFinish();

        // записываем завершённый таймер в статистику
        addCompletedTimer(currentMinutes);

        // автоматический переход на следующий, если не 30
        if (currentMinutes < MAX_MINUTES) {
            currentMinutes++;
            resetTimerToCurrent(/* restartAfterFinish = true */);
        } else {
            // если дошли до 30 — останавливаем
            stopTimer();
            timeLeftSeconds = currentMinutes * 60;
            isRunning = false;
            isPaused = false;
            updateButtonStates();
            updateDisplay();
        }
    }

    // ТИК таймера
    function tick() {
        if (!isRunning || isPaused) return;

        if (timeLeftSeconds <= 0) {
            // время вышло
            finishTimer();
        } else {
            timeLeftSeconds--;
            playTick();             // тиканье каждую секунду
            updateDisplay();
        }
    }

    // СТАРТ (запускает интервал, если ещё не запущен)
    function startTimerIfNeeded() {
        if (!timerInterval) {
            timerInterval = setInterval(tick, TICK_INTERVAL);
        }
    }

    // Остановить интервал
    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    // Сбросить таймер до текущей минуты (currentMinutes) без запуска
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

    // Обновление состояния кнопок
    function updateButtonStates() {
        if (isRunning && !isPaused) {
            // Таймер активен
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            restartBtn.disabled = false;
            pauseBtn.innerText = '⏸ Пауза';
        } else if (isRunning && isPaused) {
            // Таймер на паузе
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            restartBtn.disabled = false;
            pauseBtn.innerText = '▶ Продолжить';
        } else {
            // Таймер остановлен
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            restartBtn.disabled = true;
            pauseBtn.innerText = '⏸ Пауза';
        }
    }

    // ---------- ОБРАБОТЧИКИ ----------
    // Старт
    startBtn.addEventListener('click', () => {
        if (!isRunning) {
            isRunning = true;
            isPaused = false;
            startTimerIfNeeded();
            updateDisplay();
            updateButtonStates();
        }
    });

    // пауза/продолжить
    pauseBtn.addEventListener('click', () => {
        if (!isRunning) return;

        if (isPaused) {
            // продолжить
            isPaused = false;
            startTimerIfNeeded();
        } else {
            // поставить на паузу
            isPaused = true;
            stopTimer();
        }
        updateButtonStates();
    });

    // Сброс (до 1 минуты)
    resetBtn.addEventListener('click', () => {
        stopTimer();
        currentMinutes = 1;
        timeLeftSeconds = 60;
        isRunning = false;
        isPaused = false;
        updateDisplay();
        updateButtonStates();
    });

    // Заново (перезапуск текущего таймера)
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

    // Следующий: увеличиваем на 1 (до 30) и останавливаем
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

    // Показать/скрыть статистику
    statBtn.addEventListener('click', () => {
        if (statsPanel.style.display === 'none') {
            renderStatsPanel();
            statsPanel.style.display = 'block';
        } else {
            statsPanel.style.display = 'none';
        }
    });

    // инициализация при загрузке
    updateDisplay();
    initSounds();

    // Чтобы звуки работали после первого клика (из-за политик автовоспроизведения)
    function enableAudioOnFirstInteraction() {
        const silentTick = new Audio();
        silentTick.src = 'data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAAA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PA==';
        silentTick.volume = 0.01;
        silentTick.play().then(() => { silentTick.pause(); }).catch(() => {});
    }

    document.body.addEventListener('click', enableAudioOnFirstInteraction, { once: true });

    // При загрузке страницы таймер не запущен
    window.addEventListener('load', () => {
        currentMinutes = 1;
        timeLeftSeconds = 60;
        isRunning = false;
        isPaused = false;
        updateDisplay();
        updateButtonStates();
        renderStatsPanel();
    });

    // при уходе со страницы остановим интервал
    window.addEventListener('beforeunload', () => {
        stopTimer();
    });
})();

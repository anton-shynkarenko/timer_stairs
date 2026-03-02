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

    // ---------- ИНИЦИАЛИЗАЦИЯ ЗВУКОВ ----------
    function initSounds() {
        if (audioInitialized) {
            console.log('Звуки уже инициализированы');
            return;
        }
        
        try {
            console.log('Инициализация звуков...');
            
            // Используем Web Audio API для более надежного воспроизведения
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            
            if (AudioContext) {
                // Создаем тиканье через генератор
                createTickSound();
                // Создаем звук финиша
                createFinishSound();
                audioInitialized = true;
                console.log('Звуки инициализированы через Web Audio API');
            } else {
                // Fallback на старый метод
                createFallbackSounds();
            }
        } catch (e) {
            console.warn('Ошибка инициализации звуков', e);
            createFallbackSounds();
        }
    }

    // Создание звука тиканья через Web Audio API
    function createTickSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Функция для воспроизведения тика
            tickAudio = function() {
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.type = 'sine';
                oscillator.frequency.value = 800;
                
                gainNode.gain.value = 0.1;
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.1);
            };
        } catch (e) {
            console.warn('Ошибка создания Web Audio тика', e);
            createFallbackTick();
        }
    }

    // Создание звука финиша через Web Audio API
    function createFinishSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            finishAudio = function() {
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                
                // Первый звук
                const osc1 = audioContext.createOscillator();
                const gain1 = audioContext.createGain();
                osc1.type = 'sine';
                osc1.frequency.value = 523.25; // До
                
                gain1.gain.value = 0.2;
                gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                osc1.connect(gain1);
                gain1.connect(audioContext.destination);
                
                // Второй звук выше
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.type = 'sine';
                osc2.frequency.value = 659.25; // Ми
                
                gain2.gain.value = 0.2;
                gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                
                osc1.start();
                osc2.start(audioContext.currentTime + 0.2);
                
                osc1.stop(audioContext.currentTime + 0.3);
                osc2.stop(audioContext.currentTime + 0.7);
            };
        } catch (e) {
            console.warn('Ошибка создания Web Audio финиша', e);
            createFallbackFinish();
        }
    }

    // Fallback для тика
    function createFallbackTick() {
        try {
            const audio = new Audio();
            audio.src = 'data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAAA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PA==';
            audio.volume = 0.2;
            
            tickAudio = function() {
                const playPromise = audio.cloneNode().play();
                if (playPromise) {
                    playPromise.catch(e => console.log('Тик заблокирован'));
                }
            };
        } catch (e) {
            tickAudio = function() {}; // пустая функция
        }
    }

    // Fallback для финиша
    function createFallbackFinish() {
        try {
            const audio = new Audio();
            audio.src = 'data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAAACABAAZGF0YXAAAABAQEAAPz8/QUFBRERERISEhIXFxcZGRkcHBwfHx8iIiIlJSUpKSktLS0xMTE2NjY7OztBQUFHR0dNTU1UVFRbW1tjY2tsbGx2dnZ/f3+JiYmTk5OcnJympqavr6+4uLjBwcHKysrT09Pb29vk5OTs7Oz09PT8/Pz8/PT07Ozs5OTk29vb09PTy8vLwsLCubm5sbGxqKion5+fl5eXj4+Ph4eHe3t7c3Nza2trZGRkXV1dVVVVTU1NRUVFPT09OTk5Nzc3MjIyLS0tKSkpJSUlISEhHh4eHBwcGRkZFhYWEhISDw8PCwsLBwcHAwMDAQI=';
            audio.volume = 0.5;
            
            finishAudio = function() {
                const playPromise = audio.cloneNode().play();
                if (playPromise) {
                    playPromise.catch(e => console.log('Финиш заблокирован'));
                }
            };
        } catch (e) {
            finishAudio = function() {}; // пустая функция
        }
    }

    function createFallbackSounds() {
        createFallbackTick();
        createFallbackFinish();
        audioInitialized = true;
    }

    // играть тик
    function playTick() {
        if (tickAudio && typeof tickAudio === 'function') {
            tickAudio();
        }
    }

    function playFinish() {
        console.log('Пытаемся воспроизвести звук финиша');
        if (finishAudio && typeof finishAudio === 'function') {
            finishAudio();
            
            // Дополнительно пробуем через стандартный Audio для надежности
            try {
                const backupSound = new Audio();
                backupSound.src = 'data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAAACABAAZGF0YXAAAABAQEAAPz8/QUFBRERERISEhIXFxcZGRkcHBwfHx8iIiIlJSUpKSktLS0xMTE2NjY7OztBQUFHR0dNTU1UVFRbW1tjY2tsbGx2dnZ/f3+JiYmTk5OcnJympqavr6+4uLjBwcHKysrT09Pb29vk5OTs7Oz09PT8/Pz8/PT07Ozs5OTk29vb09PTy8vLwsLCubm5sbGxqKion5+fl5eXj4+Ph4eHe3t7c3Nza2trZGRkXV1dVVVVTU1NRUVFPT09OTk5Nzc3MjIyLS0tKSkpJSUlISEhHh4eHBwcGRkZFhYWEhISDw8PCwsLBwcHAwMDAQI=';
                backupSound.volume = 0.7;
                backupSound.play().catch(e => console.log('Резервный звук финиша не сработал'));
            } catch (e) {
                console.warn('Ошибка резервного звука', e);
            }
        } else {
            console.warn('Звук финиша не инициализирован');
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

    // Визуальное уведомление о завершении
    function showFinishNotification() {
        const timerBlock = document.querySelector('.timer-block');
        const originalBorder = timerBlock.style.border;
        const originalBoxShadow = timerBlock.style.boxShadow;
        
        timerBlock.style.border = '3px solid #ffaa00';
        timerBlock.style.boxShadow = '0 0 30px #ffaa00';
        
        setTimeout(() => {
            timerBlock.style.border = originalBorder || '1px solid #3d7e9a';
            timerBlock.style.boxShadow = originalBoxShadow || 'inset 0 6px 8px rgba(0,0,0,0.5), 0 10px 20px rgba(0, 20, 30, 0.7)';
        }, 500);
    }

    function finishTimer() {
        console.log('Таймер завершен, играем звук финиша');
        
        // Принудительная инициализация звуков если нужно
        if (!audioInitialized) {
            initSounds();
        }
        
        // Воспроизводим звук
        playFinish();
        
        // Показываем визуальное уведомление
        showFinishNotification();
        
        // Добавляем в статистику
        addCompletedTimer(currentMinutes);

        // Автоматический переход на следующий, если не 30
        if (currentMinutes < MAX_MINUTES) {
            currentMinutes++;
            resetTimerToCurrent(true);
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
            finishTimer();
        } else {
            timeLeftSeconds--;
            playTick();
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
    startBtn.addEventListener('click', () => {
        // Принудительно инициализируем звуки
        if (!audioInitialized) {
            console.log('Инициализация звуков по клику Start');
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

    // Инициализация при загрузке (без звуков)
    window.addEventListener('load', () => {
        currentMinutes = 1;
        timeLeftSeconds = 60;
        isRunning = false;
        isPaused = false;
        updateDisplay();
        updateButtonStates();
        renderStatsPanel();
        
        // Предварительно создаем звуки для Web Audio API
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const audioContext = new AudioContext();
                // Сразу создаем контекст, но не используем
                console.log('AudioContext создан, состояние:', audioContext.state);
            }
        } catch (e) {
            console.warn('Web Audio API не поддерживается');
        }
    });

    // Обработчики для инициализации звуков
    document.body.addEventListener('click', function initOnClick() {
        if (!audioInitialized) {
            console.log('Инициализация звуков по клику на страницу');
            initSounds();
        }
    }, { once: true });

    // Также инициализируем при наведении на таймер
    document.querySelector('.timer-block').addEventListener('mouseenter', function() {
        if (!audioInitialized) {
            console.log('Инициализация звуков при наведении');
            initSounds();
        }
    }, { once: true });

    window.addEventListener('beforeunload', () => {
        stopTimer();
    });
})();

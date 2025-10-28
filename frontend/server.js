// Конфигурация
const BACKEND_URL = 'https://5adeb6a21c5e04ac1a9de293d42fa9ab.serveo.net'; // Замени на свой URL
const TELEGRAM_URL = 'https://t.me/glitch_qzq';

// Текущие настройки
let currentSettings = {
    quality: 'lossless',
    format: '1x1',
    file: null,
    processedBlob: null
};

// Статистика
let stats = {
    processed: 0,
    aiEnhanced: 0,
    timeSaved: 0,
    users: 1
};

// Таймеры
let processTimer = null;
let startTime = null;
let progressInterval = null;

// 🚨 ИСПРАВЛЕННАЯ ИНИЦИАЛИЗАЦИЯ - БЕЗ ПРЕЛОАДЕРА!
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM загружен, запускаем приложение...');
    
    // СРАЗУ скрываем прелоадер
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.display = 'none';
        console.log('✅ Прелоадер скрыт');
    }
    
    // Запускаем приложение
    initializeApp();
});

function initializeApp() {
    console.log('🎯 Инициализация приложения...');
    
    // Настройка обработчиков событий
    setupEventListeners();
    
    // Загрузка статистики
    loadStats();
    
    // Запускаем анимации
    setTimeout(animateCounters, 1000);
    startBackgroundAnimations();
    
    // Проверка бэкенда (в фоне)
    checkBackendConnection();
    
    console.log('✅ Приложение инициализировано!');
}

function startBackgroundAnimations() {
    console.log('🎪 Запуск фоновых анимаций...');
    
    // Анимация появления элементов
    animateOnScroll();
}

function setupEventListeners() {
    console.log('🔧 Настройка обработчиков событий...');
    
    // Рекламные кнопки
    document.getElementById('contactBtn')?.addEventListener('click', openTelegram);
    document.getElementById('adButton')?.addEventListener('click', openTelegram);
    document.getElementById('footerAdBtn')?.addEventListener('click', openTelegram);
    
    // Закрытие рекламы
    document.getElementById('closeAd')?.addEventListener('click', function() {
        const adBanner = document.getElementById('adBanner');
        if (adBanner) {
            adBanner.style.display = 'none';
        }
    });

    // Загрузка файла
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleFileDrop);
        uploadArea.addEventListener('click', () => document.getElementById('fileInput')?.click());
    }

    // Качество обработки
    document.querySelectorAll('.quality-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSettings.quality = this.dataset.quality;
            animateButtonClick(this);
        });
    });

    // Форматы видео
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSettings.format = this.dataset.format;
            animateFormatSelection(this);
        });
    });

    // Кнопки улучшений
    document.getElementById('enhance4kBtn')?.addEventListener('click', () => {
        processWithMode('enhance_4k');
    });
    
    document.getElementById('interpolateBtn')?.addEventListener('click', () => {
        processWithMode('interpolate');
    });

    // Основные действия
    document.getElementById('processBtn')?.addEventListener('click', processVideo);
    document.getElementById('downloadBtn')?.addEventListener('click', downloadResult);
    document.getElementById('processAnotherBtn')?.addEventListener('click', resetToUpload);
}

// Остальные функции остаются без изменений...
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        loadVideoFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '#818cf8';
    event.currentTarget.style.background = 'rgba(129, 140, 248, 0.1)';
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '#6366f1';
    event.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
}

function handleFileDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
        loadVideoFile(file);
    }
    handleDragLeave(event);
}

function loadVideoFile(file) {
    if (!file) return;
    
    // Проверка размера файла
    if (file.size > 100 * 1024 * 1024) {
        showNotification('❌ Файл слишком большой! Максимальный размер: 100MB', 'error');
        return;
    }

    currentSettings.file = file;
    const videoPreview = document.getElementById('videoPreview');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    
    if (previewPlaceholder) previewPlaceholder.style.display = 'none';
    if (videoPreview) {
        videoPreview.src = URL.createObjectURL(file);
        videoPreview.style.display = 'block';
    }
    
    showNotification('✅ Видео успешно загружено!', 'success');
}

async function processVideo() {
    await processWithMode('stretch');
}

async function processWithMode(mode) {
    if (!currentSettings.file) {
        showNotification('❌ Пожалуйста, выберите видео файл', 'error');
        return;
    }

    showProcessing(mode);

    try {
        const formData = new FormData();
        formData.append('video', currentSettings.file);
        formData.append('quality', currentSettings.quality);
        formData.append('format', currentSettings.format);
        formData.append('mode', mode);

        const response = await fetch(`${BACKEND_URL}/api/process`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            const downloadResponse = await fetch(`${BACKEND_URL}${result.download_url}`);
            if (!downloadResponse.ok) {
                throw new Error('Failed to download processed video');
            }
            
            const blob = await downloadResponse.blob();
            showRealResult(blob, result.message);
            
            // Обновляем статистику
            updateProcessingStats();
            
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Processing error:', error);
        hideProcessing();
        showNotification(`❌ Ошибка обработки: ${error.message}`, 'error');
    }
}

function showProcessing(mode) {
    const overlay = document.getElementById('processingOverlay');
    const title = document.getElementById('processingTitle');
    const text = document.getElementById('processingText');
    
    if (!overlay || !title || !text) return;
    
    const modes = {
        stretch: { 
            title: '🎬 Обрабатываю видео...', 
            text: 'Изменяю формат и улучшаю качество' 
        },
        enhance_4k: { 
            title: '🚀 Улучшаю до 4K...', 
            text: 'AI-улучшение разрешения' 
        },
        interpolate: { 
            title: '⚡ Интерполяция 120FPS...', 
            text: 'Создаю плавность видео' 
        }
    };
    
    const modeConfig = modes[mode] || modes.stretch;
    title.textContent = modeConfig.title;
    text.textContent = modeConfig.text;
    
    overlay.style.display = 'flex';
    
    // Сбрасываем прогресс
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0%';
    
    // Запускаем таймер
    startTime = Date.now();
    updateProcessingTime();
    processTimer = setInterval(updateProcessingTime, 1000);
    
    // Запускаем анимацию прогресса
    simulateProgress();
}

function updateProcessingTime() {
    if (!startTime) return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const timeElement = document.getElementById('processingTime');
    if (timeElement) {
        timeElement.textContent = `Время: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function simulateProgress() {
    let progress = 0;
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    progressInterval = setInterval(() => {
        progress += Math.random() * 8;
        if (progress >= 95) {
            progress = 95;
        }
        
        if (progressBar) progressBar.style.width = progress + '%';
        if (progressText) progressText.textContent = Math.round(progress) + '%';
    }, 500);
}

function hideProcessing() {
    const overlay = document.getElementById('processingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    if (processTimer) {
        clearInterval(processTimer);
        processTimer = null;
    }
    
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function showRealResult(blob, message) {
    // Показываем 100% прогресс
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = '100%';
    
    hideProcessing();
    
    const downloadSection = document.getElementById('downloadSection');
    const resultVideo = document.getElementById('resultVideo');
    
    if (downloadSection) downloadSection.style.display = 'block';
    if (resultVideo) {
        resultVideo.src = URL.createObjectURL(blob);
    }
    
    currentSettings.processedBlob = blob;
    showNotification('🎉 Видео успешно обработано!', 'success');
}

function downloadResult() {
    if (currentSettings.processedBlob) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(currentSettings.processedBlob);
        link.download = `videoflow_${currentSettings.format}_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('📥 Началось скачивание файла', 'success');
    } else {
        showNotification('❌ Нет обработанного видео для скачивания', 'error');
    }
}

function resetToUpload() {
    const downloadSection = document.getElementById('downloadSection');
    if (downloadSection) downloadSection.style.display = 'none';
    
    document.getElementById('fileInput').value = '';
    const videoPreview = document.getElementById('videoPreview');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    
    if (videoPreview) videoPreview.style.display = 'none';
    if (previewPlaceholder) previewPlaceholder.style.display = 'flex';
    
    currentSettings.file = null;
    currentSettings.processedBlob = null;
    
    showNotification('🔄 Готов к новой обработке!', 'info');
}

// Анимации
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count')) || 0;
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            counter.textContent = Math.floor(current);
        }, 16);
    });
}

function animateButtonClick(button) {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 150);
}

function animateFormatSelection(element) {
    element.style.transform = 'scale(0.9) rotate(5deg)';
    setTimeout(() => {
        element.style.transform = 'scale(1) rotate(0deg)';
    }, 200);
}

function animateOnScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.control-section, .stat-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

// Уведомления
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#6366f1'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Закрытие по клику
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Авто-закрытие
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Рекламные функции
function openTelegram() {
    const button = event?.currentTarget;
    if (button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    }
    
    showNotification('📨 Открываю Telegram...', 'info');
    setTimeout(() => {
        window.open(TELEGRAM_URL, '_blank');
    }, 500);
}

// Вспомогательные функции
async function checkBackendConnection() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/health`);
        if (response.ok) {
            console.log('✅ Backend connection: OK');
        } else {
            console.warn('⚠️ Backend connection: Weak');
        }
    } catch (error) {
        console.error('❌ Backend connection: FAILED');
    }
}

function loadStats() {
    const savedStats = localStorage.getItem('videoEditorStats');
    if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        stats = { ...stats, ...parsedStats };
    }
    updateStats();
}

function updateStats() {
    const processedCount = document.getElementById('processedCount');
    const aiEnhancedCount = document.getElementById('aiEnhancedCount');
    const timeSaved = document.getElementById('timeSaved');
    const userCount = document.getElementById('userCount');
    
    if (processedCount) processedCount.textContent = stats.processed;
    if (aiEnhancedCount) aiEnhancedCount.textContent = stats.aiEnhanced;
    if (timeSaved) timeSaved.textContent = stats.timeSaved;
    if (userCount) userCount.textContent = stats.users;
}

function updateProcessingStats() {
    stats.processed++;
    if (currentSettings.quality === 'ai') {
        stats.aiEnhanced++;
    }
    stats.timeSaved += 3;
    updateStats();
    saveStats();
}

function saveStats() {
    localStorage.setItem('videoEditorStats', JSON.stringify(stats));
}

// Глобальные функции
window.openTelegram = openTelegram;

// Добавляем CSS для уведомлений
const notificationStyles = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #6366f1;
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    max-width: 400px;
}

.notification-success {
    background: #10b981;
}

.notification-error {
    background: #ef4444;
}

.notification-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
}

.notification-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 5px;
    opacity: 0.7;
    transition: opacity 0.3s ease;
    font-size: 18px;
}

.notification-close:hover {
    opacity: 1;
}

@media (max-width: 768px) {
    .notification {
        right: 10px;
        left: 10px;
        max-width: none;
    }
}
`;

// Добавляем стили в DOM
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

console.log('🎉 Script loaded successfully!');

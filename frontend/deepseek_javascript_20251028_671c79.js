// Конфигурация
const BACKEND_URL = 'https://your-app-name.onrender.com'; // Замени на свой URL
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

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Скрываем прелоадер через 2 секунды
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        preloader.classList.add('fade-out');
        setTimeout(() => {
            preloader.style.display = 'none';
            // Запускаем анимации после загрузки
            startBackgroundAnimations();
        }, 500);
    }, 2000);

    // Запускаем анимации счетчиков
    setTimeout(animateCounters, 1000);
    
    // Настройка обработчиков событий
    setupEventListeners();
    
    // Загрузка статистики
    loadStats();
    
    // Проверка соединения с бэкендом
    await checkBackendConnection();
}

function startBackgroundAnimations() {
    // Анимация появления элементов
    animateOnScroll();
    
    // Запуск парящих анимаций
    const floatingCards = document.querySelectorAll('.floating-card');
    floatingCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 2}s`;
    });
}

function setupEventListeners() {
    // Рекламные кнопки
    document.getElementById('contactBtn').addEventListener('click', openTelegram);
    document.getElementById('adButton').addEventListener('click', openTelegram);
    document.getElementById('footerAdBtn').addEventListener('click', openTelegram);
    
    // Закрытие рекламы
    document.getElementById('closeAd').addEventListener('click', function() {
        const adBanner = document.getElementById('adBanner');
        adBanner.style.transform = 'translateY(-100%)';
        adBanner.style.opacity = '0';
        setTimeout(() => {
            adBanner.style.display = 'none';
        }, 500);
    });

    // Загрузка файла
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    uploadArea.addEventListener('click', () => document.getElementById('fileInput').click());

    // Качество обработки
    document.querySelectorAll('.quality-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.quality-btn').forEach(b => {
                b.classList.remove('active');
                b.style.transform = 'scale(1)';
            });
            this.classList.add('active');
            currentSettings.quality = this.dataset.quality;
            
            // Анимация выбора
            animateButtonClick(this);
            
            // Показать уведомление для AI режима
            if (this.dataset.quality === 'ai') {
                showNotification('🤖 Включен режим AI-улучшения!', 'success');
            }
        });
    });

    // Форматы видео
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.format-btn').forEach(b => {
                b.classList.remove('active');
                b.style.transform = 'scale(1)';
            });
            this.classList.add('active');
            currentSettings.format = this.dataset.format;
            
            // Анимация выбора формата
            animateFormatSelection(this);
        });
    });

    // Кнопки улучшений
    document.getElementById('enhance4kBtn').addEventListener('click', () => {
        animateButtonClick(document.getElementById('enhance4kBtn'));
        processWithMode('enhance_4k');
    });
    
    document.getElementById('interpolateBtn').addEventListener('click', () => {
        animateButtonClick(document.getElementById('interpolateBtn'));
        processWithMode('interpolate');
    });

    // Основные действия
    document.getElementById('processBtn').addEventListener('click', processVideo);
    document.getElementById('downloadBtn').addEventListener('click', downloadResult);
    document.getElementById('processAnotherBtn').addEventListener('click', resetToUpload);

    // Обработка drag and drop
    setupDragAndDrop();
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('uploadArea');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropZone.style.borderColor = '#818cf8';
        dropZone.style.background = 'rgba(129, 140, 248, 0.1)';
        dropZone.style.transform = 'scale(1.02)';
    }
    
    function unhighlight() {
        dropZone.style.borderColor = '#6366f1';
        dropZone.style.background = 'rgba(255, 255, 255, 0.05)';
        dropZone.style.transform = 'scale(1)';
    }
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
    
    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('video/')) {
                loadVideoFile(file);
            } else {
                showNotification('❌ Пожалуйста, выберите видео файл', 'error');
            }
        }
    }
}

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
    // Проверка размера файла (100MB максимум)
    if (file.size > 100 * 1024 * 1024) {
        showNotification('❌ Файл слишком большой! Максимальный размер: 100MB', 'error');
        return;
    }

    // Проверка типа файла
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('❌ Неподдерживаемый формат файла', 'error');
        return;
    }

    currentSettings.file = file;
    const videoPreview = document.getElementById('videoPreview');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    
    // Анимация появления превью
    previewPlaceholder.style.opacity = '0';
    setTimeout(() => {
        previewPlaceholder.style.display = 'none';
        videoPreview.src = URL.createObjectURL(file);
        videoPreview.style.display = 'block';
        videoPreview.style.opacity = '0';
        
        setTimeout(() => {
            videoPreview.style.opacity = '1';
            videoPreview.style.transform = 'scale(1)';
        }, 50);
    }, 300);

    // Показываем информацию о файле
    showFileInfo(file);
    
    // Скрываем секцию скачивания если она была открыта
    hideDownloadSection();
    
    // Показываем уведомление
    showNotification('✅ Видео успешно загружено!', 'success');
}

function showFileInfo(file) {
    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    fileInfo.innerHTML = `
        <div class="file-info-content">
            <i class="fas fa-file-video"></i>
            <div class="file-details">
                <strong>${file.name}</strong>
                <span>${fileSize} MB</span>
            </div>
        </div>
    `;
    
    const existingInfo = document.querySelector('.file-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    document.querySelector('.preview-section').appendChild(fileInfo);
    
    // Анимация появления
    fileInfo.style.opacity = '0';
    fileInfo.style.transform = 'translateY(20px)';
    setTimeout(() => {
        fileInfo.style.opacity = '1';
        fileInfo.style.transform = 'translateY(0)';
    }, 100);
}

async function processVideo() {
    await processWithMode('stretch');
}

async function processWithMode(mode) {
    if (!currentSettings.file) {
        showNotification('❌ Пожалуйста, выберите видео файл', 'error');
        return;
    }

    // Анимация кнопки
    const processBtn = document.getElementById('processBtn');
    animateButtonClick(processBtn);

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
            // Скачиваем результат
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
    
    const modes = {
        stretch: { 
            title: '🎬 AI обрабатывает видео...', 
            text: 'Нейросети улучшают качество и применяют эффекты' 
        },
        enhance_4k: { 
            title: '🚀 Улучшаю до 4K...', 
            text: 'AI-улучшение разрешения и деталей' 
        },
        interpolate: { 
            title: '⚡ Интерполяция 120FPS...', 
            text: 'Создаю плавность с помощью AI-алгоритмов' 
        }
    };
    
    const modeConfig = modes[mode] || modes.stretch;
    title.textContent = modeConfig.title;
    text.textContent = modeConfig.text;
    
    // Анимация появления
    overlay.style.display = 'flex';
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
    
    // Сбрасываем прогресс
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
    document.getElementById('processingTime').textContent = 'Время: 0с';
    
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
    
    document.getElementById('processingTime').textContent = 
        `Время: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function simulateProgress() {
    let progress = 0;
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    // Очищаем предыдущий интервал
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    progressInterval = setInterval(() => {
        progress += Math.random() * 8;
        if (progress >= 95) {
            progress = 95; // Останавливаемся на 95% до реального завершения
        }
        
        progressBar.style.width = progress + '%';
        progressText.textContent = Math.round(progress) + '%';
    }, 500);
}

function hideProcessing() {
    const overlay = document.getElementById('processingOverlay');
    
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 500);
    
    // Очищаем таймеры
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
    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('progressText').textContent = '100%';
    
    // Скрываем обработку
    hideProcessing();
    
    // Показываем секцию скачивания с анимацией
    const downloadSection = document.getElementById('downloadSection');
    downloadSection.style.display = 'block';
    downloadSection.style.opacity = '0';
    downloadSection.style.transform = 'translateY(50px)';
    
    setTimeout(() => {
        downloadSection.style.opacity = '1';
        downloadSection.style.transform = 'translateY(0)';
    }, 100);
    
    // Показываем результат
    const resultVideo = document.getElementById('resultVideo');
    resultVideo.src = URL.createObjectURL(blob);
    
    // Сохраняем blob для скачивания
    currentSettings.processedBlob = blob;
    
    // Показываем уведомление об успехе
    showNotification('🎉 Видео успешно обработано!', 'success');
    
    // Прокручиваем к результату
    downloadSection.scrollIntoView({ behavior: 'smooth' });
}

function downloadResult() {
    if (currentSettings.processedBlob) {
        // Анимация кнопки скачивания
        const downloadBtn = document.getElementById('downloadBtn');
        animateButtonClick(downloadBtn);
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(currentSettings.processedBlob);
        link.download = `videoflow_${currentSettings.format}_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Показываем уведомление
        showNotification('📥 Началось скачивание файла', 'success');
    } else {
        showNotification('❌ Нет обработанного видео для скачивания', 'error');
    }
}

function resetToUpload() {
    const downloadSection = document.getElementById('downloadSection');
    
    // Анимация скрытия
    downloadSection.style.opacity = '0';
    downloadSection.style.transform = 'translateY(50px)';
    
    setTimeout(() => {
        downloadSection.style.display = 'none';
        
        // Сбрасываем состояние
        document.getElementById('fileInput').value = '';
        document.getElementById('videoPreview').style.display = 'none';
        document.getElementById('previewPlaceholder').style.display = 'flex';
        
        // Удаляем информацию о файле
        const fileInfo = document.querySelector('.file-info');
        if (fileInfo) {
            fileInfo.remove();
        }
        
        // Сбрасываем настройки
        currentSettings.file = null;
        currentSettings.processedBlob = null;
        
        // Показываем уведомление
        showNotification('🔄 Готов к новой обработке!', 'info');
        
        // Прокручиваем к верху
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 500);
}

function hideDownloadSection() {
    const downloadSection = document.getElementById('downloadSection');
    if (downloadSection.style.display !== 'none') {
        downloadSection.style.opacity = '0';
        setTimeout(() => {
            downloadSection.style.display = 'none';
        }, 500);
    }
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
    
    document.querySelectorAll('.control-section, .stat-card, .floating-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

// Уведомления
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Добавляем стили
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
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// Рекламные функции
function openTelegram() {
    const button = event.currentTarget;
    
    // Анимация кнопки
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
        
        // Показываем уведомление
        showNotification('📨 Открываю Telegram...', 'info');
        
        // Открываем ссылку
        setTimeout(() => {
            window.open(TELEGRAM_URL, '_blank');
        }, 500);
    }, 150);
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
        console.error('❌ Backend connection: FAILED -', error.message);
        showNotification('⚠️ Бэкенд временно недоступен', 'error');
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
    document.getElementById('processedCount').textContent = stats.processed;
    document.getElementById('aiEnhancedCount').textContent = stats.aiEnhanced;
    document.getElementById('timeSaved').textContent = stats.timeSaved;
    document.getElementById('userCount').textContent = stats.users;
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

// Глобальные функции для использования в HTML
window.openTelegram = openTelegram;

// Обработка ошибок
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification('❌ Произошла непредвиденная ошибка', 'error');
});

// Предотвращение выхода без сохранения
window.addEventListener('beforeunload', function(e) {
    if (currentSettings.file && !currentSettings.processedBlob) {
        e.preventDefault();
        e.returnValue = 'У вас есть необработанное видео. Вы уверены, что хотите уйти?';
    }
});

// Адаптивность для мобильных устройств
function checkMobile() {
    if (window.innerWidth < 768) {
        document.body.classList.add('mobile');
    } else {
        document.body.classList.remove('mobile');
    }
}

window.addEventListener('resize', checkMobile);
checkMobile();

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
}

.notification-close:hover {
    opacity: 1;
}

@media (max-width: 768px) {
    .notification {
        right: 10px;
        left: 10px;
        max-width: none;
        transform: translateY(-100px);
    }
}
`;

// Добавляем стили в DOM
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
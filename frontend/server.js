// Конфигурация - ЗАМЕНИ НА СВОЙ URL С RENDER
const BACKEND_URL = 'https://5adeb6a21c5e04ac1a9de293d42fa9ab.serveo.net'; // Замени на свой URL

// Текущие настройки
let currentSettings = {
    quality: 'lossless',
    format: '1x1',
    sendAs: 'video',
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
let progressTimer = null;
let startTime = null;
let currentProgress = 0;
let currentStep = 1;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Показываем прелоадер
    showPreloader();
    
    // Загружаем статистику
    loadStats();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Проверяем подключение к бэкенду
    await checkBackendConnection();
    
    // Скрываем прелоадер через 2 секунды (или после загрузки)
    setTimeout(() => {
        hidePreloader();
        showMainContent();
    }, 2000);
}

function showPreloader() {
    const preloader = document.getElementById('preloader');
    preloader.style.display = 'flex';
}

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    preloader.classList.add('fade-out');
    setTimeout(() => {
        preloader.style.display = 'none';
    }, 500);
}

function showMainContent() {
    const mainContent = document.getElementById('mainContent');
    mainContent.style.opacity = '1';
}

function setupEventListeners() {
    // Загрузка файла
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    uploadArea.addEventListener('click', () => fileInput.click());

    // Качество
    document.querySelectorAll('.quality-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSettings.quality = this.dataset.quality;
            
            // Анимация выбора
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });

    // Форматы
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSettings.format = this.dataset.format;
            
            // Анимация выбора
            animateButton(this);
        });
    });

    // Дополнительные кнопки
    document.getElementById('enhance4kBtn').addEventListener('click', () => {
        animateButton(document.getElementById('enhance4kBtn'));
        processWithMode('enhance_4k');
    });
    
    document.getElementById('interpolateBtn').addEventListener('click', () => {
        animateButton(document.getElementById('interpolateBtn'));
        processWithMode('interpolate');
    });
    
    // Экспорт
    document.getElementById('sendAsVideoBtn').addEventListener('click', function() {
        currentSettings.sendAs = 'video';
        this.classList.add('active');
        document.getElementById('sendAsFileBtn').classList.remove('active');
        animateButton(this);
    });
    
    document.getElementById('sendAsFileBtn').addEventListener('click', function() {
        currentSettings.sendAs = 'file';
        this.classList.add('active');
        document.getElementById('sendAsVideoBtn').classList.remove('active');
        animateButton(this);
    });

    // Основная обработка
    document.getElementById('processBtn').addEventListener('click', processVideo);
    document.getElementById('downloadBtn').addEventListener('click', downloadResult);
    document.getElementById('processAnotherBtn').addEventListener('click', resetToUpload);

    // Модальные окна
    document.getElementById('modalClose').addEventListener('click', hideProcessingModal);
    document.getElementById('resultClose').addEventListener('click', hideResultModal);

    // Навигационные кнопки
    document.getElementById('statsBtn').addEventListener('click', showStats);
    document.getElementById('helpBtn').addEventListener('click', showHelp);
}

function animateButton(button) {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 150);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        loadVideoFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.add('dragover');
    uploadArea.style.borderColor = '#6366f1';
    uploadArea.style.transform = 'scale(1.02)';
}

function handleDragLeave(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('dragover');
    uploadArea.style.borderColor = '';
    uploadArea.style.transform = 'scale(1)';
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
        showNotification('Файл слишком большой! Максимальный размер: 100MB', 'error');
        return;
    }

    // Проверка типа файла
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Неподдерживаемый формат файла. Используйте MP4, AVI, MOV, MKV или WEBM', 'error');
        return;
    }

    currentSettings.file = file;
    const videoPreview = document.getElementById('videoPreview');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const fileInfo = document.getElementById('fileInfo');
    const previewSection = document.getElementById('previewSection');
    
    // Показываем секцию превью
    previewSection.style.display = 'block';
    
    // Создаем URL для превью
    videoPreview.src = URL.createObjectURL(file);
    videoPreview.style.display = 'block';
    previewPlaceholder.style.display = 'none';
    
    // Показываем информацию о файле
    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
    const fileName = file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name;
    fileInfo.textContent = `${fileName} • ${fileSize} MB • ${file.type.split('/')[1].toUpperCase()}`;
    
    // Скрываем секцию результата если она была открыта
    hideResultModal();
    
    // Показываем уведомление
    showNotification('Видео успешно загружено!', 'success');
    
    // Автоматически воспроизводим превью
    setTimeout(() => {
        videoPreview.play().catch(e => console.log('Автовоспроизведение заблокировано'));
    }, 500);
}

async function processVideo() {
    await processWithMode('stretch');
}

async function processWithMode(mode) {
    if (!currentSettings.file) {
        showNotification('Пожалуйста, выберите видео файл!', 'warning');
        return;
    }

    showProcessingModal(mode);

    try {
        const formData = new FormData();
        formData.append('video', currentSettings.file);
        formData.append('quality', currentSettings.quality);
        formData.append('format', currentSettings.format);
        formData.append('mode', mode);

        // Симулируем прогресс для демонстрации
        simulateProgress();
        
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
            showResult(blob, result.message, result);
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Processing error:', error);
        hideProcessingModal();
        showNotification(`Ошибка обработки: ${error.message}`, 'error');
    }
}

function showProcessingModal(mode) {
    const modal = document.getElementById('processingModal');
    const title = document.getElementById('modalTitle');
    const message = document.getElementById('processingMessage');
    const submessage = document.getElementById('processingSubmessage');
    
    const modes = {
        stretch: { 
            title: '🎬 Растягиваю видео', 
            message: 'Изменяю формат без потерь качества',
            submessage: 'AI-алгоритмы оптимизируют результат' 
        },
        enhance_4k: { 
            title: '🚀 Улучшаю до 4K', 
            message: 'AI-улучшение разрешения и деталей',
            submessage: 'Нейросети работают над качеством' 
        },
        interpolate: { 
            title: '⚡ Интерполирую кадры', 
            message: 'Создаю плавность 120FPS',
            submessage: 'Дорисовываю промежуточные кадры' 
        }
    };
    
    const modeConfig = modes[mode] || modes.stretch;
    title.textContent = modeConfig.title;
    message.textContent = modeConfig.message;
    submessage.textContent = modeConfig.submessage;
    
    modal.style.display = 'flex';
    
    // Сбрасываем прогресс
    resetProgress();
    
    // Запускаем таймер
    startTime = Date.now();
    updateProcessingTime();
    processTimer = setInterval(updateProcessingTime, 1000);
}

function hideProcessingModal() {
    const modal = document.getElementById('processingModal');
    modal.style.display = 'none';
    
    if (processTimer) {
        clearInterval(processTimer);
        processTimer = null;
    }
    
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }
}

function resetProgress() {
    currentProgress = 0;
    currentStep = 1;
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressPercent').textContent = '0%';
    document.querySelectorAll('.progress-step').forEach(step => {
        step.classList.remove('active');
    });
    document.querySelector('.progress-step[data-step="1"]').classList.add('active');
}

function simulateProgress() {
    progressTimer = setInterval(() => {
        if (currentProgress < 100) {
            currentProgress += Math.random() * 5;
            if (currentProgress > 100) currentProgress = 100;
            
            updateProgressBar(currentProgress);
            
            // Обновляем шаги прогресса
            if (currentProgress >= 25 && currentStep === 1) {
                currentStep = 2;
                document.querySelector('.progress-step[data-step="2"]').classList.add('active');
            } else if (currentProgress >= 50 && currentStep === 2) {
                currentStep = 3;
                document.querySelector('.progress-step[data-step="3"]').classList.add('active');
            } else if (currentProgress >= 75 && currentStep === 3) {
                currentStep = 4;
                document.querySelector('.progress-step[data-step="4"]').classList.add('active');
            }
        } else {
            clearInterval(progressTimer);
        }
    }, 200);
}

function updateProgressBar(progress) {
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    
    progressFill.style.width = progress + '%';
    progressPercent.textContent = Math.round(progress) + '%';
}

function updateProcessingTime() {
    if (!startTime) return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    // Можно добавить отображение времени в модальном окне
}

function showResult(blob, message, result) {
    hideProcessingModal();
    
    // Показываем 100% прогресс
    updateProgressBar(100);
    
    const modal = document.getElementById('resultModal');
    const resultMessage = document.getElementById('resultMessage');
    const resultDetails = document.getElementById('resultDetails');
    const resultVideo = document.getElementById('resultVideo');
    
    resultMessage.textContent = message;
    
    // Добавляем детали если есть
    if (result) {
        let details = [];
        if (result.original_resolution) details.push(`Исходник: ${result.original_resolution}`);
        if (result.processed_resolution) details.push(`Результат: ${result.processed_resolution}`);
        if (result.processing_time) details.push(`Время: ${result.processing_time.toFixed(1)}с`);
        
        resultDetails.textContent = details.join(' • ');
    }
    
    resultVideo.src = URL.createObjectURL(blob);
    
    // Сохраняем blob для скачивания
    currentSettings.processedBlob = blob;
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Обновляем статистику
    if (currentSettings.quality === 'ai') {
        stats.aiEnhanced++;
    }
    stats.processed++;
    stats.timeSaved += 3;
    updateStats();
    saveStats();
    
    // Показываем уведомление
    showNotification('Обработка завершена успешно!', 'success');
}

function hideResultModal() {
    const modal = document.getElementById('resultModal');
    modal.style.display = 'none';
}

function downloadResult() {
    if (currentSettings.processedBlob) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(currentSettings.processedBlob);
        link.download = `videomagic_${currentSettings.format}_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Видео скачивается...', 'success');
    }
}

function resetToUpload() {
    hideResultModal();
    
    // Сбрасываем превью
    const previewSection = document.getElementById('previewSection');
    const videoPreview = document.getElementById('videoPreview');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const fileInfo = document.getElementById('fileInfo');
    const fileInput = document.getElementById('fileInput');
    
    previewSection.style.display = 'none';
    videoPreview.style.display = 'none';
    previewPlaceholder.style.display = 'flex';
    fileInfo.textContent = '';
    fileInput.value = '';
    
    currentSettings.file = null;
    currentSettings.processedBlob = null;
    
    showNotification('Готово к новой обработке!', 'info');
}

function showStats() {
    showNotification(`Статистика: ${stats.processed} видео обработано, ${stats.timeSaved} минут сэкономлено`, 'info');
}

function showHelp() {
    showNotification('💡 Просто загрузите видео, выберите настройки и нажмите "Обработать"!', 'info');
}

// Уведомления
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Добавляем стили
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        max-width: 400px;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);
    
    // Кнопка закрытия
    notification.querySelector('.notification-close').addEventListener('click', () => {
        hideNotification(notification);
    });
    
    // Автоматическое скрытие
    setTimeout(() => {
        hideNotification(notification);
    }, 5000);
}

function hideNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        success: 'linear-gradient(135deg, #10b981, #059669)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        info: 'linear-gradient(135deg, #6366f1, #4f46e5)'
    };
    return colors[type] || colors.info;
}

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
        showNotification('Не удалось подключиться к серверу обработки', 'warning');
    }
}

function loadStats() {
    const savedStats = localStorage.getItem('videoEditorStats');
    if (savedStats) {
        stats = JSON.parse(savedStats);
    }
    updateStats();
}

function updateStats() {
    document.getElementById('processedCount').textContent = stats.processed;
    document.getElementById('aiEnhancedCount').textContent = stats.aiEnhanced;
    document.getElementById('timeSaved').textContent = stats.timeSaved;
    document.getElementById('userCount').textContent = stats.users;
}

function saveStats() {
    localStorage.setItem('videoEditorStats', JSON.stringify(stats));
}

// Анимации при загрузке
setTimeout(() => {
    document.querySelectorAll('.control-card').forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.5s ease';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50);
        }, index * 100);
    });
}, 500);

// Параллакс эффект для фона
document.addEventListener('mousemove', (e) => {
    const particles = document.querySelectorAll('.bg-particle');
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    particles.forEach((particle, index) => {
        const speed = (index + 1) * 0.5;
        const x = (mouseX - 0.5) * speed * 20;
        const y = (mouseY - 0.5) * speed * 20;
        
        particle.style.transform = `translate(${x}px, ${y}px)`;
    });
});

// Конфигурация - ЗАМЕНИ НА СВОЙ URL
const BACKEND_URL = 'https://5adeb6a21c5e04ac1a9de293d42fa9ab.serveo.net'; // Твой бэкенд на Render

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
let startTime = null;
let progressInterval = null;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    createFloatingElements();
    loadStats();
    setupEventListeners();
    checkBackendConnection();
    animateElements();
});

// Функции для анимаций (остаются те же)
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 4 + 1;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = Math.random() * 10 + 5;
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.animationDuration = `${duration}s`;
        particle.style.opacity = Math.random() * 0.3 + 0.1;
        
        particlesContainer.appendChild(particle);
    }
}

function createFloatingElements() {
    const container = document.getElementById('floatingElements');
    const elementCount = 8;
    
    for (let i = 0; i < elementCount; i++) {
        const element = document.createElement('div');
        element.className = 'floating-element';
        
        const size = Math.random() * 100 + 50;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = Math.random() * 15 + 10;
        
        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
        element.style.left = `${posX}%`;
        element.style.top = `${posY}%`;
        element.style.animationDelay = `${delay}s`;
        element.style.animationDuration = `${duration}s`;
        element.style.background = `radial-gradient(circle, var(--primary) 0%, transparent 70%)`;
        
        container.appendChild(element);
    }
}

function animateElements() {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// РЕАЛЬНАЯ ЛОГИКА ОБРАБОТКИ
function setupEventListeners() {
    // Загрузка файла
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    uploadArea.addEventListener('click', () => document.getElementById('fileInput').click());

    // Качество
    document.querySelectorAll('.quality-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSettings.quality = this.dataset.quality;
        });
    });

    // Форматы
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSettings.format = this.dataset.format;
        });
    });

    // Дополнительные кнопки
    document.getElementById('enhance4kBtn').addEventListener('click', () => processWithMode('enhance_4k'));
    document.getElementById('interpolateBtn').addEventListener('click', () => processWithMode('interpolate'));
    
    document.getElementById('sendAsVideoBtn').addEventListener('click', function() {
        currentSettings.sendAs = 'video';
        this.classList.add('active');
        document.getElementById('sendAsFileBtn').classList.remove('active');
    });
    
    document.getElementById('sendAsFileBtn').addEventListener('click', function() {
        currentSettings.sendAs = 'file';
        this.classList.add('active');
        document.getElementById('sendAsVideoBtn').classList.remove('active');
    });

    // Основная обработка
    document.getElementById('processBtn').addEventListener('click', processVideo);
    document.getElementById('downloadBtn').addEventListener('click', downloadResult);
    document.getElementById('processAnotherBtn').addEventListener('click', resetToUpload);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        loadVideoFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = 'var(--primary-light)';
    event.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = 'var(--primary)';
    event.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
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
        alert('Файл слишком большой! Максимальный размер: 100MB');
        return;
    }

    // Проверка типа файла
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
        alert('Неподдерживаемый формат видео. Используйте MP4, AVI, MOV, MKV или WEBM');
        return;
    }

    currentSettings.file = file;
    const videoPreview = document.getElementById('videoPreview');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const fileInfo = document.getElementById('fileInfo');
    
    videoPreview.src = URL.createObjectURL(file);
    videoPreview.style.display = 'block';
    previewPlaceholder.style.display = 'none';
    
    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
    fileInfo.innerHTML = `
        <strong>${file.name}</strong><br>
        Размер: ${fileSize} MB • Тип: ${file.type.split('/')[1].toUpperCase()}
    `;
    fileInfo.style.display = 'block';
    
    document.getElementById('downloadSection').style.display = 'none';
}

async function processVideo() {
    await processWithMode('stretch');
}

async function processWithMode(mode) {
    if (!currentSettings.file) {
        showNotification('Пожалуйста, выберите видео файл!', 'error');
        return;
    }

    showProcessing(mode);

    const formData = new FormData();
    formData.append('video', currentSettings.file);
    formData.append('quality', currentSettings.quality);
    formData.append('format', currentSettings.format);
    formData.append('mode', mode);

    try {
        const response = await fetch(`${BACKEND_URL}/api/process`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            // Скачиваем результат
            const downloadResponse = await fetch(`${BACKEND_URL}${result.download_url}`);
            if (!downloadResponse.ok) {
                throw new Error('Не удалось скачать обработанное видео');
            }
            
            const blob = await downloadResponse.blob();
            showRealResult(blob, result);
        } else {
            throw new Error(result.error || 'Произошла неизвестная ошибка');
        }
    } catch (error) {
        console.error('Processing error:', error);
        hideProcessing();
        showNotification(`Ошибка обработки: ${error.message}`, 'error');
    }
}

function showProcessing(mode) {
    const overlay = document.getElementById('processingOverlay');
    const title = document.getElementById('processingTitle');
    const text = document.getElementById('processingText');
    const details = document.getElementById('processingDetails');
    
    const modes = {
        stretch: { 
            title: '🔄 Растягиваю видео...', 
            text: 'Изменяю формат без потерь качества',
            details: `Формат: ${currentSettings.format} • Качество: ${getQualityName(currentSettings.quality)}`
        },
        enhance_4k: { 
            title: '🚀 Улучшаю до 4K...', 
            text: 'AI-улучшение разрешения и деталей',
            details: 'Разрешение: 3840×2160 • AI-обработка'
        },
        interpolate: { 
            title: '🎬 Интерполяция кадров...', 
            text: 'Создаю плавность 120FPS',
            details: 'Частота кадров: 120 FPS • AI-интерполяция'
        }
    };
    
    const modeConfig = modes[mode] || modes.stretch;
    title.textContent = modeConfig.title;
    text.textContent = modeConfig.text;
    details.textContent = modeConfig.details;
    overlay.style.display = 'flex';
    
    // Сбрасываем прогресс
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
    document.getElementById('processingTime').textContent = '';
    
    // Запускаем таймер
    startTime = Date.now();
    updateProcessingTime();
    processTimer = setInterval(updateProcessingTime, 1000);
    
    // Симуляция прогресса (в реальном приложении можно сделать WebSocket для реального прогресса)
    simulateProgress();
}

function getQualityName(quality) {
    const names = {
        'lossless': 'Без сжатия',
        'compressed': 'Сжатие',
        'ai': 'AI-улучшение'
    };
    return names[quality] || quality;
}

function updateProcessingTime() {
    if (!startTime) return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('processingTime').textContent = 
        `Прошло: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function simulateProgress() {
    let progress = 0;
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    progressInterval = setInterval(() => {
        progress += Math.random() * 5 + 2;
        if (progress >= 90) {
            progress = 90; // Останавливаемся на 90% до реального завершения
        }
        
        progressBar.style.width = progress + '%';
        progressText.textContent = Math.round(progress) + '%';
    }, 800);
}

function hideProcessing() {
    const overlay = document.getElementById('processingOverlay');
    overlay.style.display = 'none';
    
    if (processTimer) {
        clearInterval(processTimer);
        processTimer = null;
    }
    
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function showRealResult(blob, result) {
    hideProcessing();
    
    // Показываем 100% прогресс
    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('progressText').textContent = '100%';
    
    document.getElementById('downloadSection').style.display = 'block';
    
    const resultVideo = document.getElementById('resultVideo');
    resultVideo.src = URL.createObjectURL(blob);
    
    // Показываем информацию о результате
    const resultInfo = document.getElementById('resultInfo');
    if (result.processing_time) {
        resultInfo.innerHTML = `
            ✅ Видео успешно обработано за ${result.processing_time} секунд<br>
            📊 ${result.original_resolution} → ${result.processed_resolution}
        `;
    } else {
        resultInfo.innerHTML = '✅ Видео успешно обработано!';
    }
    
    // Сохраняем blob для скачивания
    currentSettings.processedBlob = blob;
    
    // Обновляем статистику
    if (currentSettings.quality === 'ai') {
        stats.aiEnhanced++;
    }
    stats.processed++;
    stats.timeSaved += Math.floor((result.processing_time || 10) / 60) + 1;
    updateStats();
    saveStats();
    
    showNotification('Видео успешно обработано!', 'success');
}

function downloadResult() {
    if (currentSettings.processedBlob) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(currentSettings.processedBlob);
        link.download = `vision_pro_${currentSettings.format}_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Видео скачивается...', 'success');
    }
}

function resetToUpload() {
    document.getElementById('downloadSection').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('videoPreview').style.display = 'none';
    document.getElementById('previewPlaceholder').style.display = 'flex';
    document.getElementById('resultInfo').innerHTML = '';
    
    currentSettings.file = null;
    currentSettings.processedBlob = null;
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
        showNotification('Бэкенд недоступен. Проверьте подключение.', 'error');
    }
}

function showNotification(message, type = 'info') {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
            ${message}
        </div>
    `;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем через 5 секунд
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
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

// Добавляем стили для уведомлений
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        transition: all 0.3s ease;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(notificationStyles);ment.getElementById('fileInfo').style.display = 'none';
    document.getElementById('videoPreview').style.display = 'none';
    document.getElementById('previewPlaceholder').style.display = 'flex';
    
    currentSettings.file = null;
    currentSettings.processedBlob = null;
}

async function checkBackendConnection() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/health`);
        if (response.ok) {
            console.log('Backend connection: OK');
        } else {
            console.warn('Backend connection: Weak');
        }
    } catch (error) {
        console.error('Backend connection: FAILED -', error.message);
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
    document.querySelectorAll('.control-section').forEach((section, index) => {
        setTimeout(() => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            section.style.transition = 'all 0.5s ease';
            setTimeout(() => {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, 50);
        }, index * 100);
    });
}, 500);

// Конфигурация - ЗАМЕНИ НА СВОЙ URL С RENDER
const BACKEND_URL = 'https://b828b8021cb6cee2539b33ff1876e0c7.serveo.net'; // Замени на свой URL

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

// Таймер обработки
let processTimer = null;
let startTime = null;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    setupEventListeners();
    checkBackendConnection();
});

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
    event.currentTarget.style.borderColor = '#6366f1';
    event.currentTarget.style.background = '#f0f4ff';
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '#6366f1';
    event.currentTarget.style.background = '#f8faff';
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

    currentSettings.file = file;
    const videoPreview = document.getElementById('videoPreview');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const fileInfo = document.getElementById('fileInfo');
    
    videoPreview.src = URL.createObjectURL(file);
    videoPreview.style.display = 'block';
    previewPlaceholder.style.display = 'none';
    
    // Показываем информацию о файле
    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
    fileInfo.textContent = `${file.name} (${fileSize} MB)`;
    fileInfo.style.display = 'block';
    
    // Скрываем секцию скачивания если она была открыта
    document.getElementById('downloadSection').style.display = 'none';
}

async function processVideo() {
    await processWithMode('stretch');
}

async function processWithMode(mode) {
    if (!currentSettings.file) {
        alert('Пожалуйста, выберите видео файл!');
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
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Processing error:', error);
        hideProcessing();
        alert(`Ошибка обработки: ${error.message}\n\nПроверьте подключение к интернету и попробуйте снова.`);
    }
}

function showProcessing(mode) {
    const overlay = document.getElementById('processingOverlay');
    const title = document.getElementById('processingTitle');
    const text = document.getElementById('processingText');
    
    const modes = {
        stretch: { 
            title: '🔄 Растягиваю видео...', 
            text: 'Изменяю формат без потерь качества' 
        },
        enhance_4k: { 
            title: '🚀 Улучшаю до 4K...', 
            text: 'AI-улучшение разрешения и деталей' 
        },
        interpolate: { 
            title: '🎬 Интерполирую кадры...', 
            text: 'Создаю плавность 120FPS' 
        },
        ai_enhance: { 
            title: '🤖 AI-улучшение...', 
            text: 'Нейросети работают над качеством' 
        }
    };
    
    const modeConfig = modes[mode] || modes.stretch;
    title.textContent = modeConfig.title;
    text.textContent = modeConfig.text;
    overlay.style.display = 'flex';
    
    // Сбрасываем прогресс
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
    document.getElementById('processingTime').textContent = '';
    
    // Запускаем таймер
    startTime = Date.now();
    updateProcessingTime();
    processTimer = setInterval(updateProcessingTime, 1000);
    
    // Симуляция прогресса (в реальном приложении будет реальный прогресс с бэкенда)
    simulateProgress();
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
    
    const interval = setInterval(() => {
        progress += Math.random() * 8;
        if (progress >= 95) {
            progress = 95; // Останавливаемся на 95% до реального завершения
        }
        
        progressBar.style.width = progress + '%';
        progressText.textContent = Math.round(progress) + '%';
    }, 500);
    
    // Сохраняем ID интервала для очистки
    currentSettings.progressInterval = interval;
}

function hideProcessing() {
    const overlay = document.getElementById('processingOverlay');
    overlay.style.display = 'none';
    
    if (processTimer) {
        clearInterval(processTimer);
        processTimer = null;
    }
    
    if (currentSettings.progressInterval) {
        clearInterval(currentSettings.progressInterval);
        currentSettings.progressInterval = null;
    }
}

function showRealResult(blob, message) {
    hideProcessing();
    
    // Показываем 100% прогресс
    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('progressText').textContent = '100%';
    
    document.getElementById('downloadSection').style.display = 'block';
    
    const resultVideo = document.getElementById('resultVideo');
    resultVideo.src = URL.createObjectURL(blob);
    
    // Сохраняем blob для скачивания
    currentSettings.processedBlob = blob;
    
    // Обновляем статистику
    if (currentSettings.quality === 'ai') {
        stats.aiEnhanced++;
    }
    stats.processed++;
    stats.timeSaved += 3;
    updateStats();
    saveStats();
}

function downloadResult() {
    if (currentSettings.processedBlob) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(currentSettings.processedBlob);
        link.download = `processed_${currentSettings.format}_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function resetToUpload() {
    document.getElementById('downloadSection').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').style.display = 'none';
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

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import subprocess
import uuid
from werkzeug.utils import secure_filename
import logging
from datetime import datetime

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Разрешаем запросы с любого домена

# Настройки
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'processed'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm', 'm4v'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_video_info(input_path):
    """Получает информацию о видео"""
    try:
        cmd = [
            'ffprobe', '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height,r_frame_rate,duration',
            '-of', 'json',
            input_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        import json
        info = json.loads(result.stdout)
        stream = info['streams'][0] if info['streams'] else {}
        width = int(stream.get('width', 0))
        height = int(stream.get('height', 0))
        duration = float(stream.get('duration', 0))
        return width, height, duration
    except:
        return 0, 0, 0

def process_video_ffmpeg(input_path, output_path, format_type, quality_mode, processing_mode='stretch'):
    """Реальная обработка видео через FFmpeg"""
    
    formats = {
        "1x1": "scale=1080:1080:flags=lanczos",
        "9x16": "scale=1080:1920:flags=lanczos", 
        "16x9": "scale=1920:1080:flags=lanczos",
        "4x5": "scale=1080:1350:flags=lanczos",
        "1x2": "scale=1080:2160:flags=lanczos",
        "2x1": "scale=2160:1080:flags=lanczos",
        "21x9": "scale=2560:1080:flags=lanczos"
    }
    
    # Базовый фильтр в зависимости от режима
    if processing_mode == 'stretch':
        scale_filter = formats.get(format_type, "scale=1080:1080:flags=lanczos")
        base_filter = f'{scale_filter},setsar=1'
    elif processing_mode == 'enhance_4k':
        base_filter = 'scale=3840:2160:flags=lanczos:param0=5.0'
    elif processing_mode == 'interpolate':
        base_filter = 'minterpolate=fps=120:mi_mode=mci:mc_mode=aobmc:vsbmc=1'
    else:
        base_filter = formats.get(format_type, "scale=1080:1080:flags=lanczos")
    
    # Настройки качества
    if quality_mode == 'lossless':
        crf = '18'
        preset = 'medium'
        audio_codec = 'copy'
    elif quality_mode == 'compressed':
        crf = '23' 
        preset = 'medium'
        audio_codec = 'aac'
    else:  # ai - пока используем лучшее качество
        crf = '18'
        preset = 'slow'
        audio_codec = 'copy'
    
    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-vf', base_filter,
        '-c:v', 'libx264',
        '-crf', crf,
        '-preset', preset,
        '-pix_fmt', 'yuv420p',
        '-c:a', audio_codec,
        '-movflags', '+faststart',
        '-y',
        output_path
    ]
    
    try:
        logger.info(f"Запуск FFmpeg: {' '.join(cmd)}")
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        logger.info("FFmpeg выполнен успешно")
        return True, "Видео успешно обработано"
    except subprocess.CalledProcessError as e:
        logger.error(f"Ошибка FFmpeg: {e.stderr}")
        return False, f"Ошибка обработки видео: {e.stderr}"

@app.route('/api/health', methods=['GET'])
def health_check():
    """Проверка работоспособности API"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Video Editor API'
    })

@app.route('/api/process', methods=['POST'])
def process_video():
    """API endpoint для обработки видео"""
    start_time = datetime.now()
    
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Supported formats: MP4, AVI, MOV, MKV, WEBM'}), 400
    
    # Проверка размера файла
    file.seek(0, 2)  # Перемещаемся в конец файла
    file_size = file.tell()
    file.seek(0)  # Возвращаемся в начало
    
    if file_size > MAX_FILE_SIZE:
        return jsonify({'error': f'File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB'}), 400
    
    try:
        # Получаем параметры из фронтенда
        quality = request.form.get('quality', 'lossless')
        format_type = request.form.get('format', '1x1')
        processing_mode = request.form.get('mode', 'stretch')
        
        # Генерируем уникальные имена файлов
        file_id = str(uuid.uuid4())
        input_filename = secure_filename(file.filename)
        input_path = os.path.join(UPLOAD_FOLDER, f"{file_id}_{input_filename}")
        output_filename = f"processed_{file_id}.mp4"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)
        
        # Сохраняем файл
        file.save(input_path)
        logger.info(f"Файл сохранен: {input_path}")
        
        # Получаем информацию о видео
        width, height, duration = get_video_info(input_path)
        logger.info(f"Исходное видео: {width}x{height}, длительность: {duration}с")
        
        # Обрабатываем видео
        success, message = process_video_ffmpeg(
            input_path, output_path, format_type, quality, processing_mode
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        if success:
            # Получаем информацию о результате
            result_width, result_height, _ = get_video_info(output_path)
            
            logger.info(f"Обработка завершена за {processing_time:.1f}с")
            
            return jsonify({
                'success': True,
                'message': f'{message}. Обработано за {processing_time:.1f}с',
                'download_url': f'/api/download/{output_filename}',
                'original_resolution': f'{width}x{height}',
                'processed_resolution': f'{result_width}x{result_height}',
                'processing_time': processing_time
            })
        else:
            return jsonify({'error': message}), 500
            
    except Exception as e:
        logger.error(f"Неожиданная ошибка: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500
        
    finally:
        # Очистка временных файлов
        try:
            if 'input_path' in locals() and os.path.exists(input_path):
                os.remove(input_path)
                logger.info("Входной файл удален")
        except Exception as e:
            logger.warning(f"Не удалось удалить входной файл: {e}")

@app.route('/api/download/<filename>')
def download_file(filename):
    """Скачивание обработанного файла"""
    try:
        file_path = os.path.join(OUTPUT_FOLDER, filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        # Отправляем файл
        response = send_file(file_path, as_attachment=True)
        
        # Удаляем файл после отправки (опционально)
        # import threading
        # threading.Timer(60.0, lambda: os.remove(file_path) if os.path.exists(file_path) else None).start()
        
        return response
        
    except Exception as e:
        logger.error(f"Ошибка при скачивании: {e}")
        return jsonify({'error': 'Download failed'}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Получение статистики (заглушка)"""
    return jsonify({
        'processed': 42,
        'ai_enhanced': 15, 
        'time_saved': 127,
        'users': 1
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

"""
日志配置工具
"""

import logging
import logging.handlers
import os
from pathlib import Path

def setup_logger(name: str, config: dict) -> logging.Logger:
    """
    设置日志记录器

    Args:
        name: 日志记录器名称
        config: 日志配置字典

    Returns:
        配置好的日志记录器
    """
    # 创建日志目录
    log_file = config.get('file', 'logs/voice_service.log')
    log_dir = Path(log_file).parent
    log_dir.mkdir(parents=True, exist_ok=True)

    # 创建日志记录器
    logger = logging.getLogger(name)

    # 设置日志级别
    log_level = getattr(logging, config.get('level', 'INFO').upper(), logging.INFO)
    logger.setLevel(log_level)

    # 避免重复添加处理器
    if logger.handlers:
        return logger

    # 创建格式化器
    formatter = logging.Formatter(config.get('format', '%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

    # 控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 文件处理器（带轮转）
    try:
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=config.get('max_bytes', 10 * 1024 * 1024),  # 10MB
            backupCount=config.get('backup_count', 5),
            encoding='utf-8'
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        logger.warning(f"无法创建文件日志处理器: {e}")

    return logger

def get_logger(name: str) -> logging.Logger:
    """
    获取日志记录器

    Args:
        name: 日志记录器名称

    Returns:
        日志记录器
    """
    return logging.getLogger(name)
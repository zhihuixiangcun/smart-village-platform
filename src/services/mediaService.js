/**
 * 媒体文件上传服务
 * 支持图片、视频上传，自动压缩、生成缩略图
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

class MediaService {
  constructor() {
    // 上传目录配置
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.imageDir = path.join(this.uploadDir, 'images');
    this.videoDir = path.join(this.uploadDir, 'videos');
    this.thumbnailDir = path.join(this.uploadDir, 'thumbnails');

    // 文件大小限制
    this.maxFileSize = {
      image: 10 * 1024 * 1024,  // 10MB
      video: 100 * 1024 * 1024, // 100MB
      document: 5 * 1024 * 1024 // 5MB
    };

    // 初始化上传目录
    this.initDirectories();
  }

  /**
   * 初始化上传目录
   */
  async initDirectories() {
    const dirs = [this.uploadDir, this.imageDir, this.videoDir, this.thumbnailDir];
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`创建目录失败: ${dir}`, error);
      }
    }
  }

  /**
   * 配置multer存储
   */
  configureMulter(type = 'image') {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const dest = type === 'video' ? this.videoDir : this.imageDir;
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const basename = crypto.randomBytes(16).toString('hex');
        cb(null, `${basename}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = {
        image: /jpeg|jpg|png|gif|webp|svg/,
        video: /mp4|mov|avi|mkv|webm|flv/,
        document: /pdf|doc|docx|xls|xlsx|ppt|pptx|txt/
      };

      const allowed = allowedTypes[type] || allowedTypes.image;

      if (allowed.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize[type] || this.maxFileSize.image
      }
    });
  }

  /**
   * 处理图片上传
   */
  async handleImageUpload(req, res, next) {
    const upload = this.configureMulter('image').array('images', 9); // 最多9张图片

    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: err.message,
          code: 'UPLOAD_ERROR'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: '没有上传文件',
          code: 'NO_FILES'
        });
      }

      try {
        const processedFiles = await Promise.all(
          req.files.map(file => this.processImage(file))
        );

        req.processedFiles = processedFiles;
        next();
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
          code: 'IMAGE_PROCESS_ERROR'
        });
      }
    });
  }

  /**
   * 处理视频上传
   */
  async handleVideoUpload(req, res, next) {
    const upload = this.configureMulter('video').single('video');

    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: err.message,
          code: 'UPLOAD_ERROR'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '没有上传文件',
          code: 'NO_FILES'
        });
      }

      try {
        const processedFile = await this.processVideo(req.file);
        req.processedFile = processedFile;
        next();
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
          code: 'VIDEO_PROCESS_ERROR'
        });
      }
    });
  }

  /**
   * 处理图片（压缩、生成缩略图）
   */
  async processImage(file) {
    const filename = path.basename(file.path);
    const thumbnailName = `thumb_${filename}`;
    const thumbnailPath = path.join(this.thumbnailDir, thumbnailName);

    // 获取图片信息
    const metadata = await sharp(file.path).metadata();
    const { width, height } = metadata;

    // 生成缩略图（300x300，智能裁剪）
    await sharp(file.path)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // 压缩原图（如果太大）
    const maxDimension = 1920;
    let processedPath = file.path;

    if (width > maxDimension || height > maxDimension) {
      const processedName = `processed_${filename}`;
      processedPath = path.join(this.imageDir, processedName);

      await sharp(file.path)
        .resize(maxDimension, maxDimension, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(processedPath);

      // 删除原图
      await fs.unlink(file.path);
    }

    // 获取处理后的文件信息
    const processedStats = await fs.stat(processedPath);

    return {
      url: `/uploads/images/${path.basename(processedPath)}`,
      thumbnail: `/uploads/thumbnails/${thumbnailName}`,
      width,
      height,
      size: file.size,
      processedSize: processedStats.size,
      format: metadata.format
    };
  }

  /**
   * 处理视频（生成缩略图）
   */
  async processVideo(file) {
    const filename = path.basename(file.path);
    const thumbnailName = `thumb_${filename.replace(path.extname(filename), '.jpg')}`;
    const thumbnailPath = path.join(this.thumbnailDir, thumbnailName);

    // 获取视频信息（使用ffprobe）
    // 注意：需要安装ffmpeg和ffprobe
    const metadata = await this.getVideoMetadata(file.path);

    // 生成视频缩略图
    await this.generateVideoThumbnail(file.path, thumbnailPath);

    return {
      url: `/uploads/videos/${filename}`,
      thumbnail: `/uploads/thumbnails/${thumbnailName}`,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      size: file.size,
      format: metadata.format
    };
  }

  /**
   * 获取视频元数据
   */
  async getVideoMetadata(videoPath) {
    // 这里使用简单的模拟数据
    // 实际项目中应该使用ffprobe获取真实数据
    return {
      duration: 0, // 秒
      width: 1920,
      height: 1080,
      format: 'mp4'
    };
  }

  /**
   * 生成视频缩略图
   */
  async generateVideoThumbnail(videoPath, thumbnailPath) {
    // 实际项目中应该使用ffmpeg生成缩略图
    // 这里创建一个占位图
    await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }
      }
    })
      .png()
      .toFile(thumbnailPath);
  }

  /**
   * 删除文件
   */
  async deleteFile(fileUrl) {
    try {
      const filePath = path.join(__dirname, '../../', fileUrl);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('删除文件失败:', error);
      return false;
    }
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(fileUrls) {
    const results = await Promise.allSettled(
      fileUrls.map(url => this.deleteFile(url))
    );
    return results.every(r => r.status === 'fulfilled' && r.value);
  }

  /**
   * 获取文件URL（支持CDN）
   */
  getFileUrl(relativePath) {
    if (process.env.CDN_URL) {
      return `${process.env.CDN_URL}${relativePath}`;
    }
    return relativePath;
  }

  /**
   * 验证文件类型
   */
  isValidImageType(mimetype) {
    return /jpeg|jpg|png|gif|webp|svg/.test(mimetype);
  }

  isValidVideoType(mimetype) {
    return /mp4|mov|avi|mkv|webm|flv/.test(mimetype);
  }

  /**
   * 生成唯一文件名
   */
  generateFileName(originalName) {
    const ext = path.extname(originalName);
    const uuid = uuidv4();
    return `${uuid}${ext}`;
  }

  /**
   * 获取文件扩展名
   */
  getFileExtension(mimetype) {
    const mimeToExt = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'video/x-matroska': '.mkv',
      'video/webm': '.webm'
    };
    return mimeToExt[mimetype] || '.bin';
  }
}

// 创建单例
const mediaService = new MediaService();

module.exports = mediaService;

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const multer = require('multer');
const sharp = require('sharp');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB для оригиналов
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

// Middleware проверки токена
const checkAdminToken = (req, res, next) => {
  const token = req.headers['admin-token'] || req.query.token;
  
  if (token === process.env.ADMIN_UPLOAD_TOKEN) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
};

// Функция конвертации в WebP с оптимизацией
async function convertToWebP(buffer, quality = 80, width = null) {
  try {
    let sharpInstance = sharp(buffer);
    
    // Если указана ширина, ресайзим
    if (width) {
      sharpInstance = sharpInstance.resize(width, null, {
        withoutEnlargement: true // Не увеличиваем маленькие фото
      });
    }
    
    // Конвертируем в WebP
    const webpBuffer = await sharpInstance
      .webp({ quality: quality })
      .toBuffer();
    
    return webpBuffer;
  } catch (error) {
    console.error('Error converting to WebP:', error);
    return null;
  }
}

// POST /admin/products/:id/images - загрузить фото (создает WebP версию)
router.post('/products/:id/images', 
  checkAdminToken, 
  upload.array('photos', 10), 
  async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await Product.findOne({ id: productId });
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const newImages = [];
      
      for (const file of req.files) {
        // Конвертируем в WebP (разные размеры)
        const originalWebP = await convertToWebP(file.buffer, 85);
        const thumbnailWebP = await convertToWebP(file.buffer, 70, 200);
        const mediumWebP = await convertToWebP(file.buffer, 80, 800);
        
        if (!originalWebP) {
          continue; // Пропускаем если конвертация не удалась
        }
        
        // Сохраняем оригинал и WebP версии
        newImages.push({
          // WebP версии (для быстрой загрузки)
          webp: {
            original: originalWebP.toString('base64'),
            thumbnail: thumbnailWebP.toString('base64'),
            medium: mediumWebP.toString('base64')
          },
          // Метаданные
          contentType: 'image/webp',
          originalFilename: file.originalname,
          originalSize: file.size,
          webpSize: originalWebP.length,
          createdAt: new Date()
        });
      }

      const currentImages = product.images || [];
      product.images = [...currentImages, ...newImages];
      
      await product.save();

      res.json({ 
        success: true, 
        message: `${newImages.length} photos uploaded and converted to WebP`,
        totalImages: product.images.length,
        images: product.images.map((img, idx) => ({
          index: idx,
          urls: {
            original: `/api/products/${product.id}/images/${idx}/original`,
            thumbnail: `/api/products/${product.id}/images/${idx}/thumbnail`,
            medium: `/api/products/${product.id}/images/${idx}/medium`
          },
          filename: img.originalFilename,
          sizes: {
            original: img.originalSize,
            webp: img.webpSize
          }
        }))
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message });
    }
});

// DELETE /admin/products/:id/images/:index - удалить фото
router.delete('/products/:id/images/:index', 
  checkAdminToken, 
  async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await Product.findOne({ id: productId });
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const index = parseInt(req.params.index);
      const images = product.images || [];
      
      if (index >= images.length || index < 0) {
        return res.status(404).json({ error: 'Image not found' });
      }

      images.splice(index, 1);
      product.images = images;
      await product.save();

      res.json({ 
        success: true, 
        message: 'Image deleted successfully',
        totalImages: product.images.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});

module.exports = router;
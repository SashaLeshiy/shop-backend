const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

router.get('/', async (req, res) => {
  try {
    const { limit = 10, sort, category } = req.query;
    
    let query = {};
    if (category) {
      query.category = category;
    }
    
    let productsQuery = Product.find(query);
    
    if (sort === 'asc') {
      productsQuery = productsQuery.sort('price');
    } else if (sort === 'desc') {
      productsQuery = productsQuery.sort('-price');
    }
    
    productsQuery = productsQuery.limit(parseInt(limit));
    
    const products = await productsQuery;
    
    const productsWithImages = products.map(product => {
      const productObj = product.toObject();
      if (productObj.images && productObj.images.length > 0) {
        productObj.thumbnailUrl = `/products/${product.id}/images/0/thumbnail`;
        productObj.mediumUrl = `/products/${product.id}/images/0/medium`;
      }
      return productObj;
    });
    
    res.json(productsWithImages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products/:id - получить товар по ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: parseInt(req.params.id) });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const productObj = product.toObject();
    
    if (productObj.images && productObj.images.length > 0) {
      productObj.images = productObj.images.map((img, index) => ({
        index: index,
        urls: {
          thumbnail: `/products/${product.id}/images/${index}/thumbnail`,
          medium: `/products/${product.id}/images/${index}/medium`,
          original: `/products/${product.id}/images/${index}/original`
        },
        filename: img.originalFilename,
        sizes: {
          original: img.originalSize,
          webp: img.webpSize
        }
      }));
    }
    
    res.json(productObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /products - создать новый товар
router.post('/', async (req, res) => {
  try {
    // Генерируем ID если его нет
    if (!req.body.id) {
      const lastProduct = await Product.findOne().sort('-id');
      req.body.id = lastProduct ? lastProduct.id + 1 : 1;
    }
    
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /products/:id - обновить товар
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /products/:id - удалить товар
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ id: parseInt(req.params.id) });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products/categories - получить все категории
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// GET /products/:id/images - получить метаданные всех фото
router.get('/:id/images', async (req, res) => {
  try {
    const product = await Product.findOne({ id: parseInt(req.params.id) });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const images = (product.images || []).map((img, index) => ({
      index: index,
      urls: {
        thumbnail: `/products/${product.id}/images/${index}/thumbnail`,
        medium: `/products/${product.id}/images/${index}/medium`,
        original: `/products/${product.id}/images/${index}/original`
      },
      filename: img.originalFilename,
      contentType: img.contentType,
      sizes: {
        original: img.originalSize,
        webp: img.webpSize
      }
    }));

    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products/:id/images/:index/thumbnail - получить thumbnail (200px)
router.get('/:id/images/:index/thumbnail', async (req, res) => {
  try {
    const product = await Product.findOne({ id: parseInt(req.params.id) });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const images = product.images || [];
    const index = parseInt(req.params.index);
    
    if (index >= images.length || index < 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = images[index];
    const imgBuffer = Buffer.from(image.webp.thumbnail, 'base64');
    
    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=31536000'); // кэш на год
    res.send(imgBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products/:id/images/:index/medium - получить medium (800px)
router.get('/:id/images/:index/medium', async (req, res) => {
  try {
    const product = await Product.findOne({ id: parseInt(req.params.id) });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const images = product.images || [];
    const index = parseInt(req.params.index);
    
    if (index >= images.length || index < 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = images[index];
    const imgBuffer = Buffer.from(image.webp.medium, 'base64');
    
    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(imgBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products/:id/images/:index/original - получить оригинал WebP
router.get('/:id/images/:index/original', async (req, res) => {
  try {
    const product = await Product.findOne({ id: parseInt(req.params.id) });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const images = product.images || [];
    const index = parseInt(req.params.index);
    
    if (index >= images.length || index < 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = images[index];
    const imgBuffer = Buffer.from(image.webp.original, 'base64');
    
    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(imgBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
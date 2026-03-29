const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET /products - получить все товары с пагинацией и фильтрацией
router.get('/', async (req, res) => {
  try {
    const { limit = 10, sort, category } = req.query;
    
    let query = {};
    
    // Фильтр по категории
    if (category) {
      query.category = category;
    }
    
    let productsQuery = Product.find(query);
    
    // Сортировка
    if (sort === 'asc') {
      productsQuery = productsQuery.sort('price');
    } else if (sort === 'desc') {
      productsQuery = productsQuery.sort('-price');
    }
    
    // Лимит
    productsQuery = productsQuery.limit(parseInt(limit));
    
    const products = await productsQuery;
    res.json(products);
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
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /products - создать новый товар
router.post('/', async (req, res) => {
  try {
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

module.exports = router;
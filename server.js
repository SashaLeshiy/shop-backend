const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const productRoutes = require('./routes/products');
const adminRoutes = require('./routes/admin'); // Добавляем админ роуты

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы (для админ панели)
app.use(express.static(path.join(__dirname, 'public')));

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Маршруты
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes); // Добавляем админ маршруты

// Базовый маршрут
app.get('/', (req, res) => {
  res.json({
    message: 'Shop API',
    endpoints: {
      products: '/api/products',
      productById: '/api/products/:id',
      categories: '/api/products/categories/all',
      productImages: '/api/products/:id/images',
      admin: {
        upload: '/api/admin/products/:id/images (POST, needs token)',
        delete: '/api/admin/products/:id/images/:index (DELETE, needs token)',
        replace: '/api/admin/products/:id/images/:index (PUT, needs token)',
        webInterface: '/admin/upload?token=YOUR_TOKEN'
      }
    }
  });
});

// Простая страница для загрузки фото (админ интерфейс)
app.get('/admin/upload', (req, res) => {
  const token = req.query.token;
  
  if (token === process.env.ADMIN_UPLOAD_TOKEN) {
    res.sendFile(path.join(__dirname, 'public', 'admin-upload.html'));
  } else {
    res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Access Denied</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #f44336; margin-bottom: 20px; }
          p { color: #666; margin-bottom: 20px; }
          code {
            background: #f4f4f4;
            padding: 10px;
            border-radius: 4px;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⛔ Access Denied</h1>
          <p>Please provide a valid token to access the admin panel.</p>
          <code>/admin/upload?token=YOUR_ADMIN_TOKEN</code>
          <p style="margin-top: 20px; font-size: 12px;">Contact administrator for access.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📸 Admin upload: http://localhost:${PORT}/admin/upload?token=${process.env.ADMIN_UPLOAD_TOKEN || 'YOUR_TOKEN'}`);
});
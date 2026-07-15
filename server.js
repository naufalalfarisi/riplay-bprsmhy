const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup directories
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure db.json exists
if (!fs.existsSync(DB_PATH)) {
  const defaultDb = {
    settings: {
      bankName: "BPRS Barokah Dana Sejahtera (BDS)",
      logoText: "BDS Syariah",
      phone: "+62 853-2870-7560",
      address: "GRHA BDS, Jl. Sisingamangaraja No. 71, Brontokusuman, Mergangsan, Yogyakarta - 55153",
      email: "info@bprsbds.co.id",
      whatsapp: "6285328707560",
      username: "admin",
      passcode: "admin123",
      heroSubtitle: "Ringkasan Informasi Produk dan Layanan yang Transparan, Cepat, dan Sesuai Prinsip Syariah",
      themeColor: "#0d47a1",
      bgColor: "#f5f7fb",
      logoUrl: "",
      logoLightUrl: "",
      facebook: "https://www.facebook.com/officialbanksyariahBDS",
      instagram: "https://www.instagram.com/banksyariahbds/",
      youtube: "https://www.youtube.com/@BankSyariahBDS"
    },
    products: []
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('riplay_cookie_secret_key_123456789'));

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// DB Helpers
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { settings: {}, products: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

// Auth Middleware
function requireAdmin(req, res, next) {
  const db = readDB();
  const validPasscode = db.settings.passcode || 'admin123';
  const token = req.cookies.admin_token;
  
  if (token === validPasscode || req.headers['authorization'] === `Bearer ${validPasscode}`) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'Unauthorized: Masukkan kode sandi yang valid.' });
  }
}

// File Upload Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Keep it safe, append timestamp
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + cleanName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' && ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.webp' && ext !== '.svg') {
      return cb(new Error('Hanya file PDF, PNG, JPG, JPEG, WEBP, dan SVG yang diperbolehkan.'));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- API ROUTES ---

// Auth Routes
app.post('/api/login', (req, res) => {
  const { username, passcode } = req.body;
  const db = readDB();
  const validUsername = db.settings.username || 'admin';
  const validPasscode = db.settings.passcode || 'admin123';
  
  if (username === validUsername && passcode === validPasscode) {
    res.cookie('admin_token', passcode, { httpOnly: true, path: '/', maxAge: 24 * 60 * 60 * 1000 }); // 1 day
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, error: 'Username atau kode sandi salah!' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('admin_token', { httpOnly: true, path: '/' });
  res.clearCookie('admin_token', { httpOnly: true, path: '/api' });
  res.clearCookie('admin_token');
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  const db = readDB();
  const validPasscode = db.settings.passcode || 'admin123';
  const token = req.cookies.admin_token;
  
  if (token === validPasscode) {
    res.json({ success: true, authenticated: true, username: db.settings.username || 'admin' });
  } else {
    res.json({ success: true, authenticated: false });
  }
});

// Settings Routes
app.get('/api/settings', (req, res) => {
  const db = readDB();
  // Don't leak passcode or username in public settings API
  const settingsCopy = { ...db.settings };
  delete settingsCopy.passcode;
  delete settingsCopy.username;
  res.json(settingsCopy);
});

app.put('/api/settings', requireAdmin, (req, res) => {
  const db = readDB();
  const newSettings = req.body;
  
  // Preserve passcode if not provided/empty in update
  const passcode = newSettings.passcode && newSettings.passcode.trim() !== '' 
    ? newSettings.passcode.trim() 
    : db.settings.passcode;

  // Preserve or update username
  const username = newSettings.username && newSettings.username.trim() !== ''
    ? newSettings.username.trim()
    : (db.settings.username || 'admin');

  db.settings = {
    ...db.settings,
    ...newSettings,
    username: username,
    passcode: passcode
  };
  
  if (writeDB(db)) {
    res.json({ success: true, message: 'Pengaturan berhasil diperbarui.' });
  } else {
    res.status(500).json({ success: false, error: 'Gagal memperbarui pengaturan.' });
  }
});

// Products API Routes
app.get('/api/products', (req, res) => {
  const db = readDB();
  const { category } = req.query;
  
  let list = db.products || [];
  if (category) {
    list = list.filter(p => p.category === category);
  }
  res.json(list);
});

app.get('/api/products/:id', (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.id === req.params.id);
  
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ success: false, error: 'Produk tidak ditemukan.' });
  }
});

app.post('/api/products', requireAdmin, (req, res) => {
  const db = readDB();
  const productData = req.body;
  
  // Basic validation
  if (!productData.name || !productData.category) {
    return res.status(400).json({ success: false, error: 'Nama produk dan Kategori wajib diisi.' });
  }
  
  const newProduct = {
    id: 'prod-' + Date.now(),
    name: productData.name,
    category: productData.category,
    tagline: productData.tagline || '',
    contract: productData.contract || '',
    description: productData.description || '',
    imageUrl: productData.imageUrl || '',
    features: Array.isArray(productData.features) ? productData.features.filter(Boolean) : [],
    benefits: Array.isArray(productData.benefits) ? productData.benefits.filter(Boolean) : [],
    risks: Array.isArray(productData.risks) ? productData.risks.filter(Boolean) : [],
    fees: Array.isArray(productData.fees) ? productData.fees.filter(Boolean) : [],
    requirements: Array.isArray(productData.requirements) ? productData.requirements.filter(Boolean) : [],
    pdfUrl: productData.pdfUrl || '',
    whatsappLink: productData.whatsappLink || ''
  };
  
  db.products = db.products || [];
  db.products.push(newProduct);
  
  if (writeDB(db)) {
    res.status(201).json({ success: true, product: newProduct });
  } else {
    res.status(500).json({ success: false, error: 'Gagal menyimpan produk baru.' });
  }
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const productData = req.body;
  
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Produk tidak ditemukan.' });
  }
  
  // Update fields
  db.products[index] = {
    ...db.products[index],
    name: productData.name || db.products[index].name,
    category: productData.category || db.products[index].category,
    tagline: productData.tagline !== undefined ? productData.tagline : db.products[index].tagline,
    contract: productData.contract !== undefined ? productData.contract : db.products[index].contract,
    description: productData.description !== undefined ? productData.description : db.products[index].description,
    imageUrl: productData.imageUrl !== undefined ? productData.imageUrl : db.products[index].imageUrl,
    features: Array.isArray(productData.features) ? productData.features.filter(Boolean) : db.products[index].features,
    benefits: Array.isArray(productData.benefits) ? productData.benefits.filter(Boolean) : db.products[index].benefits,
    risks: Array.isArray(productData.risks) ? productData.risks.filter(Boolean) : db.products[index].risks,
    fees: Array.isArray(productData.fees) ? productData.fees.filter(Boolean) : db.products[index].fees,
    requirements: Array.isArray(productData.requirements) ? productData.requirements.filter(Boolean) : db.products[index].requirements,
    pdfUrl: productData.pdfUrl !== undefined ? productData.pdfUrl : db.products[index].pdfUrl,
    whatsappLink: productData.whatsappLink !== undefined ? productData.whatsappLink : db.products[index].whatsappLink
  };
  
  if (writeDB(db)) {
    res.json({ success: true, product: db.products[index] });
  } else {
    res.status(500).json({ success: false, error: 'Gagal memperbarui produk.' });
  }
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const db = readDB();
  const { id } = req.params;
  
  const initialLength = db.products.length;
  db.products = db.products.filter(p => p.id !== id);
  
  if (db.products.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Produk tidak ditemukan.' });
  }
  
  if (writeDB(db)) {
    res.json({ success: true, message: 'Produk berhasil dihapus.' });
  } else {
    res.status(500).json({ success: false, error: 'Gagal menghapus produk.' });
  }
});

// File Upload Route
app.post('/api/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, function (err) {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Silakan pilih file untuk diunggah.' });
    }
    
    // Return the accessible URL path
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, fileUrl: fileUrl });
  });
});

// Fallback to serving index.html for undefined routes, or just send standard message
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  RIPLAY Bank Product Information Server Running   `);
  console.log(`  Local URL: http://localhost:${PORT}             `);
  console.log(`==================================================`);
});

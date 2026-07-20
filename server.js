const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup session memory store
const activeSessions = new Map(); // token -> { username, createdAt }

function hashPasscode(passcode) {
  if (!passcode) return '';
  return crypto.createHash('sha256').update(passcode + 'riplay_salt_987654321').digest('hex');
}

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

// Ensure db.json exists and is valid
const BACKUP_PATH = DB_PATH + '.bak';
let dbValid = false;

if (fs.existsSync(DB_PATH)) {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    JSON.parse(raw);
    dbValid = true;
  } catch (err) {
    console.error('Main db.json is corrupted or unparseable, attempting recovery from backup...');
  }
}

if (!dbValid) {
  if (fs.existsSync(BACKUP_PATH)) {
    try {
      const rawBackup = fs.readFileSync(BACKUP_PATH, 'utf8');
      JSON.parse(rawBackup);
      fs.copyFileSync(BACKUP_PATH, DB_PATH);
      console.log('Restored db.json from backup (db.json.bak) successfully!');
      dbValid = true;
    } catch (err) {
      console.error('Backup db.json.bak is also corrupted or missing:', err);
    }
  }
}

if (dbValid && !fs.existsSync(BACKUP_PATH)) {
  try {
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    console.log('Created initial database backup (db.json.bak) on startup');
  } catch (err) {
    console.error('Failed to create initial database backup on startup:', err);
  }
}

// Migrate passcode to hash if not already hashed
if (dbValid) {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const passcode = db.settings.passcode || 'admin123';
    if (passcode.length !== 64 || !/^[0-9a-f]{64}$/i.test(passcode)) {
      db.settings.passcode = hashPasscode(passcode);
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      fs.writeFileSync(BACKUP_PATH, JSON.stringify(db, null, 2), 'utf8');
      console.log('Migrated plaintext passcode to hashed passcode successfully.');
    }
  } catch (err) {
    console.error('Failed to migrate passcode on startup:', err);
  }
}

if (!dbValid) {
  const defaultDb = {
    settings: {
      bankName: "BPRS Barokah Dana Sejahtera (BDS)",
      logoText: "BDS Syariah",
      phone: "+62 853-2870-7560",
      address: "GRHA BDS, Jl. Sisingamangaraja No. 71, Brontokusuman, Mergangsan, Yogyakarta - 55153",
      email: "info@bprsbds.co.id",
      whatsapp: "6285328707560",
      username: "admin",
      passcode: hashPasscode("admin123"),
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
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
  console.log('Created fresh db.json and backup because no valid database was found.');
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
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading DB, trying fallback to backup:', err);
    if (fs.existsSync(BACKUP_PATH)) {
      try {
        const backupData = fs.readFileSync(BACKUP_PATH, 'utf8');
        const parsed = JSON.parse(backupData);
        // Repair main DB with backup
        fs.writeFileSync(DB_PATH, backupData, 'utf8');
        console.log('Restored corrupted main DB with backup data.');
        return parsed;
      } catch (backupErr) {
        console.error('Failed to read backup DB:', backupErr);
      }
    }
  }
  return { settings: {}, products: [] };
}

function writeDB(data) {
  const tempPath = DB_PATH + '.tmp';
  try {
    const jsonStr = JSON.stringify(data, null, 2);

    // Update backup with current DB if it is valid JSON
    if (fs.existsSync(DB_PATH)) {
      try {
        const currentData = fs.readFileSync(DB_PATH, 'utf8');
        JSON.parse(currentData);
        fs.copyFileSync(DB_PATH, BACKUP_PATH);
      } catch (err) {
        console.warn('Skipping backup update as current db.json is corrupted');
      }
    }

    // Atomic write: write to temp file then rename
    fs.writeFileSync(tempPath, jsonStr, 'utf8');
    fs.renameSync(tempPath, DB_PATH);
    return true;
  } catch (err) {
    console.error('Error writing DB atomically:', err);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    return false;
  }
}

function safelyDeleteUploadFile(fileUrl, db) {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) return;
  
  // Check if any other product uses this file
  const isUsedByOtherProduct = (db.products || []).some(p => p.imageUrl === fileUrl || p.pdfUrl === fileUrl);
  // Check if settings use this file
  const isUsedBySettings = db.settings && (db.settings.logoUrl === fileUrl || db.settings.logoLightUrl === fileUrl);
  
  if (!isUsedByOtherProduct && !isUsedBySettings) {
    const filename = path.basename(fileUrl);
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('Successfully deleted unreferenced upload file:', filename);
      } catch (err) {
        console.error('Failed to delete upload file:', filename, err);
      }
    }
  }
}

// Auth Middleware
function requireAdmin(req, res, next) {
  const token = req.cookies.admin_token;
  
  // Support Bearer authorization token header if needed
  let authHeaderToken = null;
  if (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ')) {
    authHeaderToken = req.headers['authorization'].substring(7);
  }
  
  const activeToken = token || authHeaderToken;
  
  if (activeToken && activeSessions.has(activeToken)) {
    const session = activeSessions.get(activeToken);
    // Session validity check (24 hours)
    if (Date.now() - session.createdAt < 24 * 60 * 60 * 1000) {
      next();
    } else {
      activeSessions.delete(activeToken);
      res.status(401).json({ success: false, error: 'Sesi telah kedaluwarsa. Silakan login kembali.' });
    }
  } else {
    res.status(401).json({ success: false, error: 'Unauthorized: Sesi tidak valid atau telah berakhir.' });
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
  
  // Hash the incoming passcode to compare it with the stored hashed passcode
  const hashedInput = hashPasscode(passcode);
  
  if (username === validUsername && hashedInput === validPasscode) {
    const sessionToken = crypto.randomUUID();
    activeSessions.set(sessionToken, { username: username, createdAt: Date.now() });
    
    res.cookie('admin_token', sessionToken, { httpOnly: true, path: '/', maxAge: 24 * 60 * 60 * 1000 }); // 1 day
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, error: 'Username atau kode sandi salah!' });
  }
});

app.post('/api/logout', (req, res) => {
  const token = req.cookies.admin_token;
  if (token) {
    activeSessions.delete(token);
  }
  res.clearCookie('admin_token', { httpOnly: true, path: '/' });
  res.clearCookie('admin_token', { httpOnly: true, path: '/api' });
  res.clearCookie('admin_token');
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  const token = req.cookies.admin_token;
  
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token);
    if (Date.now() - session.createdAt < 24 * 60 * 60 * 1000) {
      return res.json({ success: true, authenticated: true, username: session.username });
    } else {
      activeSessions.delete(token);
    }
  }
  res.json({ success: true, authenticated: false });
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
  
  // Track old logo URLs for cleanup
  const oldLogo = db.settings.logoUrl;
  const oldLogoLight = db.settings.logoLightUrl;

  // Handle passcode updates with secure hashing
  let passcode = db.settings.passcode;
  if (newSettings.passcode && newSettings.passcode.trim() !== '') {
    const trimmedPasscode = newSettings.passcode.trim();
    // If it's already a 64-char hex string, don't double hash
    if (trimmedPasscode.length === 64 && /^[0-9a-f]{64}$/i.test(trimmedPasscode)) {
      passcode = trimmedPasscode;
    } else {
      passcode = hashPasscode(trimmedPasscode);
    }
  }

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
    // If saving succeeded, clean up old logo files if they were replaced
    if (newSettings.logoUrl !== undefined && oldLogo !== newSettings.logoUrl) {
      safelyDeleteUploadFile(oldLogo, db);
    }
    if (newSettings.logoLightUrl !== undefined && oldLogoLight !== newSettings.logoLightUrl) {
      safelyDeleteUploadFile(oldLogoLight, db);
    }
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
  
  // Store old upload paths for cleanup
  const oldImageUrl = db.products[index].imageUrl;
  const oldPdfUrl = db.products[index].pdfUrl;
  
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
    // Clean up replaced images/PDFs if they changed
    if (productData.imageUrl !== undefined && oldImageUrl !== productData.imageUrl) {
      safelyDeleteUploadFile(oldImageUrl, db);
    }
    if (productData.pdfUrl !== undefined && oldPdfUrl !== productData.pdfUrl) {
      safelyDeleteUploadFile(oldPdfUrl, db);
    }
    res.json({ success: true, product: db.products[index] });
  } else {
    res.status(500).json({ success: false, error: 'Gagal memperbarui produk.' });
  }
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const db = readDB();
  const { id } = req.params;
  
  const productToDelete = db.products.find(p => p.id === id);
  if (!productToDelete) {
    return res.status(404).json({ success: false, error: 'Produk tidak ditemukan.' });
  }
  
  const imageUrl = productToDelete.imageUrl;
  const pdfUrl = productToDelete.pdfUrl;
  
  db.products = db.products.filter(p => p.id !== id);
  
  if (writeDB(db)) {
    // Clean up files physically from disk
    safelyDeleteUploadFile(imageUrl, db);
    safelyDeleteUploadFile(pdfUrl, db);
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

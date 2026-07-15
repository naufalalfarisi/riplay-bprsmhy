// --- RIPLAY Admin Dashboard Controller ---

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

let productsList = [];
let activeEditProduct = null;
let currentUsername = 'admin';

function init() {
  // Check auth state on load
  checkAuth();
  
  // Bind form submits dynamically
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) {
    settingsForm.addEventListener('submit', handleSaveSettings);
    
    // Bind color picker elements sync
    const colorPicker = document.getElementById('setThemeColor');
    const colorHex = document.getElementById('setThemeColorHex');
    
    if (colorPicker && colorHex) {
      colorPicker.addEventListener('input', (e) => {
        colorHex.value = e.target.value;
        applyThemeColors(e.target.value);
      });
      
      colorHex.addEventListener('input', (e) => {
        const val = e.target.value;
        if (/^#[0-9A-F]{6}$/i.test(val)) {
          colorPicker.value = val;
          applyThemeColors(val);
        }
      });
    }
    
    // Bind bg color picker elements sync
    const bgColorPicker = document.getElementById('setBgColor');
    const bgColorHex = document.getElementById('setBgColorHex');
    
    if (bgColorPicker && bgColorHex) {
      bgColorPicker.addEventListener('input', (e) => {
        bgColorHex.value = e.target.value;
        document.documentElement.style.setProperty('--bg-body', e.target.value);
      });
      
      bgColorHex.addEventListener('input', (e) => {
        const val = e.target.value;
        if (/^#[0-9A-F]{6}$/i.test(val)) {
          bgColorPicker.value = val;
          document.documentElement.style.setProperty('--bg-body', val);
        }
      });
    }
  }
  
  const productForm = document.getElementById('productForm');
  if (productForm) {
    productForm.addEventListener('submit', handleSaveProduct);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// --- 1. Authentication Handlers ---
function checkAuth() {
  fetch('/api/check-auth?_cb=' + Date.now())
    .then(res => res.json())
    .then(data => {
      const loginContainer = document.getElementById('login-container');
      const dashContainer = document.getElementById('dashboard-container');
      
      if (data.authenticated) {
        currentUsername = data.username || 'admin';
        loginContainer.classList.add('hidden');
        dashContainer.classList.remove('hidden');
        
        // Load initial dashboard data
        loadSettings();
        loadProducts();
      } else {
        loginContainer.classList.remove('hidden');
        dashContainer.classList.add('hidden');
      }
    })
    .catch(err => {
      console.error('Koneksi server gagal:', err);
      showNotification('Gagal berkomunikasi dengan server backend.', 'error');
    });
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const passcode = document.getElementById('passcode').value;
  const alertEl = document.getElementById('loginAlert');
  const btn = document.getElementById('btnLogin');

  alertEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memverifikasi...';

  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, passcode })
  })
    .then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        document.getElementById('username').value = '';
        document.getElementById('passcode').value = '';
        checkAuth();
      } else {
        throw new Error(data.error || 'Terjadi kesalahan.');
      }
    })
    .catch(err => {
      alertEl.textContent = err.message;
      alertEl.style.display = 'block';
    })
    .finally(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket me-2"></i>Masuk Ke Dashboard';
    });
}

function handleLogout() {
  if (!confirm('Apakah Anda yakin ingin keluar dari panel admin?')) return;
  
  // Clear via client side JS if possible (non-httpOnly backup)
  document.cookie = "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api;";
  
  fetch('/api/logout', { method: 'POST' })
    .then(() => {
      window.location.reload();
    })
    .catch(err => {
      console.error('Gagal logout:', err);
      window.location.reload();
    });
}

// --- 2. Bank Settings Controller ---
function loadSettings() {
  fetch('/api/settings')
    .then(res => res.json())
    .then(data => {
      document.getElementById('setBankName').value = data.bankName || '';
      document.getElementById('setLogoText').value = data.logoText || '';
      document.getElementById('setHeroSubtitle').value = data.heroSubtitle || '';
      document.getElementById('setPhone').value = data.phone || '';
      document.getElementById('setWhatsapp').value = data.whatsapp || '';
      document.getElementById('setEmail').value = data.email || '';
      document.getElementById('setAddress').value = data.address || '';
      
      // Admin Security
      document.getElementById('setUsername').value = currentUsername;
      
      // Branding Settings
      const tColor = data.themeColor || '#196a5c';
      document.getElementById('setThemeColor').value = tColor;
      document.getElementById('setThemeColorHex').value = tColor;
      applyThemeColors(tColor); // Apply color to admin dashboard too
      
      const bgColor = data.bgColor || '#f5f7fb';
      document.getElementById('setBgColor').value = bgColor;
      document.getElementById('setBgColorHex').value = bgColor;
      document.documentElement.style.setProperty('--bg-body', bgColor); // Preview bg color
      
      const logoUrl = data.logoUrl || '';
      document.getElementById('setLogoUrl').value = logoUrl;
      const preview = document.getElementById('logoPreview');
      if (logoUrl.trim() !== '') {
        preview.src = logoUrl;
        preview.style.display = 'inline-block';
      } else {
        preview.style.display = 'none';
      }

      const logoLightUrl = data.logoLightUrl || '';
      document.getElementById('setLogoLightUrl').value = logoLightUrl;
      const previewLight = document.getElementById('logoLightPreview');
      const previewLightWrapper = document.getElementById('logoLightPreviewWrapper');
      if (logoLightUrl.trim() !== '') {
        previewLight.src = logoLightUrl;
        previewLightWrapper.style.display = 'block';
      } else {
        previewLightWrapper.style.display = 'none';
      }
      
      // Socials
      document.getElementById('setFacebook').value = data.facebook || '';
      document.getElementById('setInstagram').value = data.instagram || '';
      document.getElementById('setYoutube').value = data.youtube || '';
    })
    .catch(err => console.error('Gagal memuat pengaturan:', err));
}

function handleSaveSettings(e) {
  e.preventDefault();
  
  const bankName = document.getElementById('setBankName').value;
  const logoText = document.getElementById('setLogoText').value;
  const heroSubtitle = document.getElementById('setHeroSubtitle').value;
  const phone = document.getElementById('setPhone').value;
  const whatsapp = document.getElementById('setWhatsapp').value;
  const email = document.getElementById('setEmail').value;
  const address = document.getElementById('setAddress').value;
  
  const themeColor = document.getElementById('setThemeColorHex').value;
  const bgColor = document.getElementById('setBgColorHex').value;
  const logoUrl = document.getElementById('setLogoUrl').value;
  const logoLightUrl = document.getElementById('setLogoLightUrl').value;

  const facebook = document.getElementById('setFacebook').value;
  const instagram = document.getElementById('setInstagram').value;
  const youtube = document.getElementById('setYoutube').value;
  const username = document.getElementById('setUsername').value;
  const passcode = document.getElementById('setPasscode').value;

  const payload = {
    bankName, logoText, heroSubtitle, phone, whatsapp, email, address,
    themeColor, bgColor, logoUrl, logoLightUrl,
    facebook, instagram, youtube,
    username: username.trim() !== '' ? username.trim() : currentUsername
  };
  
  if (passcode.trim() !== '') {
    payload.passcode = passcode;
  }

  const btn = document.getElementById('btnSaveSettings');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...';

  fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        showNotification('Profil bank berhasil diperbarui!', 'success');
        document.getElementById('setPasscode').value = '';
        if (username.trim() !== '') {
          currentUsername = username.trim();
        }
        loadSettings();
      } else {
        throw new Error(data.error || 'Gagal menyimpan.');
      }
    })
    .catch(err => showNotification(err.message, 'error'))
    .finally(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i>Simpan Perubahan Profil';
    });
}

// --- 3. Products List & Table Controller ---
function loadProducts() {
  fetch('/api/products')
    .then(res => res.json())
    .then(data => {
      productsList = data;
      renderProductsTable();
    })
    .catch(err => console.error('Gagal mengambil produk:', err));
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (productsList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted">
          Belum ada produk terdaftar. Klik "Tambah Produk Baru" untuk menambahkan.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = productsList.map(product => {
    const docStatus = product.pdfUrl 
      ? `<a href="${product.pdfUrl}" target="_blank" class="text-decoration-none text-success small fw-semibold"><i class="fa-solid fa-file-pdf me-1"></i>Tersedia</a>`
      : '<span class="text-muted small">Kosong</span>';
    
    return `
      <tr>
        <td><span class="badge-cat-${product.category}">${product.category}</span></td>
        <td class="fw-semibold">${escapeHTML(product.name)}</td>
        <td><code>${escapeHTML(product.contract)}</code></td>
        <td>${docStatus}</td>
        <td class="text-end">
          <button class="btn btn-outline-primary btn-sm me-1" onclick="showEditProductModal('${product.id}')">
            <i class="fa-solid fa-pencil"></i> Edit
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="handleDeleteProduct('${product.id}')">
            <i class="fa-solid fa-trash"></i> Hapus
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function handleDeleteProduct(id) {
  const product = productsList.find(p => p.id === id);
  if (!product) return;
  
  if (!confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}"?\nTindakan ini tidak dapat dibatalkan.`)) {
    return;
  }

  fetch(`/api/products/${id}`, { method: 'DELETE' })
    .then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        showNotification('Produk berhasil dihapus.', 'success');
        loadProducts();
      } else {
        throw new Error(data.error || 'Gagal menghapus produk.');
      }
    })
    .catch(err => showNotification(err.message, 'error'));
}

// --- 4. Dynamic List Inputs Editor ---
// Dynamic list management for RIPLAY sub-fields (features, benefits, risks, etc.)
function addListRow(containerId, value = '') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'list-row-item';
  
  row.innerHTML = `
    <input type="text" class="form-control form-control-sm list-item-input" value="${value.replace(/"/g, '&quot;')}" placeholder="Ketik rincian informasi di sini...">
    <button type="button" class="btn btn-outline-danger btn-sm btn-remove-row" onclick="removeListRow(this)">
      <i class="fa-solid fa-trash-can"></i>
    </button>
  `;
  
  container.appendChild(row);
}

function removeListRow(button) {
  const row = button.closest('.list-row-item');
  if (row) row.remove();
}

function readListValues(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  
  const inputs = container.querySelectorAll('.list-item-input');
  const values = [];
  
  inputs.forEach(input => {
    const val = input.value.trim();
    if (val !== '') {
      values.push(val);
    }
  });
  
  return values;
}

function clearListContainer(containerId) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

// --- 5. Add / Edit Product Modals ---
function showAddProductModal() {
  activeEditProduct = null;
  document.getElementById('productModalLabel').textContent = 'Tambah Produk RIPLAY Baru';
  document.getElementById('productForm').reset();
  document.getElementById('prodId').value = '';
  document.getElementById('uploadStatus').style.display = 'none';
  document.getElementById('pdfFileUploader').value = '';
  
  // Reset product image uploader and fields
  document.getElementById('prodImageUrl').value = '';
  document.getElementById('productImageFileUploader').value = '';
  document.getElementById('productImageUploadStatus').style.display = 'none';
  document.getElementById('productImagePreviewWrapper').style.display = 'none';
  document.getElementById('productImagePreview').src = '';

  // Clear and prepare dynamic list editors (add 1 blank row default)
  const containers = ['featuresListContainer', 'benefitsListContainer', 'risksListContainer', 'feesListContainer', 'reqsListContainer'];
  containers.forEach(id => {
    clearListContainer(id);
    addListRow(id);
  });

  const modalEl = document.getElementById('productModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

function showEditProductModal(id) {
  const product = productsList.find(p => p.id === id);
  if (!product) return;
  
  activeEditProduct = product;
  document.getElementById('productModalLabel').textContent = `Edit Ringkasan: ${product.name}`;
  
  // Set basic values
  document.getElementById('prodId').value = product.id;
  document.getElementById('prodCategory').value = product.category;
  document.getElementById('prodName').value = product.name;
  document.getElementById('prodContract').value = product.contract;
  document.getElementById('prodTagline').value = product.tagline;
  document.getElementById('prodDescription').value = product.description;
  document.getElementById('prodPdfUrl').value = product.pdfUrl || '';
  document.getElementById('prodWaLink').value = product.whatsappLink || '';
  
  // Populate image URL and preview
  const prodImgUrl = product.imageUrl || '';
  document.getElementById('prodImageUrl').value = prodImgUrl;
  
  const preview = document.getElementById('productImagePreview');
  const previewWrapper = document.getElementById('productImagePreviewWrapper');
  if (prodImgUrl.trim() !== '') {
    preview.src = prodImgUrl;
    previewWrapper.style.display = 'block';
  } else {
    previewWrapper.style.display = 'none';
    preview.src = '';
  }

  // Reset file uploader
  document.getElementById('uploadStatus').style.display = 'none';
  document.getElementById('pdfFileUploader').value = '';
  document.getElementById('productImageUploadStatus').style.display = 'none';
  document.getElementById('productImageFileUploader').value = '';

  // Populate dynamic list grids
  const populateListEditor = (containerId, items) => {
    clearListContainer(containerId);
    if (items && items.length > 0) {
      items.forEach(item => addListRow(containerId, item));
    } else {
      addListRow(containerId);
    }
  };

  populateListEditor('featuresListContainer', product.features);
  populateListEditor('benefitsListContainer', product.benefits);
  populateListEditor('risksListContainer', product.risks);
  populateListEditor('feesListContainer', product.fees);
  populateListEditor('reqsListContainer', product.requirements);

  const modalEl = document.getElementById('productModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// --- 6. Form Submission (Save/Update) ---
function handleSaveProduct(e) {
  e.preventDefault();
  
  const id = document.getElementById('prodId').value;
  const category = document.getElementById('prodCategory').value;
  const name = document.getElementById('prodName').value;
  const contract = document.getElementById('prodContract').value;
  const tagline = document.getElementById('prodTagline').value;
  const description = document.getElementById('prodDescription').value;
  const pdfUrl = document.getElementById('prodPdfUrl').value;
  const whatsappLink = document.getElementById('prodWaLink').value;
  const imageUrl = document.getElementById('prodImageUrl').value;

  // Read lists
  const features = readListValues('featuresListContainer');
  const benefits = readListValues('benefitsListContainer');
  const risks = readListValues('risksListContainer');
  const fees = readListValues('feesListContainer');
  const requirements = readListValues('reqsListContainer');

  const payload = {
    category, name, contract, tagline, description, pdfUrl, whatsappLink, imageUrl,
    features, benefits, risks, fees, requirements
  };

  const isNew = !id;
  const url = isNew ? '/api/products' : `/api/products/${id}`;
  const method = isNew ? 'POST' : 'PUT';

  const btn = document.getElementById('btnSaveProduct');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...';

  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        // Hide Modal
        const modalEl = document.getElementById('productModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
        
        // Reload
        loadProducts();
        showNotification(isNew ? 'Produk baru berhasil ditambahkan!' : 'Produk berhasil diperbarui!', 'success');
      } else {
        throw new Error(data.error || 'Gagal menyimpan produk.');
      }
    })
    .catch(err => showNotification(err.message, 'error'))
    .finally(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-circle-check me-1"></i>Simpan Produk';
    });
}

// --- 7. Document PDF Upload API Integration ---
function uploadPdfFile() {
  const fileInput = document.getElementById('pdfFileUploader');
  const statusEl = document.getElementById('uploadStatus');
  
  if (fileInput.files.length === 0) {
    showNotification('Pilih file terlebih dahulu.', 'warning');
    return;
  }
  
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);
  
  statusEl.textContent = 'Mengunggah file...';
  statusEl.className = 'small mt-1 text-primary';
  statusEl.style.display = 'block';
  
  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
    .then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        document.getElementById('prodPdfUrl').value = data.fileUrl;
        statusEl.textContent = 'Upload berhasil! Tautan diperbarui otomatis.';
        statusEl.className = 'small mt-1 text-success fw-bold';
      } else {
        throw new Error(data.error || 'Gagal mengunggah file.');
      }
    })
    .catch(err => {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'small mt-1 text-danger';
      showNotification(`Gagal mengunggah dokumen/brosur: ${err.message}`, 'error');
    });
}

// --- 8. Dynamic Branding Integrations ---
function uploadLogoImage(fileInputId, targetInputId, previewImgId) {
  const fileInput = document.getElementById(fileInputId);
  const targetInput = document.getElementById(targetInputId);
  const previewImg = document.getElementById(previewImgId);
  
  const statusElId = fileInputId === 'logoFileUploader' ? 'logoUploadStatus' : 'logoLightUploadStatus';
  const statusEl = document.getElementById(statusElId);

  if (fileInput.files.length === 0) {
    showNotification('Pilih file logo terlebih dahulu.', 'warning');
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);

  statusEl.textContent = 'Mengunggah logo...';
  statusEl.className = 'small mt-1 text-primary';
  statusEl.style.display = 'block';

  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
    .then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        targetInput.value = data.fileUrl;
        statusEl.textContent = 'Upload berhasil!';
        statusEl.className = 'small mt-1 text-success fw-bold';
        
        if (previewImg) {
          previewImg.src = data.fileUrl;
          previewImg.style.display = 'inline-block';
          
          if (fileInputId === 'logoLightFileUploader') {
            document.getElementById('logoLightPreviewWrapper').style.display = 'block';
          }
        }
      } else {
        throw new Error(data.error || 'Gagal mengunggah logo.');
      }
    })
    .catch(err => {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'small mt-1 text-danger';
      showNotification(`Gagal mengunggah logo: ${err.message}`, 'error');
    });
}

function adjustColorBrightness(hex, percent) {
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = parseInt(R * (100 + percent) / 100);
  G = parseInt(G * (100 + percent) / 100);
  B = parseInt(B * (100 + percent) / 100);

  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;

  R = (R > 0) ? R : 0;
  G = (G > 0) ? G : 0;
  B = (B > 0) ? B : 0;

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

function applyThemeColors(themeColor) {
  if (!themeColor) return;
  const root = document.documentElement;
  
  const darkPrimary = adjustColorBrightness(themeColor, -30);
  const darkBg = adjustColorBrightness(themeColor, -75);
  
  root.style.setProperty('--primary-color', themeColor);
  root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${darkPrimary} 0%, ${themeColor} 100%)`);
  root.style.setProperty('--dark-bg', darkBg);
}

function uploadProductImageFile() {
  const fileInput = document.getElementById('productImageFileUploader');
  const targetInput = document.getElementById('prodImageUrl');
  const previewImg = document.getElementById('productImagePreview');
  const previewWrapper = document.getElementById('productImagePreviewWrapper');
  const statusEl = document.getElementById('productImageUploadStatus');

  if (!fileInput || fileInput.files.length === 0) {
    showNotification('Pilih file gambar produk terlebih dahulu.', 'warning');
    return;
  }

  const file = fileInput.files[0];
  const fileSizeKB = (file.size / 1024).toFixed(1);
  const formData = new FormData();
  formData.append('file', file);

  statusEl.textContent = `Mengunggah "${file.name}" (${fileSizeKB} KB)...`;
  statusEl.className = 'small mt-1 text-primary';
  statusEl.style.display = 'block';

  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
    .then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        targetInput.value = data.fileUrl;
        statusEl.textContent = `✅ Upload berhasil! → ${data.fileUrl}`;
        statusEl.className = 'small mt-1 text-success fw-bold';
        
        if (previewImg) {
          previewImg.src = data.fileUrl;
          previewWrapper.style.display = 'block';
        }
      } else {
        throw new Error(data.error || `Server menolak file (HTTP ${res.status}).`);
      }
    })
    .catch(err => {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'small mt-1 text-danger';
      showNotification(`Gagal mengunggah gambar produk: ${err.message}`, 'error');
    });
}

function showNotification(message, type = 'success') {
  const container = document.getElementById('custom-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `custom-toast toast-${type}`;
  
  let iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-xmark';
  if (type === 'warning') iconClass = 'fa-triangle-exclamation';
  if (type === 'info') iconClass = 'fa-circle-info';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass} custom-toast-icon"></i>
    <div class="custom-toast-content">${message}</div>
    <button type="button" class="custom-toast-close" onclick="this.parentElement.classList.add('fade-out'); setTimeout(() => this.parentElement.remove(), 300)">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

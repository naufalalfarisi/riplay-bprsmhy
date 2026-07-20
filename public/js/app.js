// --- RIPLAY App Core JavaScript Logic ---

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

let allProducts = [];
let activeCategory = 'tabungan';
let bankSettings = {};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize clock and calendar
  initClock();
  
  // Theme toggle initialization
  initTheme();
  
  // Create animated background blobs
  createBackgroundBlobs();

  // Initialize navbar scroll transition
  initNavbarScroll();

  // Load initial bank settings and products
  fetchSettings();
  fetchProducts();

  // Calculate default values for calculators
  calculateDeposito();
  calculatePembiayaan();
});

// --- 1. Real-time Clock and Calendar (Kiosk-style) ---
function initClock() {
  const clockEl = document.getElementById('live-time');
  const dateEl = document.getElementById('live-date');

  function updateClock() {
    const now = new Date();
    
    // Clock
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${hrs}:${mins}:${secs}`;

    // Date
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const dayName = days[now.getDay()];
    const dateNum = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();

    if (dateEl) dateEl.textContent = `${dayName}, ${dateNum} ${monthName} ${year}`;
  }

  updateClock();
  setInterval(updateClock, 1000);
}

// --- 2. Light / Dark Theme Management ---
function initTheme() {
  const toggleSwitch = document.querySelector('.theme-switch input');
  const currentTheme = localStorage.getItem('theme') || 'light';

  // Apply default
  document.documentElement.setAttribute('data-theme', currentTheme);
  if (currentTheme === 'dark' && toggleSwitch) {
    toggleSwitch.checked = true;
  }

  if (toggleSwitch) {
    toggleSwitch.addEventListener('change', (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      
      // Update background color based on theme
      if (theme === 'light') {
        if (bankSettings.bgColor) {
          document.documentElement.style.setProperty('--bg-body', bankSettings.bgColor);
        } else {
          document.documentElement.style.setProperty('--bg-body', '#f5f7fb');
        }
      } else {
        document.documentElement.style.setProperty('--bg-body', '#0a0f1d');
      }

      if (bankSettings.themeColor) {
        applyThemeColors(bankSettings.themeColor, theme);
      }
    });
  }
}

// --- 3. Dynamic Background Visuals ---
function createBackgroundBlobs() {
  const container = document.getElementById('particles-container');
  if (!container) return;

  const colors = ['rgba(25, 106, 92, 0.08)', 'rgba(60, 165, 47, 0.05)', 'rgba(27, 139, 72, 0.05)'];
  
  for (let i = 0; i < 3; i++) {
    const blob = document.createElement('div');
    blob.classList.add('bg-blob');
    
    // Random sizes and positions
    const size = Math.floor(Math.random() * 300) + 300;
    blob.style.width = `${size}px`;
    blob.style.height = `${size}px`;
    blob.style.left = `${Math.random() * 80}%`;
    blob.style.top = `${Math.random() * 80}%`;
    
    // Animation properties
    blob.style.animationDuration = `${20 + i * 8}s`;
    blob.style.animationDelay = `${i * -5}s`;
    
    container.appendChild(blob);
  }
}

// --- 4. Fetch Bank Settings ---
function fetchSettings() {
  fetch('/api/settings')
    .then(res => res.json())
    .then(data => {
      bankSettings = data;
      
      // Apply theme color dynamically
      const currentTheme = localStorage.getItem('theme') || 'light';
      if (data.themeColor) {
        applyThemeColors(data.themeColor, currentTheme);
      }
      if (currentTheme === 'light' && data.bgColor) {
        document.documentElement.style.setProperty('--bg-body', data.bgColor);
      }
      
      // Update logo image src or show text fallback
      const navLogo = document.getElementById('bank-name-logo');
      const navLogoTextWrapper = document.getElementById('bank-name-logo-text-wrapper');
      const navLogoText = document.getElementById('bank-name-logo-text');
      
      const customLogo = data.logoUrl || '';
      if (customLogo.trim() !== '') {
        if (navLogo) {
          const customLogoLight = data.logoLightUrl || '';
          if (window.scrollY > 30) {
            navLogo.src = customLogo;
          } else {
            navLogo.src = customLogoLight || customLogo;
          }
          navLogo.alt = data.logoText || 'MHY Syariah';
          navLogo.classList.remove('d-none');
        }
        if (navLogoTextWrapper) navLogoTextWrapper.classList.add('d-none');
      } else {
        // Fallback to text logo
        if (navLogo) navLogo.classList.add('d-none');
        if (navLogoTextWrapper) {
          navLogoTextWrapper.classList.remove('d-none');
          navLogoTextWrapper.classList.add('d-flex');
        }
        if (navLogoText) navLogoText.innerHTML = formatTwoToneText(data.logoText || 'MHY Syariah');
      }
      
      // Footer logo handling
      const footerLogo = document.getElementById('footer-logo-text');
      const footerLogoTextWrapper = document.getElementById('footer-logo-text-wrapper');
      const footerBankNameText = document.getElementById('footer-bank-name-text');
      
      const customFooterLogo = data.logoLightUrl || data.logoUrl || ''; // Use custom logoLightUrl or fallback to logoUrl
      if (customFooterLogo.trim() !== '') {
        if (footerLogo) {
          footerLogo.src = customFooterLogo;
          footerLogo.alt = data.logoText || 'MHY Syariah';
          footerLogo.classList.remove('d-none');
        }
        if (footerLogoTextWrapper) footerLogoTextWrapper.classList.add('d-none');
      } else {
        // Fallback to text logo
        if (footerLogo) footerLogo.classList.add('d-none');
        if (footerLogoTextWrapper) {
          footerLogoTextWrapper.classList.remove('d-none');
          footerLogoTextWrapper.classList.add('d-flex');
        }
        if (footerBankNameText) footerBankNameText.innerHTML = formatTwoToneText(data.logoText || 'MHY Syariah');
      }

      if (document.getElementById('footer-bank-name')) {
        document.getElementById('footer-bank-name').textContent = data.bankName || 'BPRS MHY';
      }
      
      // Two-tone Hero Title text
      const heroBankNameEl = document.getElementById('hero-bank-name');
      if (heroBankNameEl) {
        heroBankNameEl.innerHTML = `<span class="tone-riplay">RIPLAY</span><span class="tone-divider">|</span>${formatTwoToneText(data.logoText || 'MHY Syariah')}`;
      }
      
      // Hero Subtitle dynamic loading
      const heroSubtitleEl = document.querySelector('.hero-subtitle');
      if (heroSubtitleEl) {
        heroSubtitleEl.textContent = data.heroSubtitle || 'Ringkasan Informasi Produk dan Layanan yang Transparan, Cepat, dan Sesuai Prinsip Syariah';
      }
      
      // About text
      const footerAboutEl = document.getElementById('footer-about-text');
      if (footerAboutEl) {
        footerAboutEl.textContent = `${data.bankName || 'Bank Syariah'} menyediakan berbagai produk keuangan syariah terpercaya seperti Tabungan, Deposito, dan Pembiayaan untuk membantu mewujudkan masa depan berkah tanpa riba.`;
      }
      
      // Contacts
      document.getElementById('footer-address').textContent = data.address || 'Alamat Bank';
      document.getElementById('footer-phone').textContent = data.phone || 'Telepon';
      document.getElementById('footer-email').textContent = data.email || 'Email';
      
      // Dynamic WhatsApp format
      const waEl = document.getElementById('footer-whatsapp');
      if (waEl) {
        let waDisplay = data.whatsapp || '6285328707560';
        if (waDisplay.startsWith('62')) {
          waDisplay = '0' + waDisplay.substring(2);
        }
        if (waDisplay.length >= 10) {
          // Format as 0xxx-xxxx-xxxx
          waDisplay = waDisplay.replace(/(\d{4})(\d{4})(\d{3,5})/, '$1-$2-$3');
        }
        waEl.textContent = waDisplay;
      }
      
      // Socials
      const fb = document.getElementById('social-fb');
      const ig = document.getElementById('social-ig');
      const yt = document.getElementById('social-yt');
      
      if (data.facebook) { fb.href = data.facebook; fb.style.display = 'flex'; } else { fb.style.display = 'none'; }
      if (data.instagram) { ig.href = data.instagram; ig.style.display = 'flex'; } else { ig.style.display = 'none'; }
      if (data.youtube) { yt.href = data.youtube; yt.style.display = 'flex'; } else { yt.style.display = 'none'; }
    })
    .catch(err => console.error('Gagal mengambil pengaturan bank:', err));
}

// --- 5. Fetch Products and Render Cards ---
function fetchProducts() {
  fetch('/api/products')
    .then(res => res.json())
    .then(data => {
      allProducts = data;
      renderProducts();
    })
    .catch(err => {
      console.error('Gagal mengambil data produk:', err);
      document.getElementById('productsGrid').innerHTML = `
        <div class="col-12 text-center text-danger py-5">
          <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
          <p>Gagal memuat informasi produk. Silakan refresh halaman.</p>
        </div>
      `;
    });
}

function getProductIcon(category, name) {
  const nameLower = (name || '').toLowerCase();
  if (category === 'tabungan') {
    if (nameLower.includes('hadiah') || nameLower.includes('berhadiah')) {
      return 'fa-solid fa-gift';
    } else if (nameLower.includes('ukhuwah')) {
      return 'fa-solid fa-trophy';
    } else if (nameLower.includes('qurban') || nameLower.includes('kurban')) {
      return 'fa-solid fa-mosque';
    } else {
      return 'fa-solid fa-sack-dollar';
    }
  } else if (category === 'deposito') {
    return 'fa-solid fa-vault';
  } else if (category === 'pembiayaan') {
    return 'fa-solid fa-hand-holding-dollar';
  }
  return 'fa-solid fa-star';
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const searchQuery = document.getElementById('productSearch').value.toLowerCase().trim();
  
  // Filter products by category AND search query
  const filtered = allProducts.filter(product => {
    const matchesCategory = product.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery) ||
      product.tagline.toLowerCase().includes(searchQuery) ||
      product.contract.toLowerCase().includes(searchQuery) ||
      product.description.toLowerCase().includes(searchQuery);
    
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fa-solid fa-folder-open fa-3x text-muted mb-3"></i>
        <p class="text-muted">Tidak ada produk ditemukan untuk pencarian atau kategori ini.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(product => {
    const iconClass = getProductIcon(product.category, product.name);
    const imageSrc = product.imageUrl && product.imageUrl.trim() !== '' 
      ? product.imageUrl 
      : '/images/logo-mhy.png'; // fallback to logo MHY if empty
    
    return `
      <div class="col-lg-4 col-md-6 animate-fade-in mb-4">
        <div class="product-card">
          <!-- Background Image Wrapper -->
          <div class="product-card-img-wrapper" onclick="openRipLayModal('${product.id}')" style="cursor: pointer;">
            <img src="${imageSrc}" alt="${escapeHTML(product.name)}" class="product-card-bg-img" onerror="this.onerror=null; this.src='/images/logo-mhy.png';">
          </div>
          
          <!-- Floating Category Icon Badge -->
          <div class="product-card-badge">
            <i class="${iconClass}"></i>
          </div>
          
          <!-- Overlapping White Info Box -->
          <div class="product-card-info-box">
            <h3 class="product-card-title">${escapeHTML(product.name)}</h3>
            <p class="product-tagline">${escapeHTML(product.tagline)}</p>
            <button class="card-action-btn" onclick="openRipLayModal('${product.id}')">
              Selengkapnya (RIPLAY)
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// --- 6. Category Selection & Search ---
function switchCategory(category) {
  activeCategory = category;
  
  // Update Active Tab styles
  const categories = ['tabungan', 'deposito', 'pembiayaan'];
  categories.forEach(cat => {
    const el = document.getElementById(`tab-${cat}`);
    if (el) {
      if (cat === category) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  });

  // Highlight Nav links
  const navLinks = document.querySelectorAll('#navbarText .nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
    const linkText = link.textContent.toLowerCase();
    if (linkText.includes(category)) {
      link.classList.add('active');
    }
  });

  // Re-fetch items from server to ensure any edits are visible without manual page refresh!
  fetchProducts();
}

function handleSearch() {
  const query = document.getElementById('productSearch').value;
  const clearBtn = document.getElementById('searchClear');
  
  if (query.trim().length > 0) {
    clearBtn.style.display = 'block';
  } else {
    clearBtn.style.display = 'none';
  }

  renderProducts();
}

function clearSearch() {
  document.getElementById('productSearch').value = '';
  document.getElementById('searchClear').style.display = 'none';
  renderProducts();
}

// --- 7. Modal RIPLAY Detail Loader ---
function openRipLayModal(productId) {
  // Fetch latest product details from server to ensure data is always fresh!
  fetch(`/api/products/${productId}`)
    .then(res => {
      if (!res.ok) throw new Error('Gagal memuat rincian produk.');
      return res.json();
    })
    .then(product => {
      // Set header
      document.getElementById('modalCategory').textContent = product.category.toUpperCase();
      document.getElementById('riplayModalLabel').textContent = product.name;
      document.getElementById('modalTagline').textContent = product.tagline;

      // Set description & akad
      document.getElementById('modalDescription').textContent = product.description;
      document.getElementById('modalContract').textContent = product.contract;
      
      // Set product image dynamically inside the modal
      const imgBlock = document.getElementById('modalImageBlock');
      const imgEl = document.getElementById('modalProductImage');
      const descBlock = document.getElementById('modalDescriptionBlock');
      
      if (product.imageUrl && product.imageUrl.trim() !== '') {
        if (imgEl) {
          imgEl.src = product.imageUrl;
          imgEl.onerror = () => {
            imgEl.src = '/images/logo-mhy.png';
          };
        }
        if (imgBlock) imgBlock.classList.remove('d-none');
        if (descBlock) descBlock.style.gridColumn = 'span 1';
      } else {
        if (imgBlock) imgBlock.classList.add('d-none');
        if (descBlock) descBlock.style.gridColumn = 'span 2';
      }

      // Populate Lists helper
      const populateList = (elementId, arrayData, iconClass) => {
        const ul = document.getElementById(elementId);
        ul.innerHTML = '';
        if (!arrayData || arrayData.length === 0) {
          ul.innerHTML = '<li class="text-muted small">Data tidak tersedia</li>';
          return;
        }
        arrayData.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        });
      };

      populateList('modalFeatures', product.features);
      populateList('modalRequirements', product.requirements);
      populateList('modalBenefits', product.benefits);
      populateList('modalRisks', product.risks);
      populateList('modalFees', product.fees);

      // Download PDF / Brochure Button Configuration
      const pdfBtn = document.getElementById('btnDownloadPdf');
      if (product.pdfUrl && product.pdfUrl.trim() !== '') {
        pdfBtn.href = product.pdfUrl;
        pdfBtn.style.display = 'flex';
        pdfBtn.target = '_blank';
        
        // Determine dynamic icon & label based on file extension
        const ext = product.pdfUrl.split('.').pop().toLowerCase();
        if (ext === 'pdf') {
          pdfBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Unduh Ringkasan RIPLAY (PDF)';
          pdfBtn.setAttribute('download', '');
        } else if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) {
          pdfBtn.innerHTML = '<i class="fa-solid fa-file-image"></i> Lihat / Unduh Brosur Gambar';
          pdfBtn.removeAttribute('download'); // Open in new tab for viewing
        } else {
          pdfBtn.innerHTML = '<i class="fa-solid fa-file-arrow-down"></i> Unduh Brosur / Ringkasan';
          pdfBtn.setAttribute('download', '');
        }
      } else {
        pdfBtn.style.display = 'none';
      }

      // WA CTA Button Configuration
      const waBtn = document.getElementById('btnWhatsappLink');
      if (product.whatsappLink && product.whatsappLink.trim() !== '') {
        waBtn.href = product.whatsappLink;
      } else {
        // Generate fallback using global phone number
        const globalPhone = bankSettings.whatsapp || '6285328707560';
        const textMsg = encodeURIComponent(`Assalamu'alaikum, saya ingin bertanya lebih lanjut mengenai produk ${product.name}.`);
        waBtn.href = `https://api.whatsapp.com/send/?phone=${globalPhone}&text=${textMsg}`;
      }

      // Launch Modal using Bootstrap API
      const modalEl = document.getElementById('riplayModal');
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    })
    .catch(err => {
      console.error(err);
      alert('Gagal mengambil informasi rincian terbaru dari server.');
    });
}

// --- 8. Tab Selector for Simulator/Calculator ---
function switchCalc(calcType) {
  const tabs = ['deposito', 'pembiayaan'];
  tabs.forEach(t => {
    const tabEl = document.getElementById(`calc-tab-${t}`);
    const contentEl = document.getElementById(`calc-${t}`);
    
    if (t === calcType) {
      tabEl.classList.add('active');
      contentEl.classList.add('active');
    } else {
      tabEl.classList.remove('active');
      contentEl.classList.remove('active');
    }
  });

  if (calcType === 'deposito') {
    calculateDeposito();
  } else {
    calculatePembiayaan();
  }
}

// Format currency helper
function formatIDR(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number);
}

// --- 9. Deposito Calculator Logic ---
function calculateDeposito() {
  const amountInput = document.getElementById('depoAmount');
  const tenureSelect = document.getElementById('depoTenure');
  const rateInput = document.getElementById('depoRate');
  
  if (!amountInput || !tenureSelect || !rateInput) return;

  const amount = parseFloat(amountInput.value) || 0;
  const tenor = parseInt(tenureSelect.value) || 12;
  const rate = parseFloat(rateInput.value) || 6.5;

  // Sharia bagi hasil projection formula (using equivalent rate equivalent)
  // Bagi Hasil Per Bulan = Pokok * (Equivalent Rate % / 12)
  const monthlyBagiHasilGross = amount * (rate / 100) / 12;
  
  // Tax logic: In Indonesia, deposits > 7.5 million IDR are subject to a 20% PPh income tax
  let taxRate = 0;
  if (amount >= 7500000) {
    taxRate = 0.20;
  }
  
  const taxAmount = monthlyBagiHasilGross * taxRate;
  const monthlyBagiHasilNet = monthlyBagiHasilGross - taxAmount;
  const totalAccumulation = monthlyBagiHasilNet * tenor;

  // Update UI
  document.getElementById('depoResult').textContent = formatIDR(monthlyBagiHasilNet);
  document.getElementById('depoResultTotal').textContent = formatIDR(amount);
  document.getElementById('depoResultAccum').textContent = formatIDR(totalAccumulation);

  // Update Dynamic Chart
  const totalSum = amount + totalAccumulation;
  const principalPct = totalSum > 0 ? (amount / totalSum) * 100 : 100;
  const profitPct = totalSum > 0 ? (totalAccumulation / totalSum) * 100 : 0;

  const principalBar = document.getElementById('chartDepoPrincipalBar');
  const profitBar = document.getElementById('chartDepoProfitBar');
  const principalPctText = document.getElementById('chartDepoPrincipalPct');
  const profitPctText = document.getElementById('chartDepoProfitPct');

  if (principalBar && profitBar && principalPctText && profitPctText) {
    principalBar.style.width = `${principalPct}%`;
    profitBar.style.width = `${profitPct}%`;
    principalPctText.textContent = `${principalPct.toFixed(1)}%`;
    profitPctText.textContent = `${profitPct.toFixed(1)}%`;
  }
}

// --- 10. Pembiayaan Calculator Logic (BPRS BDS Style) ---
function calculatePembiayaan() {
  const purposeSelect = document.getElementById('loanPurpose');
  const amountInput = document.getElementById('loanAmount');
  const tenureInput = document.getElementById('loanTenure');

  if (!purposeSelect || !amountInput || !tenureInput) return;

  const monthlyRate = parseFloat(purposeSelect.value) || 0.015;
  const plafon = parseFloat(amountInput.value) || 0;
  const tenorMonths = parseInt(tenureInput.value) || 36;

  // Monthly Margin = rate * plafon
  const monthlyMargin = plafon * monthlyRate;

  // Monthly Principal = plafon / tenor
  const monthlyPrincipal = tenorMonths > 0 ? (plafon / tenorMonths) : 0;

  // Monthly Installment = Monthly Principal + Monthly Margin
  const monthlyInstallment = monthlyPrincipal + monthlyMargin;

  // Total Margin over the whole tenor
  const totalMargin = monthlyMargin * tenorMonths;

  // Total Payment (Pokok + Margin)
  const totalLiability = plafon + totalMargin;

  // Update UI Result fields
  document.getElementById('loanResult').textContent = formatIDR(monthlyInstallment);
  document.getElementById('loanResultPrincipal').textContent = formatIDR(plafon);
  document.getElementById('loanResultMargin').textContent = formatIDR(totalMargin);

  // Update Dynamic Chart (Pokok vs Margin)
  const principalPct = totalLiability > 0 ? (plafon / totalLiability) * 100 : 100;
  const marginPct = totalLiability > 0 ? (totalMargin / totalLiability) * 100 : 0;

  const pBar = document.getElementById('chartPrincipalBar');
  const mBar = document.getElementById('chartMarginBar');
  const pPctText = document.getElementById('chartPrincipalPct');
  const mPctText = document.getElementById('chartMarginPct');

  if (pBar && mBar && pPctText && mPctText) {
    pBar.style.width = `${principalPct}%`;
    mBar.style.width = `${marginPct}%`;
    pPctText.textContent = `${principalPct.toFixed(1)}%`;
    mPctText.textContent = `${marginPct.toFixed(1)}%`;
  }

  // Update Akad Note Dynamically
  const selectedIndex = purposeSelect.selectedIndex;
  const purposeText = purposeSelect.options[selectedIndex].text;
  let akadName = 'Murabahah (Jual Beli)';
  let akadDescription = 'Angsuran bersifat tetap/flat hingga masa pembiayaan berakhir.';

  if (purposeText.includes('Multijasa') || purposeText.includes('Umrah') || purposeText.includes('Pendidikan')) {
    akadName = 'Ijarah (Sewa Jasa / Multijasa)';
    akadDescription = 'Angsuran bersifat tetap/flat hingga masa pembiayaan berakhir.';
  } else if (purposeText.includes('Musyarakah') || purposeText.includes('Modal Kerja')) {
    akadName = 'Musyarakah (Bagi Hasil / Syirkah)';
    akadDescription = 'Angsuran/kontribusi disesuaikan dengan nisbah bagi hasil usaha.';
  }

  const akadNoteEl = document.getElementById('loanAkadNote');
  if (akadNoteEl) {
    akadNoteEl.innerHTML = `<i class="fa-solid fa-circle-info me-1"></i> Akad yang digunakan: <strong>${akadName}</strong>. ${akadDescription}`;
  }
}

// --- 11. Custom Branding Theme Dynamic Adjustments ---
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

function applyThemeColors(themeColor, currentTheme) {
  if (!themeColor) return;
  const root = document.documentElement;
  
  if (currentTheme === 'dark') {
    // In dark mode, make the primary color pop (lighten it to act as a neon accent)
    const brightPrimary = adjustColorBrightness(themeColor, 40);
    const darkBgGradient = adjustColorBrightness(themeColor, -80);
    const midBgGradient = adjustColorBrightness(themeColor, -50);
    
    root.style.setProperty('--primary-color', brightPrimary);
    root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${darkBgGradient} 0%, ${midBgGradient} 100%)`);
    root.style.setProperty('--hero-gradient', `linear-gradient(to bottom, ${darkBgGradient} 0%, ${midBgGradient} 55%, ${midBgGradient}00 100%)`);
    
    const secondaryColor = adjustColorBrightness(themeColor, 60);
    root.style.setProperty('--secondary-color', secondaryColor);
    root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${brightPrimary} 0%, ${secondaryColor} 100%)`);

    // Two-tone colors dark mode
    root.style.setProperty('--tone-1-color', brightPrimary);
    root.style.setProperty('--tone-2-color', secondaryColor);
  } else {
    // Light mode
    const darkPrimary = adjustColorBrightness(themeColor, -30);
    const secondaryColor = adjustColorBrightness(themeColor, 20); // slightly lighter
    const accentEnd = adjustColorBrightness(secondaryColor, 30);
    
    root.style.setProperty('--primary-color', themeColor);
    root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${darkPrimary} 0%, ${themeColor} 100%)`);
    root.style.setProperty('--hero-gradient', `linear-gradient(to bottom, ${darkPrimary} 0%, ${themeColor} 55%, ${themeColor}00 100%)`);
    root.style.setProperty('--secondary-color', secondaryColor);
    root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${secondaryColor} 0%, ${accentEnd} 100%)`);

    // Two-tone colors light mode
    root.style.setProperty('--tone-1-color', themeColor);
    root.style.setProperty('--tone-2-color', secondaryColor);
  }
}

// --- 12. Helper Functions for Navbar Scroll and Two-Tone text formatting ---
function initNavbarScroll() {
  const nav = document.getElementById('mainNav');
  const navLogo = document.getElementById('bank-name-logo');
  if (!nav) return;

  function checkScroll() {
    const customLogo = bankSettings.logoUrl || '';
    const customLogoLight = bankSettings.logoLightUrl || '';

    if (window.scrollY > 30) {
      nav.classList.add('navbar-scrolled');
      if (navLogo && customLogo) {
        navLogo.src = customLogo;
      }
    } else {
      nav.classList.remove('navbar-scrolled');
      if (navLogo && (customLogoLight || customLogo)) {
        navLogo.src = customLogoLight || customLogo;
      }
    }
  }

  window.addEventListener('scroll', checkScroll);
  checkScroll(); // Run initial check in case page starts scrolled down
}

function formatTwoToneText(text) {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length > 1) {
    const firstWord = words[0];
    const rest = words.slice(1).join(' ');
    return `<span class="tone-1">${firstWord}</span> <span class="tone-2">${rest}</span>`;
  }
  return `<span class="tone-1">${text}</span>`;
}

// --- 13. WhatsApp Simulation Sharing Handlers ---
function shareDepositoWA() {
  const amount = document.getElementById('depoResultTotal').textContent;
  const tenureSelect = document.getElementById('depoTenure');
  const tenureText = tenureSelect ? tenureSelect.options[tenureSelect.selectedIndex].text : '';
  const rate = document.getElementById('depoRate').value;
  const monthlyResult = document.getElementById('depoResult').textContent;
  const accumResult = document.getElementById('depoResultAccum').textContent;
  
  const message = `Assalamu'alaikum, saya ingin berkonsultasi mengenai penempatan Deposito Syariah:\n\n` +
    `- Jumlah Penempatan: ${amount}\n` +
    `- Jangka Waktu: ${tenureText}\n` +
    `- Proyeksi Bagi Hasil (Equiv. Rate): ${rate}%\n` +
    `- Estimasi Hasil/Bulan (Nett): ${monthlyResult}\n` +
    `- Total Akumulasi Hasil: ${accumResult}\n\n` +
    `Mohon dibantu informasi selengkapnya. Terima kasih.`;
    
  const globalPhone = bankSettings.whatsapp || '6285328707560';
  window.open(`https://api.whatsapp.com/send/?phone=${globalPhone}&text=${encodeURIComponent(message)}`, '_blank');
}

function sharePembiayaanWA() {
  const purposeSelect = document.getElementById('loanPurpose');
  const purposeText = purposeSelect ? purposeSelect.options[purposeSelect.selectedIndex].text : '';
  const totalPrice = formatIDR(parseFloat(document.getElementById('loanAmount').value) || 0);
  const tenure = document.getElementById('loanTenure').value;
  const monthlyResult = document.getElementById('loanResult').textContent;
  const totalMargin = document.getElementById('loanResultMargin').textContent;
  
  const message = `Assalamu'alaikum, saya ingin berkonsultasi mengenai pengajuan Pembiayaan Syariah:\n\n` +
    `- Tujuan Pembiayaan: ${purposeText}\n` +
    `- Jumlah Pembiayaan (Plafon): ${totalPrice}\n` +
    `- Jangka Waktu (Tenor): ${tenure} Bulan\n` +
    `- Total Margin Bank: ${totalMargin}\n` +
    `- Estimasi Angsuran/Bulan: ${monthlyResult}\n\n` +
    `Mohon dibantu informasi persyaratan pengajuannya. Terima kasih.`;
    
  const globalPhone = bankSettings.whatsapp || '6285328707560';
  window.open(`https://api.whatsapp.com/send/?phone=${globalPhone}&text=${encodeURIComponent(message)}`, '_blank');
}

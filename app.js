// ============================================
// APP.JS — Menu 3D Restaurant (No Database / localStorage)
// ============================================

const STORE_KEY = (RESTAURANT_DATA.slug || 'restaurant') + '_store_v2';
const ADMIN_PASSWORD = RESTAURANT_DATA.adminPassword || 'admin123';

// ── Storage helpers ──
function loadStore() {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  // Seed initial data
  const seed = {
    categories: RESTAURANT_DATA.categories.map(c => ({ ...c, id: c.id || crypto.randomUUID() })),
    produits: RESTAURANT_DATA.produits.map(p => ({ ...p, id: p.id || crypto.randomUUID() })),
    commandes: [],
    appels: [],
    parametres: { ...RESTAURANT_DATA.parametres },
  };
  saveStore(seed);
  return seed;
}
function saveStore(data) { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }

// ── State ──
let store = loadStore();
let panier = [];
let currentRoute = location.hash.slice(1) || '/';
let currentCategory = 0;
let searchQuery = '';

// ── Router ──
window.addEventListener('hashchange', () => {
  currentRoute = location.hash.slice(1) || '/';
  render();
});

function navigate(path) { location.hash = path; }

// ── Toast ──
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Helpers ──
function normalize(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function isMobile() { return window.innerWidth < 768; }
function formatPrice(p) { return Number(p).toFixed(2) + ' $'; }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2); }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

// ── Menu Page ──
function renderMenuPage() {
  const p = store.parametres;
  const cats = store.categories.filter(c => c.actif !== false).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const prods = store.produits.filter(p => p.disponible !== false);

  const app = document.getElementById('app');

  // Build search results
  let contentHtml = '';
  if (searchQuery.trim()) {
    const q = normalize(searchQuery);
    const filtered = prods.filter(p => {
      const catName = (cats.find(c => c.id === p.categorie_id) || {}).nom || '';
      return normalize(p.nom).includes(q) || normalize(p.description).includes(q) || normalize(catName).includes(q);
    });
    if (filtered.length === 0) {
      contentHtml = `<div class="empty-state"><div class="empty-state-icon">🔍</div><p>Aucun résultat.</p></div>`;
    } else {
      const byCat = {};
      filtered.forEach(p => {
        const catName = (cats.find(c => c.id === p.categorie_id) || {}).nom || 'Autres';
        if (!byCat[catName]) byCat[catName] = [];
        byCat[catName].push(p);
      });
      contentHtml = Object.entries(byCat).map(([catName, items]) => `
        <div class="cat-section">
          <h3 class="cat-section-title">${escapeHtml(catName)} <span style="font-size:12px;font-weight:400;color:var(--brand-dark-soft)">(${items.length})</span></h3>
          ${items.map(p => renderProductCard(p)).join('')}
        </div>`).join('');
    }
  } else {
    // Category tabs
    const tabsHtml = `<div class="cat-tabs" id="cat-tabs">
      ${cats.map((c, i) => `<div class="cat-tab ${i === currentCategory ? 'active' : ''}" onclick="selectCategory(${i})">${c.emoji || '🍽️'} ${escapeHtml(c.nom)}</div>`).join('')}
    </div>`;

    const currentCat = cats[currentCategory];
    const catProds = currentCat ? prods.filter(p => p.categorie_id === currentCat.id).sort((a, b) => (a.ordre || 0) - (b.ordre || 0)) : [];

    contentHtml = tabsHtml + (catProds.length > 0
      ? catProds.map(p => renderProductCard(p)).join('')
      : `<div class="empty-state"><div class="empty-state-icon">🍽️</div><p>La carte est vide.</p></div>`
    );
  }

  const totalItems = panier.reduce((s, i) => s + i.quantite, 0);

  app.innerHTML = `
    <header class="app-header">
      <div style="display:flex;align-items:center;gap:12px;min-width:0">
        <div class="header-logo">${p.logo_url ? `<img src="${p.logo_url}" alt="">` : (RESTAURANT_DATA.emoji || '🍽️')}</div>
        <div style="min-width:0">
          <h1 class="header-title">${escapeHtml(p.nom_restaurant || RESTAURANT_DATA.name)}</h1>
          ${!isMobile() ? `<p class="header-subtitle">Notre Carte</p>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button class="header-btn" onclick="openAppelServeur()">${isMobile() ? '🔔' : '🔔 Appeler le serveur'}</button>
        <button class="header-btn ${totalItems > 0 ? 'header-btn-primary' : ''}" onclick="openPanier()">
          🛒 ${!isMobile() ? 'Commande' : ''}${totalItems > 0 ? ` <span style="background:rgba(255,255,255,0.25);border-radius:50%;min-width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">${totalItems}</span>` : ''}
        </button>
      </div>
    </header>
    <div class="search-bar">
      <div class="search-input-wrap">
        <span>🔎</span>
        <input type="text" placeholder="Rechercher un plat, une catégorie…" value="${escapeHtml(searchQuery)}" oninput="handleSearch(this.value)">
        ${searchQuery ? `<button class="search-clear" onclick="clearSearch()">✕</button>` : ''}
      </div>
    </div>
    <div class="menu-content">${contentHtml}</div>
    ${p.adresse || p.telephone ? `
    <footer class="app-footer">
      ${p.adresse ? `<div class="footer-info">📍 ${escapeHtml(p.adresse)}</div>` : ''}
      ${p.telephone ? `<div class="footer-info">📞 ${escapeHtml(p.telephone)}</div>` : ''}
      ${p.horaires ? `<div class="footer-info">🕐 ${escapeHtml(p.horaires)}</div>` : ''}
      <div class="footer-info" style="margin-top:12px;font-size:11px;opacity:0.6">
        <a href="#/admin">Espace Admin</a>
      </div>
    </footer>` : ''}
  `;
}

function renderProductCard(p) {
  const hasImage = p.image_url && p.image_url.trim();
  return `
    <div class="product-card" id="card-${p.id}">
      ${hasImage ? `<img src="${p.image_url}" alt="${escapeHtml(p.nom)}" loading="lazy">` : ''}
      <div class="product-info">
        <div class="product-name-row">
          <span class="product-name">${escapeHtml(p.nom)}</span>
          <span class="product-dots"></span>
          <span class="product-price">${formatPrice(p.prix)}</span>
        </div>
        ${p.description ? `<p class="product-desc">${escapeHtml(p.description)}</p>` : ''}
        <div class="product-actions">
          <div class="qty-control">
            <button class="qty-btn" onclick="updateCardQty('${p.id}',-1)">−</button>
            <span class="qty-display" id="qty-${p.id}">1</span>
            <button class="qty-btn qty-btn-plus" onclick="updateCardQty('${p.id}',1)">+</button>
          </div>
          <button class="add-btn" onclick="addToCart('${p.id}')">Ajouter</button>
        </div>
      </div>
    </div>`;
}

const cardQty = {};
function updateCardQty(pid, delta) {
  if (!cardQty[pid]) cardQty[pid] = 1;
  cardQty[pid] = Math.max(1, cardQty[pid] + delta);
  const el = document.getElementById('qty-' + pid);
  if (el) el.textContent = cardQty[pid];
}

function addToCart(pid) {
  const p = store.produits.find(x => x.id === pid);
  if (!p) return;
  const qty = cardQty[pid] || 1;
  const existing = panier.find(i => i.id === pid);
  if (existing) { existing.quantite += qty; }
  else { panier.push({ id: p.id, nom: p.nom, prix_unit: p.prix, quantite: qty }); }
  cardQty[pid] = 1;
  const el = document.getElementById('qty-' + pid);
  if (el) el.textContent = '1';
  showToast(`✓ ${p.nom} ajouté`);
  // Update cart count badge
  const totalItems = panier.reduce((s, i) => s + i.quantite, 0);
  const btns = document.querySelectorAll('.header-btn-primary');
  // Just re-render header area
  renderMenuPage();
}

function handleSearch(val) { searchQuery = val; renderMenuPage(); const inp = document.querySelector('.search-input-wrap input'); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } }
function clearSearch() { searchQuery = ''; renderMenuPage(); }
function selectCategory(i) { currentCategory = i; searchQuery = ''; renderMenuPage(); }

// ── Panier Modal ──
function openPanier() {
  if (panier.length === 0) { showToast('Votre commande est vide'); return; }
  const total = panier.reduce((s, i) => s + i.prix_unit * i.quantite, 0);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'panier-modal';
  modal.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h2 class="modal-title">🛒 Ma Commande</h2>
        <button class="modal-close" onclick="closeModal('panier-modal')">✕</button>
      </div>
      <div class="modal-body">
        ${panier.map((item, i) => `
          <div class="cart-item">
            <div class="cart-item-info">
              <div class="cart-item-name">${escapeHtml(item.nom)}</div>
              <div class="cart-item-price">${formatPrice(item.prix_unit)} × ${item.quantite} = ${formatPrice(item.prix_unit * item.quantite)}</div>
            </div>
            <div class="cart-item-controls">
              <button class="qty-btn" onclick="updatePanierQty(${i},-1)">−</button>
              <span class="cart-item-qty">${item.quantite}</span>
              <button class="qty-btn qty-btn-plus" onclick="updatePanierQty(${i},1)">+</button>
              <button class="btn-danger" onclick="removePanierItem(${i})">🗑️</button>
            </div>
          </div>`).join('')}
        <div class="cart-total-row">
          <span class="cart-total-label">Total</span>
          <span class="cart-total-value">${formatPrice(total)}</span>
        </div>
        <div style="margin-top:16px">
          <div class="admin-form-row">
            <label>Numéro de table *</label>
            <input type="text" id="cart-table" placeholder="Ex: 5, Bar, Terrasse…">
          </div>
          <div class="admin-form-row">
            <label>Demandes particulières</label>
            <textarea id="cart-demandes" rows="2" placeholder="Allergies, sans sel, cuisson…"></textarea>
          </div>
          <p id="cart-error" style="color:var(--danger);font-size:13px;margin-top:8px;display:none"></p>
          <button class="btn-primary" style="margin-top:8px" onclick="submitCommande()">✓ Passer la commande</button>
        </div>
      </div>
    </div>`;
  modal.addEventListener('click', () => closeModal('panier-modal'));
  document.body.appendChild(modal);
}

function updatePanierQty(i, delta) {
  panier[i].quantite += delta;
  if (panier[i].quantite <= 0) panier.splice(i, 1);
  closeModal('panier-modal');
  openPanier();
}

function removePanierItem(i) { panier.splice(i, 1); closeModal('panier-modal'); if (panier.length > 0) openPanier(); else renderMenuPage(); }

function submitCommande() {
  const table = document.getElementById('cart-table').value.trim();
  const demandes = document.getElementById('cart-demandes').value.trim();
  const errEl = document.getElementById('cart-error');
  if (!table) { errEl.textContent = 'Veuillez indiquer votre numéro de table.'; errEl.style.display = 'block'; return; }

  const montant = panier.reduce((s, i) => s + i.prix_unit * i.quantite, 0);
  const cmd = {
    id: uid(),
    numero_table: table,
    statut: 'recue',
    demandes_speciales: demandes,
    montant_total: montant,
    items: panier.map(i => ({ nom_produit: i.nom, prix_unit: i.prix_unit, quantite: i.quantite })),
    created_at: new Date().toISOString(),
  };
  store.commandes.unshift(cmd);
  saveStore(store);
  panier = [];
  closeModal('panier-modal');
  showToast('✅ Commande envoyée ! Nous préparons votre table.');
  renderMenuPage();
}

// ── Appel Serveur Modal ──
function openAppelServeur() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'appel-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:400px" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h2 class="modal-title">🔔 Appeler le serveur</h2>
        <button class="modal-close" onclick="closeModal('appel-modal')">✕</button>
      </div>
      <div class="modal-body">
        <div class="admin-form-row">
          <label>Numéro de table</label>
          <input type="text" id="appel-table" placeholder="Ex: 5, Bar, Terrasse…">
        </div>
        <p id="appel-error" style="color:var(--danger);font-size:13px;margin-top:8px;display:none"></p>
        <button class="btn-primary" style="margin-top:8px" onclick="submitAppelServeur()">🔔 Appeler le serveur</button>
      </div>
    </div>`;
  modal.addEventListener('click', () => closeModal('appel-modal'));
  document.body.appendChild(modal);
}

function submitAppelServeur() {
  const table = document.getElementById('appel-table').value.trim();
  const errEl = document.getElementById('appel-error');
  if (!table) { errEl.textContent = 'Indiquez votre numéro de table.'; errEl.style.display = 'block'; return; }
  store.appels.unshift({ id: uid(), numero_table: table, message: 'Un client demande le serveur', traite: false, created_at: new Date().toISOString() });
  saveStore(store);
  closeModal('appel-modal');
  showToast('🔔 Le serveur arrive !');
}

// ── Close modal helper ──
function closeModal(id) { const el = document.getElementById(id); if (el) el.remove(); }

// ============================================
// ADMIN PAGE
// ============================================
let adminTab = 'commandes';
let isAdminLoggedIn = false;

function renderAdminPage() {
  if (!isAdminLoggedIn) { renderAdminLogin(); return; }

  const app = document.getElementById('app');
  const p = store.parametres;

  app.innerHTML = `
    <div class="admin-layout">
      <div class="admin-header-bar">
        <h1>${escapeHtml(p.nom_restaurant || RESTAURANT_DATA.name)}</h1>
        <div style="display:flex;gap:8px;align-items:center">
          <a href="#/" class="btn-sm">← Voir le menu</a>
          <button class="btn-danger" onclick="adminLogout()">Déconnexion</button>
        </div>
      </div>
      <div class="admin-nav">
        <button class="admin-nav-btn ${adminTab === 'commandes' ? 'active' : ''}" onclick="switchTab('commandes')">📬 Commandes</button>
        <button class="admin-nav-btn ${adminTab === 'appels' ? 'active' : ''}" onclick="switchTab('appels')">🔔 Appels serveur</button>
        <button class="admin-nav-btn ${adminTab === 'produits' ? 'active' : ''}" onclick="switchTab('produits')">🍽️ Plats & Catégories</button>
        <button class="admin-nav-btn ${adminTab === 'parametres' ? 'active' : ''}" onclick="switchTab('parametres')">⚙️ Paramètres</button>
      </div>
      <div id="admin-content"></div>
    </div>`;

  renderAdminTab();
}

function renderAdminLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="admin-login">
      <div class="admin-login-card">
        <div class="admin-login-logo">${store.parametres.logo_url ? `<img src="${store.parametres.logo_url}" alt="${escapeHtml(RESTAURANT_DATA.name)}" style="width:100%;height:100%;object-fit:contain;border-radius:50%">` : (RESTAURANT_DATA.emoji || '🍽️')}</div>
        <h1 class="admin-login-title">${escapeHtml(RESTAURANT_DATA.name)}</h1>
        <p class="admin-login-sub">Espace Administration</p>
        <div class="admin-login-form">
          <div class="admin-form-row" style="text-align:left">
            <label>Mot de passe</label>
            <input type="password" id="admin-pwd" placeholder="Entrez le mot de passe" onkeydown="if(event.key==='Enter')adminLogin()">
          </div>
          <p id="admin-login-error" class="admin-login-error" style="display:none"></p>
          <button class="btn-primary" style="margin-top:16px" onclick="adminLogin()">Se connecter</button>
        </div>
        <p style="margin-top:16px"><a href="#/" style="color:var(--brand-gold);font-size:13px;text-decoration:none">← Retour au menu</a></p>
      </div>
    </div>`;
}

function adminLogin() {
  const pwd = document.getElementById('admin-pwd').value;
  if (pwd === ADMIN_PASSWORD) { isAdminLoggedIn = true; renderAdminPage(); }
  else { const e = document.getElementById('admin-login-error'); e.textContent = 'Mot de passe incorrect.'; e.style.display = 'block'; }
}
function adminLogout() { isAdminLoggedIn = false; renderAdminPage(); }
function switchTab(tab) { adminTab = tab; renderAdminPage(); }

function renderAdminTab() {
  const el = document.getElementById('admin-content');
  if (!el) return;

  if (adminTab === 'commandes') {
    if (store.commandes.length === 0) {
      el.innerHTML = `<div class="admin-card"><div class="empty-state"><div class="empty-state-icon">📭</div><p>Aucune commande pour le moment.</p></div></div>`;
      return;
    }
    const STATUT_LABELS = { recue: '📬 Reçue', en_cours: '🔥 En cours', terminee: '✅ Terminée', annulee: '❌ Annulée' };
    el.innerHTML = store.commandes.map(c => `
      <div class="admin-card">
        <div class="order-row">
          <div class="order-info">
            <div class="order-table">Table ${escapeHtml(c.numero_table)}</div>
            <div class="order-time">${new Date(c.created_at).toLocaleString('fr-FR')}</div>
            ${c.demandes_speciales ? `<div style="font-size:13px;color:var(--warning);margin-top:4px">📝 ${escapeHtml(c.demandes_speciales)}</div>` : ''}
            <div class="order-items">${c.items.map(i => `${i.quantite}× ${escapeHtml(i.nom_produit)} (${formatPrice(i.prix_unit)})`).join(', ')}</div>
            <div style="font-weight:700;margin-top:4px;color:var(--brand-primary)">Total: ${formatPrice(c.montant_total)}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <span class="order-status status-${c.statut}">${STATUT_LABELS[c.statut] || c.statut}</span>
            ${c.statut === 'recue' ? `<button class="btn-success" onclick="updateOrderStatus('${c.id}','en_cours')">Prendre en charge</button>` : ''}
            ${c.statut === 'en_cours' ? `<button class="btn-success" onclick="updateOrderStatus('${c.id}','terminee')">Terminer</button>` : ''}
            ${(c.statut === 'recue' || c.statut === 'en_cours') ? `<button class="btn-danger" onclick="updateOrderStatus('${c.id}','annulee')">Annuler</button>` : ''}
            ${(c.statut === 'terminee' || c.statut === 'annulee') ? `<button class="btn-sm" onclick="deleteOrder('${c.id}')">Supprimer</button>` : ''}
          </div>
        </div>
      </div>`).join('');
  }

  else if (adminTab === 'appels') {
    if (store.appels.length === 0) {
      el.innerHTML = `<div class="admin-card"><div class="empty-state"><div class="empty-state-icon">🔕</div><p>Aucun appel serveur.</p></div></div>`;
      return;
    }
    el.innerHTML = store.appels.map(a => `
      <div class="admin-card">
        <div class="call-row">
          <div>
            <div class="order-table">🔔 Table ${escapeHtml(a.numero_table)}</div>
            <div class="order-time">${new Date(a.created_at).toLocaleString('fr-FR')}</div>
          </div>
          <div>
            ${a.traite ? '<span style="color:var(--success);font-weight:600">✅ Traité</span>' : `<button class="btn-success" onclick="traiterAppel('${a.id}')">Marquer traité</button>`}
            <button class="btn-sm" style="margin-left:8px" onclick="deleteAppel('${a.id}')">Supprimer</button>
          </div>
        </div>
      </div>`).join('');
  }

  else if (adminTab === 'produits') {
    const cats = store.categories.sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    let html = `
      <div class="admin-card">
        <div class="admin-card-title">➕ Ajouter une catégorie</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
          <div style="flex:1;min-width:150px"><div class="admin-form-row"><label>Nom</label><input type="text" id="new-cat-nom" placeholder="Ex: Desserts"></div></div>
          <div style="width:80px"><div class="admin-form-row"><label>Emoji</label><input type="text" id="new-cat-emoji" placeholder="🍰" maxlength="2"></div></div>
          <div style="width:60px"><div class="admin-form-row"><label>Ordre</label><input type="number" id="new-cat-ordre" value="0"></div></div>
          <button class="btn-primary" style="max-width:120px;padding:10px" onclick="addCategory()">Ajouter</button>
        </div>
      </div>`;

    cats.forEach(cat => {
      const prods = store.produits.filter(p => p.categorie_id === cat.id).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
      html += `
        <div class="admin-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <h3 style="font-size:18px;color:var(--brand-primary)">${cat.emoji || '🍽️'} ${escapeHtml(cat.nom)}</h3>
            <div style="display:flex;gap:6px">
              <button class="btn-sm" onclick="editCategory('${cat.id}')">✏️ Modifier</button>
              <button class="btn-danger" onclick="deleteCategory('${cat.id}')">🗑️</button>
            </div>
          </div>
          ${prods.length > 0 ? prods.map(p => `
            <div class="admin-product-row">
              <div class="admin-product-name">${escapeHtml(p.nom)}</div>
              <div style="font-size:13px;color:var(--brand-dark-soft)">${p.description ? escapeHtml(p.description) : ''}</div>
              <div style="font-weight:800;color:var(--brand-primary)">${formatPrice(p.prix)}</div>
              <button class="btn-sm" onclick="editProduct('${p.id}')">✏️</button>
              <button class="btn-danger" onclick="deleteProduct('${p.id}')">🗑️</button>
            </div>`).join('') : '<p style="color:var(--brand-dark-soft);font-size:14px;padding:8px 0">Aucun plat dans cette catégorie.</p>'}
          <button class="btn-sm" style="margin-top:8px;width:100%" onclick="addProduct('${cat.id}')">➕ Ajouter un plat</button>
        </div>`;
    });
    el.innerHTML = html;
  }

  else if (adminTab === 'parametres') {
    const p = store.parametres;
    el.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-title">⚙️ Paramètres du restaurant</div>
        <div class="admin-form-row"><label>Nom du restaurant</label><input type="text" id="param-nom" value="${escapeHtml(p.nom_restaurant || '')}"></div>
        <div class="admin-form-row"><label>Logo (URL)</label><input type="text" id="param-logo" value="${escapeHtml(p.logo_url || '')}" placeholder="https://..."></div>
        <div class="admin-form-row"><label>Adresse</label><input type="text" id="param-adresse" value="${escapeHtml(p.adresse || '')}"></div>
        <div class="admin-form-row"><label>Téléphone</label><input type="text" id="param-tel" value="${escapeHtml(p.telephone || '')}"></div>
        <div class="admin-form-row"><label>WhatsApp</label><input type="text" id="param-wa" value="${escapeHtml(p.whatsapp || '')}"></div>
        <div class="admin-form-row"><label>Horaires</label><input type="text" id="param-horaires" value="${escapeHtml(p.horaires || '')}"></div>
        <button class="btn-primary" style="margin-top:8px" onclick="saveParametres()">💾 Enregistrer</button>
      </div>
      <div class="admin-card" style="border-color:var(--danger)">
        <div class="admin-card-title" style="color:var(--danger)">⚠️ Zone de danger</div>
        <p style="font-size:13px;color:var(--brand-dark-soft);margin-bottom:12px">Réinitialiser efface toutes les données (commandes, plats, catégories) et recharge le menu d'origine.</p>
        <button class="btn-danger" onclick="resetStore()">🔄 Réinitialiser les données</button>
      </div>`;
  }
}

// ── Admin actions ──
function updateOrderStatus(id, statut) { const c = store.commandes.find(x => x.id === id); if (c) { c.statut = statut; saveStore(store); renderAdminTab(); } }
function deleteOrder(id) { store.commandes = store.commandes.filter(x => x.id !== id); saveStore(store); renderAdminTab(); }
function traiterAppel(id) { const a = store.appels.find(x => x.id === id); if (a) { a.traite = true; saveStore(store); renderAdminTab(); } }
function deleteAppel(id) { store.appels = store.appels.filter(x => x.id !== id); saveStore(store); renderAdminTab(); }

function addCategory() {
  const nom = document.getElementById('new-cat-nom').value.trim();
  if (!nom) { showToast('Entrez un nom de catégorie'); return; }
  const emoji = document.getElementById('new-cat-emoji').value.trim() || '🍽️';
  const ordre = parseInt(document.getElementById('new-cat-ordre').value) || 0;
  store.categories.push({ id: uid(), nom, emoji, ordre, actif: true });
  saveStore(store);
  renderAdminTab();
  showToast('✓ Catégorie ajoutée');
}

function editCategory(id) {
  const cat = store.categories.find(c => c.id === id);
  if (!cat) return;
  const nom = prompt('Nom:', cat.nom);
  if (nom === null) return;
  const emoji = prompt('Emoji:', cat.emoji || '🍽️') || '🍽️';
  const ordre = parseInt(prompt('Ordre:', cat.ordre || 0)) || 0;
  cat.nom = nom.trim() || cat.nom;
  cat.emoji = emoji;
  cat.ordre = ordre;
  saveStore(store);
  renderAdminTab();
  showToast('✓ Catégorie modifiée');
}

function deleteCategory(id) {
  if (!confirm('Supprimer cette catégorie et tous ses plats ?')) return;
  store.categories = store.categories.filter(c => c.id !== id);
  store.produits = store.produits.filter(p => p.categorie_id !== id);
  saveStore(store);
  renderAdminTab();
  showToast('Catégorie supprimée');
}

function addProduct(catId) {
  const nom = prompt('Nom du plat:');
  if (!nom) return;
  const prix = parseFloat(prompt('Prix (en $):', '0'));
  if (isNaN(prix)) { showToast('Prix invalide'); return; }
  const desc = prompt('Description (optionnel):') || '';
  const ordre = parseInt(prompt('Ordre:', '0')) || 0;
  store.produits.push({ id: uid(), categorie_id: catId, nom: nom.trim(), description: desc, prix, image_url: null, disponible: true, ordre });
  saveStore(store);
  renderAdminTab();
  showToast('✓ Plat ajouté');
}

function editProduct(id) {
  const p = store.produits.find(x => x.id === id);
  if (!p) return;
  const nom = prompt('Nom:', p.nom);
  if (nom === null) return;
  const prix = parseFloat(prompt('Prix (en $):', p.prix));
  if (isNaN(prix)) { showToast('Prix invalide'); return; }
  const desc = prompt('Description:', p.description || '') || '';
  const catId = prompt('Catégorie ID (laisser vide pour ne pas changer):', p.categorie_id || '');
  p.nom = nom.trim() || p.nom;
  p.prix = prix;
  p.description = desc;
  if (catId.trim()) p.categorie_id = catId.trim();
  saveStore(store);
  renderAdminTab();
  showToast('✓ Plat modifié');
}

function deleteProduct(id) {
  if (!confirm('Supprimer ce plat ?')) return;
  store.produits = store.produits.filter(p => p.id !== id);
  saveStore(store);
  renderAdminTab();
  showToast('Plat supprimé');
}

function saveParametres() {
  store.parametres = {
    nom_restaurant: document.getElementById('param-nom').value,
    logo_url: document.getElementById('param-logo').value || null,
    adresse: document.getElementById('param-adresse').value,
    telephone: document.getElementById('param-tel').value,
    whatsapp: document.getElementById('param-wa').value,
    horaires: document.getElementById('param-horaires').value,
  };
  saveStore(store);
  document.title = `${store.parametres.nom_restaurant} — Menu`;
  showToast('✓ Paramètres enregistrés');
  renderAdminPage();
}

function resetStore() {
  if (!confirm('⚠️ Cela effacera toutes les données et rechargera le menu d\'origine. Continuer ?')) return;
  localStorage.removeItem(STORE_KEY);
  store = loadStore();
  renderAdminTab();
  showToast('Données réinitialisées');
}

// ── Main render ──
function render() {
  if (currentRoute === '/admin') renderAdminPage();
  else renderMenuPage();
}

// ── Init ──
document.title = `${store.parametres.nom_restaurant || RESTAURANT_DATA.name} — Menu`;
render();

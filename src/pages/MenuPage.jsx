import { useState, useEffect } from 'react';
import { getCategories, getProduits, appelServeur, getParametres } from '../lib/supabase';
import Book3D, { ProduitCard } from '../components/Book3D';
import Panier from '../components/Panier';

const C = {
  primary:    '#7A0000',
  primaryMid: '#A30000',
  gold:       '#C41E3A',
  goldDeep:   '#C41E3A', // higher-contrast gold for text on cream/white backgrounds
  goldLight:  '#E63950',
  beige:      '#FFF6F6',
  cream:      '#FFFFFF',
  dark:       '#1A0000',
  darkSoft:   'rgba(26,0,0,0.55)',
  border:     'rgba(196,30,58,0.20)',
};

function useIsMobile() {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setV(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return v;
}

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [produits, setProduits]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [panier, setPanier]         = useState([]);
  const [showPanier, setShowPanier] = useState(false);
  const [showAppel, setShowAppel]   = useState(false);
  const [tableAppel, setTableAppel] = useState('');
  const [errAppel, setErrAppel]     = useState('');
  const [toast, setToast]           = useState('');
  const [appelLoading, setAppelLoading] = useState(false);
  const [parametres, setParametres] = useState(null);
  const [search, setSearch]         = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    Promise.all([getCategories(), getProduits(), getParametres()]).then(([cats, prods, params]) => {
      setCategories(cats.data || []);
      setProduits(prods.data || []);
      setParametres(params.data || null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (parametres?.nom_restaurant) document.title = `${parametres.nom_restaurant} — Carte`;
  }, [parametres]);

  const buildPages = () => {
    const pages = [];
    categories.forEach(cat => {
      const prods = produits.filter(p => p.categorie_id === cat.id);
      if (prods.length) pages.push({ categorie: cat, produits: prods });
    });
    const sans = produits.filter(p => !p.categorie_id);
    if (sans.length) pages.push({ categorie: { nom: 'Autres', emoji: '🍽️' }, produits: sans });
    return pages;
  };

  const handleAdd = (produit) => {
    if (parametres && parametres.ouvert === false) {
      showToast('⛔ Restaurant fermé pour le moment — commandes indisponibles');
      return;
    }
    setPanier(prev => {
      const idx = prev.findIndex(i => i.id === produit.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], quantite: n[idx].quantite + produit.quantite }; return n; }
      return [...prev, { ...produit }];
    });
    showToast(`✓ ${produit.nom} ajouté`);
  };

  const handleUpdateQty = (idx, delta) => {
    setPanier(prev => {
      const n = [...prev];
      n[idx] = { ...n[idx], quantite: n[idx].quantite + delta };
      if (n[idx].quantite <= 0) n.splice(idx, 1);
      return n;
    });
  };

  const handleConfirm = (msg) => { setPanier([]); setShowPanier(false); showToast(msg); };

  const handleAppelServeur = async () => {
    if (!tableAppel.trim()) { setErrAppel('Indiquez votre numéro de table.'); return; }
    setAppelLoading(true);
    const { error } = await appelServeur(tableAppel.trim());
    setAppelLoading(false);
    if (error) { setErrAppel("Erreur d'envoi."); return; }
    setShowAppel(false); setTableAppel(''); showToast('🔔 Le serveur arrive !');
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const pages = buildPages();
  const totalItems = panier.reduce((s, i) => s + i.quantite, 0);
  const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const searchActive = search.trim().length > 0;
  const getCatName = (id) => categories.find(c => c.id === id)?.nom || '';
  const filtered = searchActive
    ? produits.filter(p => {
        const q = normalize(search);
        return normalize(p.nom).includes(q) || normalize(p.description).includes(q) || normalize(getCatName(p.categorie_id)).includes(q);
      })
    : [];

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, fontFamily: "'Inter', sans-serif" }}>

      {/* ── HEADER sticky ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: isMobile ? '12px 16px' : '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: C.primary, gap: 10,
        boxShadow: '0 2px 16px rgba(45,48,0,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {parametres?.logo_url
            ? <img src={parametres.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.gold}`, flexShrink: 0 }} />
            : <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🍋</div>
          }
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.beige, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {parametres?.nom_restaurant || 'Limoncello'}
            </h1>
            {!isMobile && <p style={{ fontSize: 10, color: C.gold, margin: 0, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Notre Carte</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: isMobile ? 8 : 12, flexShrink: 0 }}>
          <button onClick={() => setShowAppel(true)} style={{ background: 'rgba(255,255,255,0.10)', border: `1px solid rgba(200,184,0,0.40)`, color: C.gold, borderRadius: 8, padding: isMobile ? '7px 12px' : '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {isMobile ? '🔔' : '🔔 Appeler le serveur'}
          </button>
          <button onClick={() => setShowPanier(true)} style={{
            background: totalItems > 0 ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : 'rgba(255,255,255,0.10)',
            border: totalItems > 0 ? 'none' : `1px solid rgba(200,184,0,0.40)`,
            color: '#fff', borderRadius: 8, padding: isMobile ? '7px 12px' : '8px 20px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            🛒 {!isMobile && 'Commande'}
            {totalItems > 0 && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '50%', minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{totalItems}</span>}
          </button>
        </div>
      </header>

      {/* ── RECHERCHE sticky ── */}
      <div style={{ position: 'sticky', top: isMobile ? 64 : 72, zIndex: 99, background: C.primaryMid, padding: isMobile ? '10px 16px' : '10px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.10)', border: `1px solid rgba(200,184,0,0.25)`, borderRadius: 10, padding: '9px 14px', maxWidth: isMobile ? '100%' : 520, margin: '0 auto' }}>
          <span style={{ color: C.gold }}>🔎</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un plat, une catégorie…"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: C.beige, fontFamily: 'inherit' }} />
          {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'transparent', color: 'rgba(245,237,216,0.5)', fontSize: 16, cursor: 'pointer' }}>✕</button>}
        </div>
      </div>

      {/* ── CONTENU — scroll natif de la page ── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: isMobile ? '16px 0 80px' : '24px 32px 80px', boxSizing: 'border-box' }}>
        {!loading && parametres && parametres.ouvert === false && (
          <div style={{ margin: isMobile ? '0 16px 16px' : '0 0 16px', padding: '14px 18px', borderRadius: 12, background: 'rgba(192,57,43,0.10)', border: '1px solid rgba(192,57,43,0.35)', color: '#8E2A1E', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
            ⛔ Fermé pour le moment — la carte est consultable mais les commandes sont désactivées.
          </div>
        )}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 0' }}>
            <div className="spinner" />
            <p style={{ color: C.darkSoft }}>Chargement…</p>
          </div>
        ) : searchActive ? (
          /* ── Résultats recherche ── */
          filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.darkSoft }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
              <p>Aucun résultat.</p>
            </div>
          ) : (
            <div style={{ padding: isMobile ? '0 16px' : 0 }}>
              {Object.entries(filtered.reduce((acc, p) => {
                const k = getCatName(p.categorie_id) || 'Autres';
                if (!acc[k]) acc[k] = [];
                acc[k].push(p);
                return acc;
              }, {})).map(([cat, prods]) => (
                <div key={cat} style={{ marginBottom: 24 }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontWeight: 700, color: C.primary, margin: '0 0 8px', paddingBottom: 6, borderBottom: `2px solid ${C.gold}` }}>
                    {cat} <span style={{ fontSize: 12, fontWeight: 400, color: C.darkSoft }}>({prods.length})</span>
                  </h3>
                  {prods.map(p => <ProduitCard key={p.id} produit={p} onAdd={handleAdd} isMobile={isMobile} />)}
                </div>
              ))}
            </div>
          )
        ) : (
          /* ── Menu carrousel swipe ── */
          <div style={{ padding: isMobile ? '0 16px' : 0 }}>
            <Book3D pages={pages} onAdd={handleAdd} isMobile={isMobile} />
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      {!loading && parametres && (parametres.adresse || parametres.telephone) && (
        <footer style={{ borderTop: `1px solid ${C.border}`, padding: '16px 24px 24px', textAlign: 'center', color: C.darkSoft, fontSize: 13 }}>
          {parametres.adresse && <p style={{ marginBottom: 4, color: C.dark }}>{parametres.adresse}</p>}
          {parametres.horaires && <p style={{ marginBottom: 4 }}>{parametres.horaires}</p>}
          {parametres.telephone && <p>{parametres.telephone}{parametres.whatsapp && <a href={`https://wa.me/${parametres.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ color: C.goldDeep, marginLeft: 10, textDecoration: 'none', fontWeight: 600 }}>WhatsApp</a>}</p>}
          <a href="https://wa.me/243977555768" target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 10, color: 'rgba(26,26,20,0.20)', fontSize: 11, textDecoration: 'none' }}>Développé par Inspire by YuuStore</a>
        </footer>
      )}

      {/* ── PANIER ── */}
      {showPanier && <Panier items={panier} onUpdateQty={handleUpdateQty} onRemove={idx => setPanier(p => p.filter((_, i) => i !== idx))} onClose={() => setShowPanier(false)} onConfirm={handleConfirm} isMobile={isMobile} />}

      {/* ── MODAL APPEL ── */}
      {showAppel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(45,48,0,0.50)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setShowAppel(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 14px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🔔</div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, color: C.primary, margin: 0 }}>Votre numéro de table ?</h2>
            </div>
            <input value={tableAppel} onChange={e => { setTableAppel(e.target.value); setErrAppel(''); }} placeholder="Ex: 5, Bar, Terrasse…" autoFocus onKeyDown={e => e.key === 'Enter' && handleAppelServeur()}
              style={{ width: '100%', padding: '13px 16px', border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 16, fontFamily: 'inherit', outline: 'none', marginBottom: 8 }} />
            {errAppel && <p style={{ color: '#C0392B', fontSize: 12, marginBottom: 8 }}>⚠️ {errAppel}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setShowAppel(false)} style={{ flex: 1, padding: 13, borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.darkSoft, fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={handleAppelServeur} disabled={appelLoading} style={{ flex: 2, padding: 13, borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})`, color: C.beige, fontSize: 15, fontWeight: 700 }}>
                {appelLoading ? '⏳…' : 'Appeler'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: C.primary, color: C.beige, padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 200, border: `1px solid ${C.gold}`, boxShadow: '0 8px 24px rgba(45,48,0,0.25)' }}>{toast}</div>}
    </div>
  );
}

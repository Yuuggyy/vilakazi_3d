import { useState, useRef, useEffect } from 'react';

const C = {
  primary:    '#7A0000',
  primaryMid: '#A30000',
  gold:       '#C41E3A',
  goldDeep:   '#C41E3A', // higher-contrast gold for text on white/cream backgrounds
  goldLight:  '#E63950',
  beige:      '#FFF6F6',
  cream:      '#FFFFFF',
  dark:       '#1A0000',
  darkSoft:   'rgba(26,0,0,0.55)',
  border:     'rgba(196,30,58,0.20)',
};

/* ─── ProduitCard ─────────────────────────────────────────── */
export function ProduitCard({ produit, onAdd, isMobile }) {
  const [qty, setQty] = useState(1);
  const hasImage = produit.image_url && produit.image_url.trim() !== '';

  return (
    <div style={{
      padding: '14px 0',
      borderBottom: `1px solid rgba(200,184,0,0.12)`,
      display: 'flex', gap: hasImage ? 14 : 0, alignItems: 'flex-start',
    }}>
      {hasImage && (
        <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: C.cream, border: `1px solid ${C.border}` }}>
          <img src={produit.image_url} alt={produit.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 16, fontWeight: 700, color: C.dark,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: isMobile ? '55vw' : 380,
          }}>{produit.nom}</span>
          <span style={{ flex: 1, borderBottom: `1.5px dotted rgba(200,184,0,0.30)`, position: 'relative', top: -3, minWidth: 8 }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: C.goldDeep, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {Number(produit.prix).toFixed(2)} $
          </span>
        </div>
        {produit.description && (
          <p style={{ fontSize: 12.5, color: C.darkSoft, fontStyle: 'italic', marginTop: 3, lineHeight: 1.35 }}>
            {produit.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{
              width: 28, height: 28, borderRadius: '50%', border: `1px solid ${C.border}`,
              background: 'transparent', cursor: 'pointer', fontSize: 15, color: C.darkSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>−</button>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.dark, minWidth: 18, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => setQty(q => q + 1)} style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
              cursor: 'pointer', fontSize: 15, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</button>
          </div>
          <button onClick={() => { onAdd({ ...produit, quantite: qty, prix_unit: produit.prix }); setQty(1); }} style={{
            flex: 1, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})`,
            color: C.beige, fontSize: 13, fontWeight: 700,
          }}>Ajouter</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Carrousel catégories — swipe G/D + scroll vertical ─── */
export default function Book3D({ pages, onAdd, isMobile }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const total = pages?.length || 0;

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  // NE PAS utiliser onTouchEnd sur le div — ça bloque le scroll natif iOS
  // On utilise onTouchMove pour détecter direction et agir seulement si horizontal pur
  const onTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    // Si clairement horizontal (dx > 60px ET angle < 30°), on intercepte
    if (Math.abs(dx) > 60 && dy < 30) {
      e.preventDefault(); // bloquer scroll vertical SEULEMENT si swipe horizontal pur
    }
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - (touchStartY.current || 0));
    // Changer catégorie seulement si mouvement clairement horizontal
    if (Math.abs(dx) > 60 && dy < 40) {
      if (dx < 0 && current < total - 1) setCurrent(c => c + 1);
      if (dx > 0 && current > 0) setCurrent(c => c - 1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!pages || total === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: C.darkSoft }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
      <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16 }}>La carte est vide.</p>
    </div>
  );

  const page = pages[current];

  // Ref pour attacher l'événement non-passif (nécessaire pour preventDefault sur iOS)
  const wrapperRef = useRef(null);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [current, total]);

  return (
    <div ref={wrapperRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* ── Onglets catégories scrollables ── */}
      <div style={{
        display: 'flex', gap: 8,
        overflowX: 'auto', padding: '12px 0 14px',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        {pages.map((p, i) => (
          <button key={i} onClick={() => setCurrent(i)} style={{
            padding: '6px 16px', borderRadius: 24, border: 'none',
            cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
            background: i === current
              ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`
              : `rgba(45,48,0,0.08)`,
            color: i === current ? '#fff' : C.dark,
            fontSize: 13, fontWeight: i === current ? 700 : 400,
            transition: 'all 0.2s',
            boxShadow: i === current ? `0 2px 10px rgba(200,184,0,0.30)` : 'none',
          }}>
            {p.categorie.emoji && `${p.categorie.emoji} `}{p.categorie.nom}
          </button>
        ))}
      </div>

      {/* ── Indicateur de position ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
        {pages.map((_, i) => (
          <div key={i} onClick={() => setCurrent(i)} style={{
            width: i === current ? 20 : 6, height: 6, borderRadius: 3,
            background: i === current ? C.gold : `rgba(200,184,0,0.25)`,
            transition: 'all 0.25s', cursor: 'pointer',
          }} />
        ))}
      </div>

      {/* ── Contenu de la catégorie — scroll vertical natif ── */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        boxShadow: `0 4px 20px rgba(45,48,0,0.08)`,
        overflow: 'hidden',
      }}>
        {/* Header catégorie */}
        <div style={{
          padding: isMobile ? '16px 16px 12px' : '18px 24px 14px',
          background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryMid} 100%)`,
          borderBottom: `2px solid ${C.gold}`,
        }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: isMobile ? 22 : 26, fontWeight: 700,
            color: C.beige, margin: 0, letterSpacing: '0.02em',
          }}>
            {page.categorie.emoji && <span style={{ marginRight: 8 }}>{page.categorie.emoji}</span>}
            {page.categorie.nom}
          </h2>
          {page.categorie.description && (
            <p style={{ color: C.gold, fontSize: 12.5, marginTop: 4, fontStyle: 'italic' }}>
              {page.categorie.description}
            </p>
          )}
          {/* Sous-titre navigation */}
          <p style={{ color: 'rgba(245,237,216,0.55)', fontSize: 11, marginTop: 6 }}>
            {current + 1} / {total} — glissez ← → pour changer de catégorie
          </p>
        </div>

        {/* Liste produits — scroll natif */}
        <div style={{ padding: isMobile ? '0 16px' : '0 24px' }}>
          {page.produits.map(p => (
            <ProduitCard key={p.id} produit={p} onAdd={onAdd} isMobile={isMobile} />
          ))}
        </div>
      </div>

    </div>
  );
}

import { useState } from 'react';
import { createCommande } from '../lib/supabase';

// ─── Couleurs Le Centre ───────────────────────────────────────
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
  border:     'rgba(196,30,58,0.22)',
  danger:     '#C0392B',
  dangerDark: '#C0392B', // higher-contrast red for text on light backgrounds
};

const L = {
  panier: 'Ma Commande',
  vide: 'Votre commande est vide',
  table: 'Numéro de table *',
  tablePh: 'Ex: 5, Bar, Terrasse…',
  demandes: 'Demandes particulières',
  demandesPh: 'Allergies, sans sel, cuisson…',
  commander: '✓ Passer la commande',
  total: 'Total',
  confirmation: '✅ Commande envoyée ! Nous préparons votre table.',
  errTable: 'Veuillez indiquer votre numéro de table.',
  errCommande: "Erreur : impossible d'envoyer la commande. Réessayez.",
};

export default function Panier({ items, onUpdateQty, onRemove, onClose, onConfirm, isMobile }) {
  const [table, setTable]       = useState('');
  const [demandes, setDemandes] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const total = items.reduce((s, i) => s + i.prix_unit * i.quantite, 0);

  const handleSubmit = async () => {
    if (!table.trim()) { setError(L.errTable); return; }
    setLoading(true); setError('');
    const { error: err } = await createCommande(table.trim(), items, demandes.trim());
    setLoading(false);
    if (err) { setError(L.errCommande); return; }
    onConfirm(L.confirmation);
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    border: `1.5px solid ${C.border}`, borderRadius: 10,
    fontSize: isMobile ? 16 : 14, fontFamily: 'inherit',
    color: C.dark, background: '#fff', outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(45,48,0,0.50)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center', zIndex: 500,
      animation: 'fadeIn 0.2s ease',
    }} onClick={onClose}>
      <div style={{
        background: C.cream,
        borderRadius: isMobile ? '20px 20px 0 0' : 20,
        width: isMobile ? '100%' : 480,
        maxHeight: isMobile ? '92dvh' : '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(45,48,0,0.20)',
        animation: 'modalIn 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header panier */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px 16px',
          background: C.primary,
          flexShrink: 0,
        }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 22, fontWeight: 700, color: C.beige, margin: 0,
          }}>🛒 {L.panier}</h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.10)', border: 'none', cursor: 'pointer',
            color: C.gold, fontSize: 20, borderRadius: 8, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Contenu scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>

          {/* Articles */}
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.darkSoft }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🍽️</div>
              <p style={{ fontSize: 15 }}>{L.vide}</p>
            </div>
          ) : (
            <div style={{ paddingTop: 16 }}>
              {items.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0', borderBottom: `1px solid rgba(200,184,0,0.15)`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: C.dark, fontSize: 14, margin: 0 }}>{item.nom}</p>
                    <p style={{ color: C.goldDeep, fontSize: 13, fontWeight: 700, margin: '2px 0 0' }}>
                      {(item.prix_unit * item.quantite).toFixed(2)} $
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => onUpdateQty(idx, -1)} style={{
                      width: 28, height: 28, borderRadius: '50%', border: `1px solid ${C.border}`,
                      background: 'transparent', cursor: 'pointer', fontSize: 15, color: C.darkSoft,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>−</button>
                    <span style={{ fontWeight: 700, color: C.dark, minWidth: 18, textAlign: 'center', fontSize: 15 }}>
                      {item.quantite}
                    </span>
                    <button onClick={() => onUpdateQty(idx, 1)} style={{
                      width: 28, height: 28, borderRadius: '50%', border: 'none',
                      background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                      cursor: 'pointer', fontSize: 15, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>+</button>
                    <button onClick={() => onRemove(idx)} style={{
                      width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(192,57,43,0.2)',
                      background: 'rgba(192,57,43,0.07)', cursor: 'pointer', fontSize: 13, color: C.dangerDark,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>🗑</button>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 0 20px', borderTop: `2px solid ${C.gold}`, marginTop: 4,
              }}>
                <span style={{ fontWeight: 700, color: C.dark, fontSize: 16 }}>{L.total}</span>
                <span style={{ fontWeight: 800, color: C.goldDeep, fontSize: 20 }}>{total.toFixed(2)} $</span>
              </div>
            </div>
          )}

          {/* Formulaire commande */}
          {items.length > 0 && (
            <div style={{ paddingBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.goldDeep, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{L.table}</label>
                <input
                  value={table}
                  onChange={e => { setTable(e.target.value); setError(''); }}
                  placeholder={L.tablePh}
                  style={inputStyle}
                  autoFocus={!isMobile}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.goldDeep, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{L.demandes}</label>
                <textarea
                  value={demandes}
                  onChange={e => setDemandes(e.target.value)}
                  placeholder={L.demandesPh}
                  rows={2}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>
              {error && (
                <div style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 8, padding: '10px 14px', color: C.dangerDark, fontSize: 13 }}>
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{
            padding: '16px 24px 24px', flexShrink: 0,
            borderTop: `1px solid ${C.border}`,
            background: C.cream,
          }}>
            <button onClick={handleSubmit} disabled={loading} style={{
              width: '100%', padding: isMobile ? 16 : 14,
              borderRadius: 12, border: 'none', cursor: loading ? 'wait' : 'pointer',
              background: `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})`,
              color: C.beige, fontSize: isMobile ? 16 : 15, fontWeight: 700,
              boxShadow: `0 4px 20px rgba(45,48,0,0.25)`,
              transition: 'opacity 0.2s',
            }}>
              {loading ? '⏳ Envoi en cours…' : L.commander}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

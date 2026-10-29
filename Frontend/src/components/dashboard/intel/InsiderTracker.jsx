import React from 'react';
import { motion } from 'framer-motion';
import SpotlightCard from '../../ui/SpotlightCard';
import { useDashboard } from '../../../context/DashboardContext';
import { Shield, Lock } from 'lucide-react';

const InsiderTracker = () => {
  const { assets = [], incidents = [] } = useDashboard();

  // Derive real broadcaster/vault channels from real assets
  const realAssets = assets.filter(a => a._id);
  const realIncidents = incidents.filter(i => i._id && !i._id.startsWith('demo_'));

  const items = React.useMemo(() => {
    if (realAssets.length === 0 && realIncidents.length === 0) {
      return [];
    }

    return realAssets.map((a, i) => {
      const matchInc = realIncidents.find(inc => inc.asset_id === a._id || (inc.reference_title && inc.reference_title === a.title));
      const hasLeak = Boolean(matchInc && (matchInc.confidence_score >= 75 || matchInc.match_confirmed));
      const shortId = (a._id || '').slice(-4).toUpperCase() || `0${i + 1}A`;

      return {
        broadcaster: a.title || `Vault Master Channel ${i + 1}`,
        watermark: `WM-VLT${shortId}`,
        leaked: hasLeak,
        source: matchInc ? `${matchInc.platform} (${matchInc.account_handle || 'external'})` : '',
        region: 'Encrypted Vault',
        frames: a.frame_count || 0,
      };
    });
  }, [realAssets, realIncidents]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Lock size={12} style={{ color: '#a855f7' }} />
        <p style={{ fontSize: 8.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
          Invisible Watermark Tracking — Insider Leak Detection
        </p>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
          <Shield size={24} style={{ color: '#a855f7', opacity: 0.4, margin: '0 auto 6px' }} />
          <p style={{ fontSize: 9.5, color: '#94a3b8', margin: 0, fontWeight: 600 }}>No broadcaster watermark feeds registered</p>
          <p style={{ fontSize: 8, color: '#475569', margin: '3px 0 0' }}>Ingest official broadcasts to initiate invisible forensic watermarking.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {items.map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}>
              <SpotlightCard spotlightColor={b.leaked ? 'rgba(239,68,68,0.12)' : 'rgba(13,148,136,0.1)'} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0', margin: '0 0 2px' }}>{b.broadcaster}</p>
                    <p style={{ fontSize: 8, color: '#475569', margin: 0 }}>{b.region} · {b.frames} frames</p>
                  </div>
                  <span style={{
                    fontSize: 7, fontWeight: 800, padding: '2px 6px', borderRadius: 4, height: 'fit-content',
                    background: b.leaked ? 'rgba(239,68,68,0.08)' : 'rgba(13,148,136,0.08)',
                    color: b.leaked ? '#ef4444' : '#0d9488', textTransform: 'uppercase',
                  }}>
                    {b.leaked ? 'COMPROMISED' : 'SECURE'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <code style={{ fontSize: 9, color: '#a78bfa', background: 'rgba(167,139,250,0.06)', padding: '2px 6px', borderRadius: 4 }}>{b.watermark}</code>
                  {b.leaked && b.source && <span style={{ fontSize: 8, color: '#ef4444' }}>→ {b.source}</span>}
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InsiderTracker;


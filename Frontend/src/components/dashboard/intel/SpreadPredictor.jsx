import React from 'react';
import { motion } from 'framer-motion';
import SpotlightCard from '../../ui/SpotlightCard';
import { useDashboard } from '../../../context/DashboardContext';
import { Activity } from 'lucide-react';

const RISK_COLOR = { critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#0d9488' };

const SpreadPredictor = () => {
  const { incidents = [] } = useDashboard();

  const realIncidents = incidents.filter(i => i._id && !i._id.startsWith('demo_'));

  const predictions = React.useMemo(() => {
    if (realIncidents.length === 0) return [];

    return realIncidents.slice(0, 6).map(inc => {
      const conf = inc.confidence_score || 50;
      const risk = conf >= 80 ? 'critical' : conf >= 60 ? 'high' : conf >= 40 ? 'medium' : 'low';
      const reach = (inc.view_count && inc.view_count > 0) ? inc.view_count : Math.round(conf * 1450);
      const platforms = inc.leak_chain && inc.leak_chain.length > 0 ? inc.leak_chain : [inc.platform || 'Web'];

      return {
        channel: inc.account_handle || inc.title?.slice(0, 20) || '@pirate_feed',
        platform: inc.platform || 'YouTube',
        members: Math.round(reach * 0.4),
        leaks: inc.match_confirmed ? 1 : 0,
        risk,
        spread: reach,
        platforms,
      };
    });
  }, [realIncidents]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Activity size={12} style={{ color: '#0d9488' }} />
        <p style={{ fontSize: 8.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
          Epidemic Spread Model — Piracy Propagation Prediction
        </p>
      </div>

      {predictions.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{ fontSize: 9.5, color: '#94a3b8', margin: 0, fontWeight: 600 }}>No propagation clusters active</p>
          <p style={{ fontSize: 8, color: '#475569', margin: '3px 0 0' }}>Discovered threat vectors will model velocity and predicted downstream reach.</p>
        </div>
      ) : (
        predictions.map((p, i) => {
          const rc = RISK_COLOR[p.risk] || '#6366f1';
          return (
            <motion.div key={p.channel + i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <SpotlightCard spotlightColor={`${rc}15`} style={{ background: 'rgba(255,255,255,0.015)', padding: '11px 13px', marginBottom: 7, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0' }}>{p.channel}</span>
                      <span style={{ fontSize: 7, padding: '1px 5px', borderRadius: 3, background: `${rc}12`, color: rc, fontWeight: 800, textTransform: 'uppercase' }}>{p.risk}</span>
                    </div>
                    <p style={{ fontSize: 8, color: '#475569', margin: '0 0 5px' }}>
                      {p.platform} · {p.members > 1000 ? `${(p.members / 1000).toFixed(0)}K est. audience` : `${p.members} audience`}
                    </p>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {p.platforms.map(pl => (
                        <span key={pl} style={{ fontSize: 7, padding: '1px 5px', borderRadius: 3, background: 'rgba(99,102,241,0.06)', color: '#818cf8', fontWeight: 600 }}>{pl}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', paddingLeft: 12 }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: rc, margin: 0, lineHeight: 1 }}>
                      {p.spread >= 1000 ? `${(p.spread / 1000).toFixed(0)}K` : p.spread}
                    </p>
                    <p style={{ fontSize: 7, color: '#64748b', margin: '2px 0 0' }}>predicted reach</p>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          );
        })
      )}
    </div>
  );
};

export default SpreadPredictor;


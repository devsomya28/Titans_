import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '../../../context/DashboardContext';
import { Shield } from 'lucide-react';

const PLAT_COLORS = {
  YouTube: '#ef4444',
  TikTok: '#ff0050',
  'Twitter/X': '#1da1f2',
  Twitter: '#1da1f2',
  Telegram: '#2ca5e0',
  Reddit: '#ff4500',
  Instagram: '#e1306c',
  Dailymotion: '#0066DC',
  Facebook: '#1877f2',
  Rumble: '#85c742',
  Vimeo: '#1ab7ea',
  Twitch: '#9146ff',
};

const NetworkGraph = ({ selected, onSelect }) => {
  const { incidents = [], assets = [] } = useDashboard();

  const { dynamicNodes, dynamicEdges } = useMemo(() => {
    const nodes = [];
    const edges = [];

    // Filter out demo
    const realIncidents = incidents.filter(i => i._id && !i._id.startsWith('demo_'));
    const realAssets = assets.filter(a => a._id);

    const activeAsset = realAssets[0] || (realIncidents[0] ? {
      title: realIncidents[0].reference_title || 'Protected Asset',
      official_video_url: realIncidents[0].reference_url || '',
      country: 'US',
    } : null);

    if (!activeAsset && realIncidents.length === 0) {
      return { dynamicNodes: [], dynamicEdges: [] };
    }

    // Node 0: Official Vault Source
    nodes.push({
      id: 'src_vault',
      label: activeAsset ? (activeAsset.title?.slice(0, 22) || 'Official Vault Master') : 'Official Broadcast',
      x: 50,
      y: 10,
      color: '#0d9488',
      size: 28,
      type: 'source',
      url: activeAsset?.official_video_url || '',
      country: activeAsset?.country || 'Vault',
      leaks: realIncidents.length,
    });

    // Positions for candidate nodes in 2 tiers
    const positions = [
      { x: 22, y: 32 }, { x: 78, y: 30 }, { x: 42, y: 45 }, { x: 62, y: 46 },
      { x: 15, y: 64 }, { x: 85, y: 65 }, { x: 30, y: 78 }, { x: 70, y: 80 },
      { x: 50, y: 88 }, { x: 12, y: 48 }, { x: 88, y: 48 }, { x: 50, y: 62 },
    ];

    const displayList = realIncidents.slice(0, positions.length);

    displayList.forEach((inc, idx) => {
      const pos = positions[idx];
      const platColor = PLAT_COLORS[inc.platform] || '#6366f1';
      const nodeId = inc._id || `inc_${idx}`;

      nodes.push({
        id: nodeId,
        label: inc.account_handle ? `${inc.account_handle}` : (inc.title?.slice(0, 16) || `Suspect ${idx + 1}`),
        x: pos.x,
        y: pos.y,
        color: platColor,
        size: Math.max(14, Math.min(24, Math.round((inc.confidence_score || 50) / 4))),
        type: (inc.platform || 'candidate').toLowerCase(),
        platform: inc.platform,
        account_handle: inc.account_handle,
        confidence_score: inc.confidence_score,
        url: inc.url,
        thumbnail_url: inc.thumbnail_url,
        createdAt: inc.createdAt,
      });

      // Edge from source or intermediary
      if (idx < 4) {
        edges.push({ from: 'src_vault', to: nodeId, leak: (inc.confidence_score || 0) >= 75 });
      } else {
        const parentIdx = (idx % 3) + 1;
        if (nodes[parentIdx]) {
          edges.push({ from: nodes[parentIdx].id, to: nodeId, leak: (inc.confidence_score || 0) >= 75 });
        }
      }
    });

    return { dynamicNodes: nodes, dynamicEdges: edges };
  }, [incidents, assets]);

  if (dynamicNodes.length === 0) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)' }}>
        <Shield size={32} style={{ color: '#0d9488', opacity: 0.5, marginBottom: 8 }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: 0 }}>Grounded Provenance Network</p>
        <p style={{ fontSize: 8.5, color: '#475569', margin: '4px 0 0' }}>Vault active & monitoring — crawl results will render live provenance topology.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 340 }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <pattern id="ngrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.5" fill="rgba(255,255,255,0.03)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ngrid)" />
        {dynamicEdges.map((e, i) => {
          const f = dynamicNodes.find(n => n.id === e.from);
          const t = dynamicNodes.find(n => n.id === e.to);
          return f && t && (
            <line key={i} x1={`${f.x}%`} y1={`${f.y}%`} x2={`${t.x}%`} y2={`${t.y}%`}
              stroke={e.leak ? 'rgba(239,68,68,0.45)' : 'rgba(148,163,184,0.12)'}
              strokeWidth={e.leak ? 1.5 : 0.8} strokeDasharray={e.leak ? '5 3' : 'none'} />
          );
        })}
      </svg>
      {dynamicNodes.map(node => (
        <motion.div key={node.id}
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 18 }}
          onClick={() => onSelect && onSelect(node)}
          style={{
            position: 'absolute', left: `${node.x}%`, top: `${node.y}%`,
            transform: 'translate(-50%,-50%)', cursor: 'pointer', zIndex: 2,
          }}>
          <div style={{
            width: node.size + 8, height: node.size + 8, borderRadius: '50%',
            border: `2px solid ${node.color}`, background: `${node.color}0c`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: selected?.id === node.id ? `0 0 18px ${node.color}60` : `0 0 6px ${node.color}15`,
            transition: 'box-shadow 0.2s',
          }}>
            <div style={{ width: node.size * 0.45, height: node.size * 0.45, borderRadius: '50%', background: node.color, boxShadow: `0 0 4px ${node.color}` }} />
          </div>
          <p style={{ position: 'absolute', top: '105%', left: '50%', transform: 'translateX(-50%)', fontSize: 7, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', margin: 0 }}>
            {node.label}
          </p>
          {node.type === 'source' && <div style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: '50%', background: '#0d9488', boxShadow: '0 0 6px #0d9488', animation: 'blink 1.5s infinite' }} />}
        </motion.div>
      ))}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
    </div>
  );
};

export { PLAT_COLORS };
export default NetworkGraph;


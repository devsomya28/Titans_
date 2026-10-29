import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolverService } from '../../services/api';
import {
  Link as LinkIcon, Loader2, CheckCircle2, XCircle, AlertCircle,
  Shield, Eye, ExternalLink, RefreshCw, Info, Sparkles, Clock, User, Film
} from 'lucide-react';

const G = {
  teal:    '#E87F24',
  tealBg:  'rgba(232,127,36,0.09)',
  tealBdr: 'rgba(232,127,36,0.25)',
  gold:    '#FFC81E',
  card:    '#ffffff',
  border:  'rgba(148,163,184,0.2)',
  text:    '#0f172a',
  sub:     '#64748b',
  muted:   '#94a3b8',
};

const DEFAULT_MATRIX = [
  {
    platform: 'X / Twitter',
    status: 'RESOLVES',
    color: '#10b981',
    reason: 'Public video tweets return complete metadata (title, uploader, thumbnail, duration) via yt-dlp. Note: Twitter may rate-limit guest tokens during rapid bursts.',
    sample: 'https://x.com/NBA/status/1785124233159344400',
  },
  {
    platform: 'TikTok',
    status: 'BLOCKED',
    color: '#ef4444',
    reason: 'TikTok actively blocks/drops scraper connections with connection timeouts (anti-bot / cloud IP restriction) when unauthenticated without session cookies.',
    sample: 'https://www.tiktok.com/@nba/video/7363486161108258090',
  },
  {
    platform: 'Facebook',
    status: 'BLOCKED',
    color: '#ef4444',
    reason: 'Facebook returns "Cannot parse data" / "This video is only available for registered users" unless logged in with browser cookies.',
    sample: 'https://www.facebook.com/watch/?v=10155353594956983',
  },
];

export default function LinkResolverPanel() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX);

  useEffect(() => {
    let mounted = true;
    resolverService.getMatrix()
      .then(res => {
        if (mounted && res?.data?.matrix) {
          setMatrix(res.data.matrix);
        }
      })
      .catch(() => {
        // Fallback to verified local matrix
      });
    return () => { mounted = false; };
  }, []);

  const handleResolve = async (targetUrl = url) => {
    const finalUrl = (targetUrl || url).trim();
    if (!finalUrl) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await resolverService.resolve(finalUrl);
      if (resp?.data) {
        setResult(resp.data);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.detail || err.message || 'Resolution failed');
    } finally {
      setLoading(false);
    }
  };

  const resolved = result?.resolved;
  const scan = result?.scan;
  const classification = result?.classification;

  return (
    <div style={{
      background: G.card, borderRadius: 20, padding: 20,
      border: `1px solid ${G.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      marginTop: 8,
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
          }}>
            <LinkIcon size={18} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: G.text }}>
                Paste a Suspect Link
              </h3>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: 'rgba(99,102,241,0.1)', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                Link Resolve
              </span>
            </div>
            <p style={{ fontSize: 11, color: G.sub, margin: '2px 0 0' }}>
              Direct public URL metadata extraction & Sentinel visual scan (no keyword search, no login bypass)
            </p>
          </div>
        </div>

        {/* ── Status Matrix ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: G.muted, marginRight: 2 }}>STATUS MATRIX:</span>
          {matrix.map((item) => (
            <div
              key={item.platform}
              onMouseEnter={() => setActiveTooltip(item.platform)}
              onMouseLeave={() => setActiveTooltip(null)}
              style={{
                position: 'relative', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px',
                borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: item.status === 'RESOLVES' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${item.status === 'RESOLVES' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: item.status === 'RESOLVES' ? '#059669' : '#dc2626',
              }}
            >
              <span>{item.platform}:</span>
              <span>{item.status}</span>
              <Info size={11} style={{ opacity: 0.7 }} />

              {/* Tooltip on hover */}
              {activeTooltip === item.platform && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 50,
                  width: 260, padding: 10, borderRadius: 10, background: '#1e293b',
                  color: '#f8fafc', fontSize: 11, lineHeight: 1.4, fontWeight: 400,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)', pointerEvents: 'none',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: item.status === 'RESOLVES' ? '#34d399' : '#f87171' }}>
                    {item.platform} — {item.status}
                  </div>
                  <div>{item.reason}</div>
                  <div style={{ marginTop: 6, fontSize: 10, color: '#94a3b8' }}>
                    Click sample below to test.
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Input bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <LinkIcon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: G.muted }} />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Paste TikTok, X/Twitter, or Facebook link (e.g. https://x.com/NBA/status/...)"
            disabled={loading}
            style={{
              width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
              borderRadius: 12, border: `1px solid ${G.border}`, background: '#f8fafc',
              fontSize: 13, color: G.text, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => handleResolve()}
          disabled={loading || !url.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
            borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
            background: loading ? G.border : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', opacity: (!url.trim() && !loading) ? 0.6 : 1,
            boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
          }}
        >
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
          {loading ? 'Resolving…' : 'Resolve & Scan'}
        </motion.button>
      </div>

      {/* ── Quick sample test chips ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: G.muted, fontWeight: 600 }}>Quick Test:</span>
        <button
          type="button"
          onClick={() => { const u = 'https://x.com/NBA/status/1652152377984839685'; setUrl(u); handleResolve(u); }}
          style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 6, background: '#f1f5f9', border: `1px solid ${G.border}`,
            color: '#0f172a', cursor: 'pointer', fontWeight: 600,
          }}
        >
          X (NBA Video — LJ & Kai)
        </button>
        <button
          type="button"
          onClick={() => { const u = 'https://x.com/espn/status/1785509930777121271'; setUrl(u); handleResolve(u); }}
          style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 6, background: '#f1f5f9', border: `1px solid ${G.border}`,
            color: '#0f172a', cursor: 'pointer', fontWeight: 600,
          }}
        >
          X (Maxey 46 PTS)
        </button>
        <button
          type="button"
          onClick={() => { const u = 'https://www.tiktok.com/@nba/video/7363486161108258090'; setUrl(u); handleResolve(u); }}
          style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 6, background: '#f1f5f9', border: `1px solid ${G.border}`,
            color: '#0f172a', cursor: 'pointer', fontWeight: 600,
          }}
        >
          TikTok (NBA Game 5)
        </button>
        <button
          type="button"
          onClick={() => { const u = 'https://www.facebook.com/watch/?v=10155353594956983'; setUrl(u); handleResolve(u); }}
          style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 6, background: '#f1f5f9', border: `1px solid ${G.border}`,
            color: '#0f172a', cursor: 'pointer', fontWeight: 600,
          }}
        >
          Facebook (Watch)
        </button>
      </div>

      {/* ── Error Notification ── */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Live Result Display ── */}
      <AnimatePresence>
        {resolved && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              padding: 14, borderRadius: 14, background: '#f8fafc',
              border: `1px solid ${resolved.status === 'RESOLVES' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            {/* Top row: Platform & Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: resolved.status === 'RESOLVES' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: resolved.status === 'RESOLVES' ? '#059669' : '#dc2626',
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  {resolved.status === 'RESOLVES' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {resolved.status}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: G.text }}>
                  {resolved.platform}
                </span>
              </div>

              {classification && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                  background: classification === 'SEVERE PIRACY' ? 'rgba(239,68,68,0.12)' : (classification === 'CLEAN' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'),
                  color: classification === 'SEVERE PIRACY' ? '#dc2626' : (classification === 'CLEAN' ? '#059669' : '#d97706'),
                }}>
                  ⚖️ {classification}
                </span>
              )}
            </div>

            {/* Content preview if resolved */}
            {resolved.status === 'RESOLVES' ? (
              <div style={{ display: 'flex', gap: 14 }}>
                {resolved.thumbnail_url && (
                  <img
                    src={resolved.thumbnail_url}
                    alt="Thumbnail"
                    style={{
                      width: 140, height: 80, objectFit: 'cover', borderRadius: 8,
                      border: `1px solid ${G.border}`, background: '#000',
                    }}
                  />
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: G.text }}>
                    {resolved.title || 'Untitled'}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: G.sub, marginTop: 2 }}>
                    {resolved.uploader && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={12} /> {resolved.uploader}
                      </span>
                    )}
                    {resolved.duration && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {Number(resolved.duration).toFixed(1)}s
                      </span>
                    )}
                    {resolved.view_count != null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Eye size={12} /> {Number(resolved.view_count).toLocaleString()} views
                      </span>
                    )}
                  </div>

                  {/* Sentinel Scan Pipeline Results */}
                  {scan && (
                    <div style={{
                      marginTop: 8, padding: '8px 10px', borderRadius: 8,
                      background: '#ffffff', border: `1px solid ${G.border}`,
                      display: 'flex', alignItems: 'center', gap: 14, fontSize: 11,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Shield size={13} style={{ color: G.teal }} />
                        <span style={{ color: G.sub }}>Sentinel Match:</span>
                        <strong style={{ color: G.text }}>{scan.confidence_score?.toFixed(1) || 0}%</strong>
                      </div>
                      <div style={{ color: G.sub }}>
                        CLIP Sim: <strong style={{ color: G.text }}>{scan.clip_similarity != null ? scan.clip_similarity : 'N/A'}</strong>
                      </div>
                      <div style={{ color: G.sub }}>
                        pHash: <strong style={{ color: scan.phash_match ? '#059669' : G.text }}>{scan.phash_match ? 'MATCH' : 'No match'}</strong>
                      </div>
                      <div style={{ color: G.sub }}>
                        Severity: <strong style={{ color: scan.severity === 'CRITICAL' ? '#dc2626' : (scan.severity === 'WARNING' ? '#d97706' : '#2563eb') }}>{scan.severity || 'INFO'}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Blocked / Partial message */
              <div style={{
                padding: '10px 12px', borderRadius: 8, background: '#fff',
                border: `1px solid ${G.border}`, fontSize: 11, color: G.sub, lineHeight: 1.5,
              }}>
                <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>
                  Platform Blocking Policy Active
                </div>
                <code style={{
                  display: 'block', padding: '6px 8px', borderRadius: 6,
                  background: '#f1f5f9', color: '#334155', fontFamily: 'monospace', fontSize: 10,
                  wordBreak: 'break-all', marginBottom: 6,
                }}>
                  {resolved.error || 'Request blocked by platform endpoint'}
                </code>
                <span>
                  Per rules, login credentials or anti-bot evasion techniques are not used on public video streams.
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

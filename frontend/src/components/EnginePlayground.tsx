import React, { useState } from 'react';
import type { ComplaintCategory } from '../api/client';
import { calculateTextSimilarity } from '../api/client';

const COMPARISON_PRESETS = [
  {
    label: 'Same Meaning, Different Wording',
    t1: 'Large pothole near ABC College',
    t2: 'Dangerous road hole outside ABC College',
    dist: 24,
    c1: 'pothole' as ComplaintCategory,
    c2: 'pothole' as ComplaintCategory,
  },
  {
    label: 'Different Issues, Same Location',
    t1: 'Large pothole near ABC College',
    t2: 'Overflowing plastic garbage dump near ABC College',
    dist: 15,
    c1: 'pothole' as ComplaintCategory,
    c2: 'garbage' as ComplaintCategory,
  },
  {
    label: 'Similar Description, Far Distance',
    t1: 'Broken streetlight causing dark street',
    t2: 'Streetlight not working on main avenue',
    dist: 450,
    c1: 'streetlight' as ComplaintCategory,
    c2: 'streetlight' as ComplaintCategory,
  },
];

export const EnginePlayground: React.FC = () => {
  const [text1, setText1] = useState('Large pothole near ABC College');
  const [text2, setText2] = useState('Dangerous road hole outside ABC College');
  const [category1, setCategory1] = useState<ComplaintCategory>('pothole');
  const [category2, setCategory2] = useState<ComplaintCategory>('pothole');
  const [distanceMeters, setDistanceMeters] = useState(25);

  const [textSimScore, setTextSimScore] = useState<number | null>(80.1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute location similarity using decay formula
  const computeLocationSimilarity = (dist: number, maxRadius: number = 100): number => {
    if (dist <= 0) return 100.0;
    if (dist >= maxRadius) return 0.0;
    const fraction = 1.0 - dist / maxRadius;
    const sim = 100.0 * Math.pow(fraction, 0.8);
    return Math.round(Math.max(0, Math.min(100, sim)) * 10) / 10;
  };

  const locSim = computeLocationSimilarity(distanceMeters);
  const catSim = category1 === category2 ? 100.0 : 0.0;
  const currentTextSim = textSimScore !== null ? textSimScore : 0.0;

  const compositeScore = Math.round(
    ((locSim * 0.50) + (currentTextSim * 0.35) + (catSim * 0.15)) * 10
  ) / 10;

  const getStatus = (score: number) => {
    if (score >= 80.0) return 'likely_duplicate';
    if (score >= 50.0) return 'possible_duplicate';
    return 'new';
  };

  const handleEvaluate = async () => {
    setErrorMsg(null);
    try {
      setIsCalculating(true);
      const res = await calculateTextSimilarity(text1, text2);
      setTextSimScore(res.text_similarity);
    } catch (err: any) {
      setErrorMsg(err.message || 'Evaluation failed.');
    } finally {
      setIsCalculating(false);
    }
  };

  const applyPreset = (preset: typeof COMPARISON_PRESETS[0]) => {
    setText1(preset.t1);
    setText2(preset.t2);
    setCategory1(preset.c1);
    setCategory2(preset.c2);
    setDistanceMeters(preset.dist);
  };

  return (
    <section id="engine" className="editorial-section">
      <div className="page-container">
        <div className="section-header">
          <span className="section-eyebrow">02 / DUPLICATE DETECTION ENGINE</span>
          <h2 className="section-title">Multi-Signal Evaluation Playground</h2>
          <p className="section-subtitle">
            Inspect how geospatial proximity, sentence transformer semantic embeddings, and category matching merge into a single verified duplicate confidence score.
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <span className="mono-label" style={{ fontSize: '0.6875rem' }}>EVALUATION PRESETS:</span>
          <div className="presets-group">
            {COMPARISON_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-chip"
                onClick={() => {
                  applyPreset(p);
                  // Automatically trigger calculation
                  setTimeout(handleEvaluate, 50);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="split-layout">
          {/* Comparison inputs */}
          <div className="solid-card">
            <div className="mono-label" style={{ marginBottom: '1.25rem' }}>
              INCIDENT PAIR COMPARISON
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="text-1">Incident A: Baseline Description</label>
              <textarea
                id="text-1"
                className="form-textarea"
                value={text1}
                onChange={(e) => setText1(e.target.value)}
                placeholder="e.g. Large pothole near ABC College"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="text-2">Incident B: Incoming Report</label>
              <textarea
                id="text-2"
                className="form-textarea"
                value={text2}
                onChange={(e) => setText2(e.target.value)}
                placeholder="e.g. Dangerous road hole outside ABC College"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="cat-1">Category A</label>
                <select
                  id="cat-1"
                  className="form-select"
                  value={category1}
                  onChange={(e) => setCategory1(e.target.value as ComplaintCategory)}
                >
                  <option value="pothole">Pothole</option>
                  <option value="streetlight">Streetlight</option>
                  <option value="water_leakage">Water Leakage</option>
                  <option value="garbage">Garbage</option>
                  <option value="drainage">Drainage</option>
                  <option value="fallen_tree">Fallen Tree</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cat-2">Category B</label>
                <select
                  id="cat-2"
                  className="form-select"
                  value={category2}
                  onChange={(e) => setCategory2(e.target.value as ComplaintCategory)}
                >
                  <option value="pothole">Pothole</option>
                  <option value="streetlight">Streetlight</option>
                  <option value="water_leakage">Water Leakage</option>
                  <option value="garbage">Garbage</option>
                  <option value="drainage">Drainage</option>
                  <option value="fallen_tree">Fallen Tree</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="distance-input">Geographic Distance Between Reports</label>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600 }}>
                  {distanceMeters} METERS
                </span>
              </div>
              <input
                id="distance-input"
                type="range"
                min="0"
                max="200"
                value={distanceMeters}
                onChange={(e) => setDistanceMeters(parseInt(e.target.value, 10))}
                style={{ width: '100%', accentColor: 'var(--text-primary)', cursor: 'pointer' }}
              />
            </div>

            {errorMsg && (
              <div style={{ padding: '0.75rem', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleEvaluate}
              disabled={isCalculating}
            >
              {isCalculating ? 'RUNNING TRANSFORMERS INFERENCE...' : 'RE-CALCULATE SIMILARITY SIGNALS'}
            </button>
          </div>

          {/* Mathematical Signal Breakdown Card */}
          <div className="solid-card-dark">
            <div className="mono-label" style={{ marginBottom: '1rem' }}>
              SIGNAL COMPUTATION BREAKDOWN
            </div>

            <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid var(--border-dark)', paddingBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                COMPOSITE DUPLICATE CONFIDENCE
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '3rem', fontFamily: 'var(--font-serif)', fontWeight: 600, color: '#FFFFFF' }}>
                  {compositeScore}%
                </span>
                <span className={`badge badge-${getStatus(compositeScore).replace('_', '-')}`}>
                  {getStatus(compositeScore).replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Individual signals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#D1D5DB' }}>1. GEOSPATIAL PROXIMITY (50% WEIGHT)</span>
                  <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{locSim}%</span>
                </div>
                <div className="signal-bar-track" style={{ background: '#26272C' }}>
                  <div style={{ width: `${locSim}%`, height: '100%', background: '#F5F3EF' }} />
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                  Distance: {distanceMeters}m / Search Radius: 100m (decay exponent 0.8)
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#D1D5DB' }}>2. SENTENCE TRANSFORMERS (35% WEIGHT)</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-rust)' }}>{currentTextSim}%</span>
                </div>
                <div className="signal-bar-track" style={{ background: '#26272C' }}>
                  <div style={{ width: `${currentTextSim}%`, height: '100%', background: 'var(--accent-rust)' }} />
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                  Cosine similarity over 384-dimensional dense vectors (all-MiniLM-L6-v2)
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#D1D5DB' }}>3. CATEGORY MATCH (15% WEIGHT)</span>
                  <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{catSim}%</span>
                </div>
                <div className="signal-bar-track" style={{ background: '#26272C' }}>
                  <div style={{ width: `${catSim}%`, height: '100%', background: '#F5F3EF' }} />
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                  {category1 === category2 ? 'Exact category match (+15.0 pts)' : 'Category mismatch (0.0 pts)'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-dark)', fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'var(--font-mono)' }}>
              FORMULA: ({locSim} × 0.50) + ({currentTextSim} × 0.35) + ({catSim} × 0.15) = {compositeScore}%
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

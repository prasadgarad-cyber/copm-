import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer id="specs" className="editorial-section" style={{ background: '#121316', color: '#F6F4F0', borderTop: 'none' }}>
      <div className="page-container">
        <div className="section-header" style={{ marginBottom: '2rem' }}>
          <span className="section-eyebrow" style={{ color: '#E5E7EB' }}>05 / SYSTEM ARCHITECTURE</span>
          <h2 className="section-title" style={{ color: '#FFFFFF' }}>Deduplication Pipeline Specifications</h2>
          <p className="section-subtitle" style={{ color: '#9CA3AF' }}>
            CivicSync operates a multi-modal triage pipeline evaluating spatial coordinates, semantic language models, and taxonomic categorization.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ borderTop: '1px solid #26272C', paddingTop: '1rem' }}>
            <div className="mono-label" style={{ color: '#A0A3AD', marginBottom: '0.5rem' }}>
              01 · SEMANTIC EMBEDDINGS
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.35rem' }}>
              Sentence Transformers
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', lineHeight: 1.6 }}>
              Dense 384-dimensional embedding generation powered by all-MiniLM-L6-v2. Employs cosine angle normalization mapped to 0 to 100 confidence.
            </p>
          </div>

          <div style={{ borderTop: '1px solid #26272C', paddingTop: '1rem' }}>
            <div className="mono-label" style={{ color: '#A0A3AD', marginBottom: '0.5rem' }}>
              02 · GEODESIC PROXIMITY
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.35rem' }}>
              Haversine Formula
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', lineHeight: 1.6 }}>
              Great-circle surface calculation over spherical Earth model (R=6371km) with smooth non-linear decay over 100m municipal radius.
            </p>
          </div>

          <div style={{ borderTop: '1px solid #26272C', paddingTop: '1rem' }}>
            <div className="mono-label" style={{ color: '#A0A3AD', marginBottom: '0.5rem' }}>
              03 · COMPOSITE TRIAGE
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.35rem' }}>
              Weighted Signal Fusion
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', lineHeight: 1.6 }}>
              50% geospatial proximity + 35% semantic text similarity + 15% category congruence. Scores 80+ auto-link duplicate records.
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #26272C', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#9CA3AF' }}>
            CIVICSYNC MUNICIPAL ENGINE · FASTAPI + PYTORCH + REACT
          </div>
          <div>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ background: '#26272C', color: '#FFFFFF', borderColor: '#3E414B' }}
            >
              OPEN OPENAPI / SWAGGER DOCUMENTATION
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

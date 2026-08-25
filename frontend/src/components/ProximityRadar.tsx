import React, { useState } from 'react';
import type { NearbyComplaintItem } from '../api/client';
import { fetchNearbyComplaints } from '../api/client';

export const ProximityRadar: React.FC = () => {
  const [lat, setLat] = useState(18.5204);
  const [lon, setLon] = useState(73.8567);
  const [radius, setRadius] = useState(100);
  const [results, setResults] = useState<NearbyComplaintItem[]>([]);
  const [hasQueried, setHasQueried] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetchNearbyComplaints(lat, lon, radius);
      setResults(res.complaints);
      setHasQueried(true);
    } catch {
      setResults([]);
      setHasQueried(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="radar" className="editorial-section">
      <div className="page-container">
        <div className="section-header">
          <span className="section-eyebrow">04 / PROXIMITY RADAR</span>
          <h2 className="section-title">Geospatial Radius Scanner</h2>
          <p className="section-subtitle">
            Query all active infrastructure incidents within any GPS radius using the Haversine great-circle calculation and smooth distance decay curve.
          </p>
        </div>

        <div className="split-layout">
          {/* Radar Controls */}
          <div className="solid-card">
            <div className="mono-label" style={{ marginBottom: '1.25rem' }}>
              RADAR COORDINATE CENTER
            </div>

            <form onSubmit={handleSearch}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="radar-lat">Center Latitude</label>
                  <input
                    id="radar-lat"
                    type="number"
                    step="any"
                    className="form-input"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="radar-lon">Center Longitude</label>
                  <input
                    id="radar-lon"
                    type="number"
                    step="any"
                    className="form-input"
                    value={lon}
                    onChange={(e) => setLon(parseFloat(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" htmlFor="radar-radius">Search Radius</label>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    {radius} METERS
                  </span>
                </div>
                <input
                  id="radar-radius"
                  type="range"
                  min="10"
                  max="500"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--text-primary)', cursor: 'pointer' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'SCANNING COORDINATES...' : 'RUN GEOSPATIAL SCAN'}
              </button>
            </form>
          </div>

          {/* Results list */}
          <div className="solid-card">
            <div className="mono-label" style={{ marginBottom: '1.25rem' }}>
              INCIDENTS DETECTED WITHIN {radius}M ({results.length})
            </div>

            {!hasQueried ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Execute a scan to retrieve all localized complaints ranked by proximity.
              </p>
            ) : results.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  No civic complaints found within {radius} meters of specified coordinates.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {results.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border)',
                      padding: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8125rem' }}>
                        #{item.id} · {item.category.toUpperCase()}
                      </span>
                      <span className={`badge badge-${item.status}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ margin: '0.5rem 0', fontWeight: 500, fontSize: '0.9375rem' }}>
                      {item.description}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>DISTANCE: {item.distance_meters}m</span>
                      <span>LOCATION SIMILARITY: {item.location_similarity}%</span>
                    </div>

                    <div className="signal-bar-track">
                      <div className="signal-bar-fill" style={{ width: `${item.location_similarity}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

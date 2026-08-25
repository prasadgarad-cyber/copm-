import React, { useState, useEffect } from 'react';
import type {
  ComplaintCategory,
  ComplaintSubmissionResponse,
  DuplicateCheckResponse,
} from '../api/client';
import {
  preCheckDuplicate,
  submitComplaint,
} from '../api/client';


const CATEGORIES: { label: string; value: ComplaintCategory }[] = [
  { label: 'Pothole', value: 'pothole' },
  { label: 'Road Damage', value: 'road_damage' },
  { label: 'Streetlight', value: 'streetlight' },
  { label: 'Garbage Dump', value: 'garbage' },
  { label: 'Water Leakage', value: 'water_leakage' },
  { label: 'Drainage Issue', value: 'drainage' },
  { label: 'Traffic Signal', value: 'traffic_signal' },
  { label: 'Fallen Tree', value: 'fallen_tree' },
  { label: 'Other', value: 'other' },
];

const PRESETS = [
  { label: 'ABC College Pune', lat: 18.5204, lon: 73.8567, desc: 'Large pothole near ABC College main gate', cat: 'pothole' as ComplaintCategory },
  { label: 'ABC College Adjacent (Duplicate Demo)', lat: 18.5206, lon: 73.8568, desc: 'Dangerous road hole outside ABC College', cat: 'pothole' as ComplaintCategory },
  { label: 'Central Plaza', lat: 37.7750, lon: -122.4180, desc: 'Broken streetlight near central plaza', cat: 'streetlight' as ComplaintCategory },
  { label: 'Market Pipeline', lat: 18.5250, lon: 73.8580, desc: 'Major municipal water pipe leaking onto roadway', cat: 'water_leakage' as ComplaintCategory },
];

interface ReportSectionProps {
  onSubmissionSuccess: () => void;
}

export const ReportSection: React.FC<ReportSectionProps> = ({ onSubmissionSuccess }) => {
  const [description, setDescription] = useState('Dangerous road hole outside ABC College');
  const [category, setCategory] = useState<ComplaintCategory>('pothole');
  const [latitude, setLatitude] = useState(18.5206);
  const [longitude, setLongitude] = useState(73.8568);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [preCheck, setPreCheck] = useState<DuplicateCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<ComplaintSubmissionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live duplicate pre-check debounced
  useEffect(() => {
    if (!description.trim() || latitude === undefined || longitude === undefined) {
      setPreCheck(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsChecking(true);
        const res = await preCheckDuplicate({
          description: description.trim(),
          category,
          latitude: Number(latitude),
          longitude: Number(longitude),
        });
        setPreCheck(res);
      } catch {
        // Silently ignore pre-check network errors during typing
      } finally {
        setIsChecking(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [description, category, latitude, longitude]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmissionResult(null);

    if (!description.trim()) {
      setErrorMessage('Please provide a complaint description.');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await submitComplaint(formData);
      setSubmissionResult(res);
      onSubmissionSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setDescription(preset.desc);
    setCategory(preset.cat);
    setLatitude(preset.lat);
    setLongitude(preset.lon);
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(6)));
          setLongitude(Number(pos.coords.longitude.toFixed(6)));
        },
        () => {
          setErrorMessage('Could not retrieve current location.');
        }
      );
    }
  };

  return (
    <section id="report" className="editorial-section">
      <div className="page-container">
        <div className="section-header">
          <span className="section-eyebrow">01 / CITIZEN REPORTING</span>
          <h2 className="section-title">Submit Civic Complaint</h2>
          <p className="section-subtitle">
            Report infrastructure defects with real-time pre-submission duplicate detection. All reports are stored and triaged against existing municipal records.
          </p>
        </div>

        <div className="split-layout">
          {/* Submission Form */}
          <div className="solid-card">
            <div className="mono-label" style={{ marginBottom: '1.25rem' }}>
              INCIDENT DETAILS
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <span className="mono-label" style={{ fontSize: '0.6875rem' }}>SAMPLE PRESETS:</span>
              <div className="presets-group">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="preset-chip"
                    onClick={() => applyPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="description">Issue Description</label>
                <textarea
                  id="description"
                  className="form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue (e.g. Large pothole near ABC College main gate)..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="category">Category</label>
                <select
                  id="category"
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="latitude">Latitude</label>
                  <input
                    id="latitude"
                    type="number"
                    step="any"
                    className="form-input"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="longitude">Longitude</label>
                  <input
                    id="longitude"
                    type="number"
                    step="any"
                    className="form-input"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleGetCurrentLocation}
                >
                  USE CURRENT DEVICE GPS
                </button>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="image-file">Optional Photographic Evidence</label>
                <input
                  id="image-file"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="form-input"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </div>

              {errorMessage && (
                <div style={{ padding: '0.75rem', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'PROCESSING & SAVING...' : 'REGISTER COMPLAINT'}
              </button>
            </form>
          </div>

          {/* Live Pre-Submission Analysis & Outcome */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Live Duplicate Radar Panel */}
            <div className="solid-card-subtle">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="mono-label">PRE-SUBMISSION DUPLICATE ANALYSIS</div>
                {isChecking && (
                  <span className="mono-label" style={{ color: 'var(--accent-rust)' }}>
                    COMPUTING...
                  </span>
                )}
              </div>

              {preCheck ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span className={`badge badge-${preCheck.status.replace('_', '-')}`}>
                      STATUS: {preCheck.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 600 }}>
                      COMPOSITE SCORE: {preCheck.duplicate_score}%
                    </span>
                  </div>

                  {preCheck.signals && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1rem 0' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                          <span>GEOSPATIAL PROXIMITY (50%)</span>
                          <span>{preCheck.signals.location_similarity}%</span>
                        </div>
                        <div className="signal-bar-track">
                          <div className="signal-bar-fill" style={{ width: `${preCheck.signals.location_similarity}%` }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                          <span>SEMANTIC TEXT SIMILARITY (35%)</span>
                          <span>{preCheck.signals.text_similarity}%</span>
                        </div>
                        <div className="signal-bar-track">
                          <div className="signal-bar-fill-accent" style={{ width: `${preCheck.signals.text_similarity}%` }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                          <span>CATEGORY MATCH (15%)</span>
                          <span>{preCheck.signals.category_similarity}%</span>
                        </div>
                        <div className="signal-bar-track">
                          <div className="signal-bar-fill" style={{ width: `${preCheck.signals.category_similarity}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {preCheck.matched_complaint ? (
                    <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', padding: '1rem', marginTop: '1rem' }}>
                      <div className="mono-label" style={{ fontSize: '0.6875rem', marginBottom: '0.35rem' }}>
                        CLOSEST MATCHING RECORD (#{preCheck.matched_complaint.id})
                      </div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                        "{preCheck.matched_complaint.description}"
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        <span>CATEGORY: {preCheck.matched_complaint.category}</span>
                        {preCheck.distance_meters !== null && (
                          <span>DISTANCE: {preCheck.distance_meters}m</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      No existing complaints located within search radius (100m). This issue appears to be unique.
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Enter complaint details to trigger live geospatial and semantic analysis.
                </p>
              )}
            </div>

            {/* Submission Receipt */}
            {submissionResult && (
              <div className="solid-card" style={{ borderLeft: '4px solid var(--accent-rust)' }}>
                <div className="mono-label" style={{ color: 'var(--accent-rust)', marginBottom: '0.5rem' }}>
                  RECEIPT / COMPLAINT FILED
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  Report Recorded as Ticket #{submissionResult.complaint.id}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {submissionResult.duplicate_detection.status === 'likely_duplicate'
                    ? `Linked as additional evidence to parent ticket #${submissionResult.duplicate_detection.matched_complaint_id} (${submissionResult.duplicate_detection.distance_meters}m away).`
                    : submissionResult.duplicate_detection.status === 'possible_duplicate'
                    ? `Registered with pending review. A related report was identified nearby.`
                    : `Registered as a new independent incident.`}
                </p>
                <div style={{ display: 'flex', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  <span>STATUS: {submissionResult.complaint.status.toUpperCase()}</span>
                  <span>SCORE: {submissionResult.duplicate_detection.duplicate_score}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

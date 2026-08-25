import React, { useState, useEffect } from 'react';
import type {
  Complaint,
  ComplaintCategory,
  ComplaintSubmissionResponse,
} from '../api/client';
import {
  fetchComplaints,
  submitComplaint,
  getImageUrl,
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
  { label: 'ABC College Area', lat: 18.5204, lon: 73.8567, desc: 'Large pothole near ABC College main gate', cat: 'pothole' as ComplaintCategory, locationName: 'ABC College Main Gate' },
  { label: 'ABC College (Duplicate Report)', lat: 18.5206, lon: 73.8568, desc: 'Dangerous road hole outside ABC College', cat: 'pothole' as ComplaintCategory, locationName: 'ABC College Roadside' },
  { label: 'Central Plaza', lat: 37.7750, lon: -122.4180, desc: 'Broken streetlight near central plaza', cat: 'streetlight' as ComplaintCategory, locationName: 'Central Civic Plaza' },
  { label: 'Market Pipeline', lat: 18.5250, lon: 73.8580, desc: 'Major municipal water pipe leaking onto roadway', cat: 'water_leakage' as ComplaintCategory, locationName: 'North Market Avenue' },
];

export const CitizenPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'report' | 'feed'>('report');

  // Form State
  const [description, setDescription] = useState('Dangerous road hole outside ABC College');
  const [category, setCategory] = useState<ComplaintCategory>('pothole');
  const [latitude, setLatitude] = useState(18.5206);
  const [longitude, setLongitude] = useState(73.8568);

  const [isLocating, setIsLocating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<ComplaintSubmissionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Citizen Public Feed (Only distinct master complaints, duplicates merged and hidden)
  const [publicComplaints, setPublicComplaints] = useState<Complaint[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');

  // Automatically acquire device GPS location on mount
  useEffect(() => {
    handleGetCurrentLocation(false);
  }, []);

  const loadPublicFeed = async () => {
    try {
      setFeedLoading(true);
      const params: any = { only_parent: true };
      if (filterCategory) params.category = filterCategory;
      const data = await fetchComplaints(params);
      setPublicComplaints(data);
    } catch {
      // ignore
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'feed') {
      loadPublicFeed();
    }
  }, [activeTab, filterCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmissionResult(null);

    if (!description.trim()) {
      setErrorMessage('Please describe the issue.');
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
      // Refresh public feed behind the scenes
      loadPublicFeed();
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed. Please try again.');
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

  const handleGetCurrentLocation = (showFeedback = true) => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lon = Number(pos.coords.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lon);

          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
          if (showFeedback) {
            setErrorMessage('Could not retrieve device GPS. Using default municipal coordinates.');
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  return (
    <div className="page-container" style={{ padding: '2.5rem 1.5rem' }}>
      {/* Sub-tab navigation for Citizen */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid var(--text-primary)', marginBottom: '2.5rem', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'report' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('report')}
        >
          01 / REPORT NEW CIVIC ISSUE
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'feed' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('feed')}
        >
          02 / ACTIVE CITY ISSUES (PENDING RESOLUTION)
        </button>
      </div>

      {activeTab === 'report' && (
        <div className="split-layout">
          {/* Submission Form */}
          <div className="solid-card">
            <div className="mono-label" style={{ marginBottom: '1.25rem' }}>
              CITIZEN COMPLAINT REGISTRATION
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <span className="mono-label" style={{ fontSize: '0.6875rem' }}>QUICK PRESETS (TESTING):</span>
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
                <label className="form-label" htmlFor="citizen-desc">Problem Description</label>
                <textarea
                  id="citizen-desc"
                  className="form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is the problem? (e.g. Large pothole near ABC College main gate)..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="citizen-cat">Category</label>
                <select
                  id="citizen-cat"
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

              {/* Automatic Location Capture Box */}
              <div className="form-group" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span className="mono-label" style={{ color: 'var(--text-primary)' }}>
                    INCIDENT LOCATION (AUTOMATIC GPS)
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem' }}
                    onClick={() => handleGetCurrentLocation(true)}
                    disabled={isLocating}
                  >
                    {isLocating ? 'LOCATING...' : 'REFRESH GPS'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--accent-rust)' }}>📍</span>
                  <span>{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="citizen-photo">Photo Attachment (Optional)</label>
                <input
                  id="citizen-photo"
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
                style={{ width: '100%', padding: '0.9rem' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'PROCESSING COMPLAINT...' : 'SUBMIT REPORT TO MUNICIPALITY'}
              </button>
            </form>
          </div>

          {/* Outcome & Citizen Receipt Panel */}
          <div>
            {submissionResult ? (
              <div className="solid-card" style={{ borderLeft: '4px solid var(--accent-rust)' }}>
                <div className="mono-label" style={{ color: 'var(--accent-rust)', marginBottom: '0.5rem' }}>
                  SUBMISSION SUCCESSFUL / TICKET #{submissionResult.complaint.id}
                </div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>
                  Your Report Has Been Registered
                </h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  {submissionResult.duplicate_detection.status === 'likely_duplicate'
                    ? `An existing verified issue was identified at this location (#${submissionResult.duplicate_detection.matched_complaint_id}). Your report details have been automatically added as supporting evidence to speed up resolution.`
                    : submissionResult.duplicate_detection.status === 'possible_duplicate'
                    ? `Your complaint has been registered for municipal triage. A related report was detected nearby and will be reviewed by the municipal officer.`
                    : `Your complaint has been submitted as a new municipal ticket. Field workers will be dispatched.`}
                </p>

                {getImageUrl(submissionResult.complaint.image_path) && (
                  <img
                    src={getImageUrl(submissionResult.complaint.image_path)!}
                    alt="Submitted evidence"
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', border: '1px solid var(--border)', marginBottom: '1rem' }}
                  />
                )}

                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '1rem', marginBottom: '1.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                  <div style={{ marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>CATEGORY:</span> {submissionResult.complaint.category.toUpperCase()}
                  </div>
                  <div style={{ marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>STATUS:</span> {submissionResult.complaint.status.toUpperCase()}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>TIME:</span> {new Date(submissionResult.complaint.created_at).toLocaleString()}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSubmissionResult(null);
                    setActiveTab('feed');
                  }}
                >
                  VIEW ACTIVE CITY ISSUES FEED
                </button>
              </div>
            ) : (
              <div className="solid-card-subtle">
                <div className="mono-label" style={{ marginBottom: '1rem' }}>
                  HOW CIVICSYNC PROCESSES YOUR REPORT
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                      1. Automatic Geolocation & NLP
                    </strong>
                    Your incident is mapped via current device GPS coordinates and analyzed by Sentence Transformers language models.
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                      2. Automated Issue Grouping
                    </strong>
                    If multiple citizens report the same issue in the same area, reports are merged into a single master ticket so municipal teams solve the root issue faster.
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                      3. Clean Public Feed
                    </strong>
                    The public issues feed only shows distinct open problems, keeping public tracking clean without duplicate clutter.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'feed' && (
        <div>
          {/* Filter Bar */}
          <div className="solid-card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="mono-label">FILTER BY CATEGORY:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.35rem 0.75rem' }}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">ALL CATEGORIES</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadPublicFeed}
            >
              REFRESH FEED ({publicComplaints.length} ACTIVE ISSUES)
            </button>
          </div>

          {feedLoading ? (
            <div className="solid-card" style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              FETCHING ACTIVE CIVIC ISSUES...
            </div>
          ) : publicComplaints.length === 0 ? (
            <div className="solid-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                No active complaints found. The city is currently in good standing!
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('report')}
              >
                REPORT A NEW ISSUE
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {publicComplaints.map((item) => (
                <div key={item.id} className="solid-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span className="mono-label" style={{ color: 'var(--accent-rust)' }}>
                        ISSUE #{item.id}
                      </span>
                      <span className={`badge badge-${item.status}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    {getImageUrl(item.image_path) && (
                      <img
                        src={getImageUrl(item.image_path)!}
                        alt="Issue evidence"
                        style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', border: '1px solid var(--border)', marginBottom: '0.75rem' }}
                      />
                    )}

                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                      {item.description}
                    </h3>

                    <div style={{ display: 'flex', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.75rem 0' }}>
                      <span>CATEGORY: {item.category.toUpperCase()}</span>
                    </div>
                  </div>

                  <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {(item.duplicate_count || 0) > 0 ? (
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {(item.duplicate_count || 0) + 1} CITIZENS REPORTED THIS
                        </strong>
                      ) : (
                        '1 CITIZEN REPORT'
                      )}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

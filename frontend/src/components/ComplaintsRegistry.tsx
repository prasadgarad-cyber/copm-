import React, { useState, useEffect } from 'react';
import type { Complaint, ComplaintStatus } from '../api/client';
import {
  fetchComplaints,
  fetchComplaintDuplicates,
  updateComplaintStatus,
} from '../api/client';


interface ComplaintsRegistryProps {
  refreshTrigger: number;
}

export const ComplaintsRegistry: React.FC<ComplaintsRegistryProps> = ({ refreshTrigger }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [linkedDuplicates, setLinkedDuplicates] = useState<Complaint[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;
      const data = await fetchComplaints(params);
      setComplaints(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterCategory, filterStatus, refreshTrigger]);

  const handleSelectComplaint = async (c: Complaint) => {
    setSelectedComplaint(c);
    setFeedback(null);
    try {
      const dups = await fetchComplaintDuplicates(c.id);
      setLinkedDuplicates(dups);
    } catch {
      setLinkedDuplicates([]);
    }
  };

  const handleStatusChange = async (newStatus: ComplaintStatus) => {
    if (!selectedComplaint) return;
    try {
      setIsUpdating(true);
      const updated = await updateComplaintStatus(selectedComplaint.id, newStatus);
      setSelectedComplaint(updated);
      setFeedback(`Ticket #${updated.id} status changed to ${newStatus.toUpperCase()}`);
      loadData();
    } catch (err: any) {
      setFeedback(`Failed to update status: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <section id="registry" className="editorial-section">
      <div className="page-container">
        <div className="section-header">
          <span className="section-eyebrow">03 / COMPLAINTS REGISTRY</span>
          <h2 className="section-title">Municipal Records & Triage</h2>
          <p className="section-subtitle">
            Inspect stored citizen submissions, track auto-linked duplicate branches, and update incident lifecycle status.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="solid-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="mono-label">FILTER CATEGORY:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.4rem 0.875rem' }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">ALL CATEGORIES</option>
              <option value="pothole">Pothole</option>
              <option value="road_damage">Road Damage</option>
              <option value="streetlight">Streetlight</option>
              <option value="garbage">Garbage</option>
              <option value="water_leakage">Water Leakage</option>
              <option value="drainage">Drainage</option>
              <option value="traffic_signal">Traffic Signal</option>
              <option value="fallen_tree">Fallen Tree</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="mono-label">FILTER STATUS:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.4rem 0.875rem' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">ALL STATUSES</option>
              <option value="pending">Pending</option>
              <option value="duplicate">Duplicate</option>
              <option value="verified">Verified</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            style={{ marginLeft: 'auto' }}
          >
            REFRESH REGISTRY ({complaints.length})
          </button>
        </div>

        <div className="split-layout" style={{ gridTemplateColumns: selectedComplaint ? '1.4fr 1fr' : '1fr' }}>
          {/* Table */}
          <div className="solid-card" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                LOADING MUNICIPAL RECORDS...
              </div>
            ) : complaints.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No complaints found matching current filter criteria.</p>
                <span className="mono-label">SUBMIT A REPORT ABOVE TO POPULATE RECORDS</span>
              </div>
            ) : (
              <table className="editorial-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>DESCRIPTION</th>
                    <th>CATEGORY</th>
                    <th>GPS LOCATION</th>
                    <th>STATUS</th>
                    <th>PARENT / SCORE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        background: selectedComplaint?.id === item.id ? '#FAF5EE' : undefined,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleSelectComplaint(item)}
                    >
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{item.id}</td>
                      <td style={{ maxWidth: '280px' }}>
                        <div style={{ fontWeight: 500, marginBottom: '0.2rem' }}>{item.description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{item.category}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                      </td>
                      <td>
                        <span className={`badge badge-${item.status}`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {item.parent_id ? (
                          <span style={{ color: 'var(--accent-rust)', fontWeight: 600 }}>
                            PARENT #{item.parent_id} ({item.duplicate_score}%)
                          </span>
                        ) : item.duplicate_score ? (
                          <span>SCORE: {item.duplicate_score}%</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>PRIMARY</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectComplaint(item);
                          }}
                        >
                          INSPECT
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Details & Triage Panel */}
          {selectedComplaint && (
            <div className="solid-card" style={{ borderLeft: '3px solid var(--text-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span className="mono-label">TICKET #{selectedComplaint.id} INSPECTOR</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedComplaint(null)}
                >
                  CLOSE
                </button>
              </div>

              <h3 style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>
                {selectedComplaint.description}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', margin: '1rem 0', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>CATEGORY:</span> {selectedComplaint.category}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>STATUS:</span> {selectedComplaint.status.toUpperCase()}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>COORDINATES:</span> {selectedComplaint.latitude}, {selectedComplaint.longitude}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>PARENT LINK:</span> {selectedComplaint.parent_id ? `#${selectedComplaint.parent_id}` : 'NONE'}
                </div>
              </div>

              {/* Status Updater Actions */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                <span className="mono-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  TRIAGE STATUS UPDATE
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(['pending', 'verified', 'duplicate', 'resolved'] as ComplaintStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`btn btn-sm ${selectedComplaint.status === st ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleStatusChange(st)}
                      disabled={isUpdating || selectedComplaint.status === st}
                    >
                      MARK {st.toUpperCase()}
                    </button>
                  ))}
                </div>
                {feedback && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-rust)' }}>
                    {feedback}
                  </div>
                )}
              </div>

              {/* Linked Duplicates Sub-table */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                <div className="mono-label" style={{ marginBottom: '0.75rem' }}>
                  LINKED DUPLICATE REPORTS ({linkedDuplicates.length})
                </div>

                {linkedDuplicates.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    No other complaints have been linked to this ticket as duplicates.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {linkedDuplicates.map((dup) => (
                      <div
                        key={dup.id}
                        style={{
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border)',
                          padding: '0.75rem',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          <span>#{dup.id} ({dup.category})</span>
                          <span>SCORE: {dup.duplicate_score}%</span>
                        </div>
                        <div style={{ marginTop: '0.25rem' }}>{dup.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

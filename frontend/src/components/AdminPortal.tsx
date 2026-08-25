import React, { useState, useEffect } from 'react';
import type {
  Complaint,
  ComplaintStatus,
} from '../api/client';
import {
  fetchComplaints,
  fetchComplaintDuplicates,
  updateComplaintStatus,
  getImageUrl,
} from '../api/client';
import { ProximityRadar } from './ProximityRadar';

interface AdminPortalProps {
  onReturnToCitizen?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onReturnToCitizen }) => {
  // Admin Data State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedIncident, setSelectedIncident] = useState<Complaint | null>(null);
  const [mergedDuplicates, setMergedDuplicates] = useState<Complaint[]>([]);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [activeAdminTab, setActiveAdminTab] = useState<'matrix' | 'radar'>('matrix');

  const loadAdminComplaints = async () => {
    try {
      setLoading(true);
      const params: any = { only_parent: true };
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
    loadAdminComplaints();
  }, [filterCategory, filterStatus]);

  const handleSelectIncident = async (c: Complaint) => {
    setSelectedIncident(c);
    setActionFeedback(null);
    try {
      const dups = await fetchComplaintDuplicates(c.id);
      setMergedDuplicates(dups);
    } catch {
      setMergedDuplicates([]);
    }
  };

  const handleUpdateStatus = async (newStatus: ComplaintStatus) => {
    if (!selectedIncident) return;
    try {
      setIsUpdating(true);
      const updated = await updateComplaintStatus(selectedIncident.id, newStatus);
      setSelectedIncident(updated);
      setActionFeedback(`Incident #${updated.id} and all merged reports marked as ${newStatus.toUpperCase()}`);
      loadAdminComplaints();
    } catch (err: any) {
      setActionFeedback(`Failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnmergeDuplicate = async (dupId: number) => {
    try {
      setIsUpdating(true);
      await updateComplaintStatus(dupId, 'pending');
      setActionFeedback(`Complaint #${dupId} unmerged from parent and converted to an independent ticket.`);
      if (selectedIncident) {
        const dups = await fetchComplaintDuplicates(selectedIncident.id);
        setMergedDuplicates(dups);
      }
      loadAdminComplaints();
    } catch (err: any) {
      setActionFeedback(`Unmerge failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Metrics
  const masterTickets = complaints.filter((c) => !c.parent_id);
  const totalMerged = complaints.filter((c) => c.parent_id !== null).length;
  const pendingCount = masterTickets.filter((c) => c.status === 'pending').length;
  const resolvedCount = masterTickets.filter((c) => c.status === 'resolved').length;

  return (
    <div className="page-container" style={{ padding: '2.5rem 1.5rem' }}>
      {/* Top Admin Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--text-primary)', paddingBottom: '1rem', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="mono-label" style={{ color: 'var(--accent-rust)' }}>AUTHENTICATED MUNICIPAL AUTHORITY</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600 }}>Spatial Triage & Resolution Dashboard</h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeAdminTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveAdminTab('matrix')}
          >
            INCIDENT CLUSTERS ({masterTickets.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeAdminTab === 'radar' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveAdminTab('radar')}
          >
            SPATIAL RADAR
          </button>
          {onReturnToCitizen && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onReturnToCitizen}
            >
              ← RETURN TO CITIZEN VIEW
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="solid-card" style={{ padding: '1.25rem' }}>
          <div className="mono-label" style={{ color: 'var(--text-muted)' }}>MASTER INCIDENTS</div>
          <div style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', fontWeight: 600, marginTop: '0.25rem' }}>
            {masterTickets.length}
          </div>
        </div>

        <div className="solid-card" style={{ padding: '1.25rem' }}>
          <div className="mono-label" style={{ color: 'var(--text-muted)' }}>MERGED DUPLICATES</div>
          <div style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--accent-rust)', marginTop: '0.25rem' }}>
            {totalMerged}
          </div>
        </div>

        <div className="solid-card" style={{ padding: '1.25rem' }}>
          <div className="mono-label" style={{ color: 'var(--text-muted)' }}>PENDING TRIAGE</div>
          <div style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', fontWeight: 600, color: '#1D4ED8', marginTop: '0.25rem' }}>
            {pendingCount}
          </div>
        </div>

        <div className="solid-card" style={{ padding: '1.25rem' }}>
          <div className="mono-label" style={{ color: 'var(--text-muted)' }}>RESOLVED TICKETS</div>
          <div style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)', fontWeight: 600, color: '#15803D', marginTop: '0.25rem' }}>
            {resolvedCount}
          </div>
        </div>
      </div>

      {activeAdminTab === 'radar' ? (
        <ProximityRadar />
      ) : (
        <div>
          {/* Filters Bar */}
          <div className="solid-card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="mono-label">CATEGORY:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.35rem 0.75rem' }}
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
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="mono-label">STATUS:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.35rem 0.75rem' }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">ALL STATUSES</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="duplicate">Duplicate (Child)</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadAdminComplaints}
              style={{ marginLeft: 'auto' }}
            >
              REFRESH ({complaints.length} RECORDS)
            </button>
          </div>

          <div className="split-layout" style={{ gridTemplateColumns: selectedIncident ? '1.2fr 1.3fr' : '1fr' }}>
            {/* Clustered Incident Matrix */}
            <div className="solid-card" style={{ padding: 0, overflowX: 'auto' }}>
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                  LOADING MUNICIPAL INCIDENTS...
                </div>
              ) : complaints.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>No incidents recorded in database.</p>
                </div>
              ) : (
                <table className="editorial-table">
                  <thead>
                    <tr>
                      <th>TICKET</th>
                      <th>DESCRIPTION</th>
                      <th>CATEGORY</th>
                      <th>STATUS</th>
                      <th>MERGED CLUSTER</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((item) => (
                      <tr
                        key={item.id}
                        style={{
                          background: selectedIncident?.id === item.id ? '#FAF5EE' : undefined,
                          cursor: 'pointer',
                        }}
                        onClick={() => handleSelectIncident(item)}
                      >
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          #{item.id}
                        </td>
                        <td style={{ maxWidth: '240px' }}>
                          <div style={{ fontWeight: 500 }}>{item.description}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          {item.category.toUpperCase()}
                        </td>
                        <td>
                          <span className={`badge badge-${item.status}`}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          {item.parent_id ? (
                            <span style={{ color: 'var(--accent-rust)' }}>
                              MERGED INTO #{item.parent_id}
                            </span>
                          ) : (item.duplicate_count || 0) > 0 ? (
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              +{(item.duplicate_count || 0)} CITIZEN REPORTS
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>STANDALONE</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectIncident(item);
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

            {/* Merged Evidence Inspector Drawer */}
            {selectedIncident && (
              <div className="solid-card" style={{ borderLeft: '4px solid var(--text-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="mono-label" style={{ color: 'var(--accent-rust)' }}>
                    INCIDENT CLUSTER #{selectedIncident.id} INSPECTOR
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedIncident(null)}
                  >
                    CLOSE
                  </button>
                </div>

                <h3 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>
                  {selectedIncident.description}
                </h3>

                {getImageUrl(selectedIncident.image_path) && (
                  <img
                    src={getImageUrl(selectedIncident.image_path)!}
                    alt="Incident evidence"
                    style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', border: '1px solid var(--border)', margin: '0.75rem 0' }}
                  />
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', margin: '1rem 0', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>CATEGORY:</span> {selectedIncident.category.toUpperCase()}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>STATUS:</span> {selectedIncident.status.toUpperCase()}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>GPS:</span> {selectedIncident.latitude.toFixed(6)}, {selectedIncident.longitude.toFixed(6)}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>CREATED:</span> {new Date(selectedIncident.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Status Triage Actions */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <span className="mono-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    SET RESOLUTION STATUS (CASCADES TO MERGED REPORTS)
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(['pending', 'verified', 'duplicate', 'resolved'] as ComplaintStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`btn btn-sm ${selectedIncident.status === st ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleUpdateStatus(st)}
                        disabled={isUpdating || selectedIncident.status === st}
                      >
                        MARK {st.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {actionFeedback && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-rust)' }}>
                      {actionFeedback}
                    </div>
                  )}
                </div>

                {/* Merged Duplicate Citizen Evidence Section */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="mono-label">
                      MERGED CITIZEN REPORTS ({mergedDuplicates.length})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      HIDDEN FROM PUBLIC VIEW
                    </span>
                  </div>

                  {mergedDuplicates.length === 0 ? (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      No duplicate citizen reports have been merged into this primary ticket.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {mergedDuplicates.map((dup) => (
                        <div
                          key={dup.id}
                          style={{
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border)',
                            padding: '0.875rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8125rem' }}>
                              REPORT #{dup.id} · {dup.category.toUpperCase()}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-rust)', fontWeight: 600 }}>
                              MATCH SCORE: {dup.duplicate_score}%
                            </span>
                          </div>

                          <div style={{ margin: '0.5rem 0', fontSize: '0.875rem', fontWeight: 500 }}>
                            "{dup.description}"
                          </div>

                          {getImageUrl(dup.image_path) && (
                            <img
                              src={getImageUrl(dup.image_path)!}
                              alt="Citizen evidence"
                              style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', border: '1px solid var(--border)', margin: '0.5rem 0' }}
                            />
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                            <span>TIMESTAMP: {new Date(dup.created_at).toLocaleTimeString()}</span>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem' }}
                              onClick={() => handleUnmergeDuplicate(dup.id)}
                            >
                              UNMERGE
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

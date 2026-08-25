export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export function getImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  return `${BACKEND_BASE}${imagePath}`;
}


export type ComplaintCategory =
  | 'pothole'
  | 'road_damage'
  | 'streetlight'
  | 'garbage'
  | 'water_leakage'
  | 'drainage'
  | 'traffic_signal'
  | 'fallen_tree'
  | 'other';

export type ComplaintStatus = 'pending' | 'verified' | 'duplicate' | 'resolved';

export type DuplicateStatus = 'new' | 'possible_duplicate' | 'likely_duplicate';

export interface Complaint {
  id: number;
  description: string;
  category: ComplaintCategory;
  latitude: number;
  longitude: number;
  image_path?: string | null;
  status: ComplaintStatus;
  parent_id?: number | null;
  duplicate_score?: number | null;
  duplicate_count?: number;
  created_at: string;
}

export interface DuplicateSignals {
  location_similarity: number;
  text_similarity: number;
  category_similarity: number;
}

export interface MatchedComplaintSummary {
  id: number;
  description: string;
  category: ComplaintCategory;
  latitude: number;
  longitude: number;
}

export interface DuplicateCheckResponse {
  status: DuplicateStatus;
  duplicate_score: number;
  matched_complaint?: MatchedComplaintSummary | null;
  signals?: DuplicateSignals | null;
  distance_meters?: number | null;
}

export interface ComplaintSubmissionResponse {
  complaint: Complaint;
  duplicate_detection: {
    status: DuplicateStatus;
    duplicate_score: number;
    matched_complaint_id?: number | null;
    distance_meters?: number | null;
  };
}

export interface NearbyComplaintItem extends Complaint {
  distance_meters: number;
  location_similarity: number;
}

export interface NearbyComplaintsResponse {
  count: number;
  complaints: NearbyComplaintItem[];
}

export interface TextSimilarityResponse {
  text_similarity: number;
}

// API functions
export async function checkBackendHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function preCheckDuplicate(data: {
  description: string;
  category: string;
  latitude: number;
  longitude: number;
}): Promise<DuplicateCheckResponse> {
  const res = await fetch(`${API_BASE}/complaints/check-duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Duplicate pre-check failed (${res.status})`);
  }
  return res.json();
}

export async function submitComplaint(formData: FormData): Promise<ComplaintSubmissionResponse> {
  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Submission failed (${res.status})`);
  }
  return res.json();
}

export async function calculateTextSimilarity(
  text1: string,
  text2: string
): Promise<TextSimilarityResponse> {
  const res = await fetch(`${API_BASE}/similarity/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text1, text2 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Text similarity failed (${res.status})`);
  }
  return res.json();
}

export async function fetchComplaints(params?: {
  category?: string;
  status?: string;
  only_parent?: boolean;
}): Promise<Complaint[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.status) query.append('status', params.status);
  if (params?.only_parent !== undefined) query.append('only_parent', params.only_parent.toString());

  const url = `${API_BASE}/complaints${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch complaints (${res.status})`);
  return res.json();
}


export async function fetchComplaintDuplicates(id: number): Promise<Complaint[]> {
  const res = await fetch(`${API_BASE}/complaints/${id}/duplicates`);
  if (!res.ok) throw new Error(`Failed to fetch duplicates for ID ${id}`);
  return res.json();
}

export async function fetchNearbyComplaints(
  latitude: number,
  longitude: number,
  radius_meters: number = 100.0
): Promise<NearbyComplaintsResponse> {
  const query = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    radius_meters: radius_meters.toString(),
  });
  const res = await fetch(`${API_BASE}/complaints/nearby?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch nearby complaints`);
  return res.json();
}

export async function updateComplaintStatus(
  id: number,
  status: ComplaintStatus,
  parentId?: number
): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, parent_id: parentId }),
  });
  if (!res.ok) throw new Error(`Failed to update status`);
  return res.json();
}

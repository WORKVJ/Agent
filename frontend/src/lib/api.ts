function resolveApiBaseUrl(): string {
  let url = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').trim();
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

function resolveWsBaseUrl(): string {
  let url = (process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000/ws/location/').trim();
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/ws/location')) {
    url = `${url}/ws/location`;
  }
  return `${url}/`;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const WS_BASE_URL = resolveWsBaseUrl();

export interface Agent {
  id: number;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  employee_id: string;
  full_name: string;
  phone_number: string;
  is_on_duty: boolean;
  current_status: 'OFF_DUTY' | 'IDLE' | 'MOVING' | 'CHECKED_IN';
  battery_level: number;
  last_latitude: number | null;
  last_longitude: number | null;
  last_speed: number;
  last_seen_at: string | null;
  active_visit: {
    id: number;
    client_id: number;
    client_name: string;
    check_in_time: string;
    distance_at_checkin: number;
    selfie_image?: string | null;
  } | null;
}

export interface ClientLocation {
  id: number;
  name: string;
  address: string;
  contact_person: string;
  contact_phone: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  created_at: string;
}

export interface VisitLog {
  id: number;
  agent: number;
  agent_name: string;
  client: number;
  client_name: string;
  client_address: string;
  check_in_time: string;
  check_out_time: string | null;
  check_in_latitude: number;
  check_in_longitude: number;
  distance_at_checkin: number;
  meeting_notes: string;
  order_value: string | number;
  follow_up_date: string | null;
  photo: string | null;
  selfie_image?: string | null;
  attachment_image?: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  duration_minutes: number | null;
}

export interface RouteBreadcrumb {
  id: number;
  lat: number;
  lng: number;
  speed: number;
  battery: number;
  timestamp: string;
}

export interface RouteReplayData {
  agent_id: number;
  agent_name: string;
  employee_id: string;
  date: string;
  total_points: number;
  total_distance_km: number;
  path: RouteBreadcrumb[];
  visits: VisitLog[];
}

export interface AnalyticsData {
  date: string;
  agents: {
    total: number;
    on_duty: number;
    checked_in: number;
    idle: number;
  };
  visits: {
    total: number;
    completed: number;
    conversion_rate_percent: number;
    total_order_value: number;
  };
  time_and_distance: {
    total_distance_km: number;
    meeting_time_minutes: number;
    transit_time_minutes: number;
  };
}

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE_URL}/agents/`);
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}

export async function fetchClients(): Promise<ClientLocation[]> {
  const res = await fetch(`${API_BASE_URL}/clients/`);
  if (!res.ok) throw new Error('Failed to fetch clients');
  return res.json();
}

export async function fetchVisits(agentId?: number): Promise<VisitLog[]> {
  const url = agentId ? `${API_BASE_URL}/visits/?agent_id=${agentId}` : `${API_BASE_URL}/visits/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch visits');
  return res.json();
}

export async function fetchRouteReplay(agentId: number, date?: string): Promise<RouteReplayData> {
  if (!agentId) {
    return {
      agent_id: 0,
      agent_name: '',
      employee_id: '',
      date: date || '',
      total_points: 0,
      total_distance_km: 0,
      path: [],
      visits: []
    };
  }
  const url = date ? `${API_BASE_URL}/routes/${agentId}/?date=${date}` : `${API_BASE_URL}/routes/${agentId}/`;
  const res = await fetch(url);
  if (!res.ok) {
    return {
      agent_id: agentId,
      agent_name: '',
      employee_id: '',
      date: date || '',
      total_points: 0,
      total_distance_km: 0,
      path: [],
      visits: []
    };
  }
  return res.json();
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(`${API_BASE_URL}/analytics/`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function toggleDutyStatus(agentId: number, isOnDuty: boolean): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/duty/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, is_on_duty: isOnDuty })
  });
  if (!res.ok) throw new Error('Failed to toggle duty status');
  return res.json();
}

export async function sendLocationPing(
  agentId: number,
  lat: number,
  lng: number,
  speed = 0.0,
  battery = 100,
  syncLocation = false
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/location/ping/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: agentId,
      latitude: lat,
      longitude: lng,
      speed,
      battery_level: battery,
      sync_location: syncLocation
    })
  });
  if (!res.ok) throw new Error('Failed to send location ping');
  return res.json();
}

export async function performCheckIn(
  agentId: number,
  clientId: number | null,
  lat: number,
  lng: number,
  selfieImage?: string,
  clientName?: string,
  clientAddress?: string
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/check-in/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: agentId,
      client_id: clientId,
      latitude: lat,
      longitude: lng,
      selfie_image: selfieImage || '',
      client_name: clientName || '',
      client_address: clientAddress || ''
    })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Check-in failed');
  }
  return data;
}

export async function performCheckOut(visitId: number, notes: string, orderValue: number, followUpDate?: string, photoFile?: File, attachmentImage?: string): Promise<any> {
  const formData = new FormData();
  formData.append('visit_id', visitId.toString());
  formData.append('meeting_notes', notes);
  formData.append('order_value', orderValue.toString());
  if (followUpDate) formData.append('follow_up_date', followUpDate);
  if (photoFile) formData.append('photo', photoFile);
  if (attachmentImage) formData.append('attachment_image', attachmentImage);

  const res = await fetch(`${API_BASE_URL}/check-out/`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Check-out failed');
  }
  return data;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface LoginResponse {
  success: boolean;
  role: 'admin' | 'agent';
  user: AuthUser;
  agent?: Agent | null;
}

export async function loginUser(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}. Please verify backend connection.`);
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.detail || 'Invalid credentials');
  }
  return data;
}

export async function createAgent(agentData: {
  first_name: string;
  last_name: string;
  username?: string;
  employee_id?: string;
  phone_number?: string;
  email?: string;
  password?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/agents/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agentData)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create agent');
  }
  return data;
}

export async function createClientLocation(clientData: {
  name: string;
  address: string;
  contact_person?: string;
  contact_phone?: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/clients/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientData)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create client target');
  }
  return data;
}

export async function purgeData(): Promise<{
  success: boolean;
  message: string;
  deleted: Record<string, number>;
}> {
  const res = await fetch(`${API_BASE_URL}/purge/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to purge data');
  }
  return data;
}

export async function deleteAgent(agentId: number): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/agents/${agentId}/`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete agent');
  }
  return data;
}

export async function updateAgent(
  agentId: number,
  data: {
    password?: string;
    phone_number?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    employee_id?: string;
  }
): Promise<{ success: boolean; message: string; agent: Agent }> {
  const res = await fetch(`${API_BASE_URL}/agents/${agentId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const resData = await res.json();
  if (!res.ok) {
    throw new Error(resData.error || 'Failed to update agent');
  }
  return resData;
}



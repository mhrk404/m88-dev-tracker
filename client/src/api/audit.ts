import apiClient from './client'

export interface AuditLog {
  id: string;
  user_id: number | null;
  action: string;
  resource: string;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip: string | null;
  user_agent: string | null;
  timestamp: string;
}

export interface SampleHistoryEntry {
  id: string;
  sample_id: string;
  table_name: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: number;
  changed_at: string;
  change_notes: string | null;
  users?: {
    id: number;
    username: string;
    full_name: string;
  };
}

export interface StatusTransition {
  id: string;
  sample_id: string;
  from_status: string | null;
  to_status: string;
  from_stage: string | null;
  to_stage: string;
  transitioned_by: number;
  transitioned_at: string;
  reason: string | null;
  users?: {
    id: number;
    username: string;
    full_name: string;
  };
}

export interface SampleHistoryResponse {
  sample_history: SampleHistoryEntry[];
  status_transitions: StatusTransition[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActivityLogsResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

// Get audit logs for a specific sample
export const getSampleAudit = async (sampleId: string) => {
  const { data } = await apiClient.get(`/samples/${sampleId}/audit`);
  return data;
};

// Get sample history and status transitions
export const getSampleHistory = async (sampleId: string, limit = 100, offset = 0) => {
  const { data } = await apiClient.get<SampleHistoryResponse>(
    `/samples/${sampleId}/audit/history`,
    { params: { limit, offset } }
  );
  return data;
};

// Get all activity logs (super admin only)
export const getAllActivityLogs = async (params: Record<string, any>) => {
  const { data } = await apiClient.get<ActivityLogsResponse>(
    `/activity-logs`,
    { params }
  );
  return data;
};

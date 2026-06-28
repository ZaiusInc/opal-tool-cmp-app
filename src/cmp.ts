import axios, { AxiosResponse } from 'axios';
import { CMP_BASE_URL } from './config';


interface OptiAuthData {
  provider: string;
  credentials: {
    token_type: string;
    access_token: string;
    org_sso_id: string;
    user_id: string;
    instance_id: string;
    customer_id: string;
    product_sku: string;
  };
}

export interface CmpAssetRendition {
  id: string;
  name: string;
  created_at: string;
  mime_type: string;
  url: string;
}

function generateNumericId() {
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += Math.floor(Math.random() * 10);
  }
  return id;
}

export const getTaskDetailsFromCMP = async (
  taskId: string,
  authData: OptiAuthData
) => {
  try {
    const headers = {
      Accept: 'application/json',
      'x-auth-token-type': 'opti-id',
      Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
      'Accept-Encoding': 'gzip',
      'x-request-id': generateNumericId(),
      'x-org-sso-id': authData.credentials.org_sso_id
    };

    const url = `${CMP_BASE_URL}/v3/tasks/${taskId}/brief`;
    const res = await axios.get(url, { headers });
    console.log('res.data ', res.data);
    return res.data;
  } catch (error: any) {
    console.error(`Failed to get task ${taskId}`, error.message);
    throw error;
  }
};

export const createMilestoneWithinCampaign = async (
  campaignId: string,
  milestoneData: {
    title: string;
    description?: string | null;
    due_date: string;
    hex_color: string;
    tasks?: Array<{ id: string }>;
  },
  authData: OptiAuthData
) => {
  try {
    if (!milestoneData.title) throw new Error('title is required.');
    if (!milestoneData.due_date) throw new Error('due_date is required (ISO 8601 UTC).');
    if (!milestoneData.hex_color) throw new Error('hex_color is required (e.g., #4ECFD5).');

    if (milestoneData.tasks && !milestoneData.tasks.every((t) => t.id)) {
      throw new Error("Each task must be an object containing an 'id' field.");
    }

    const headers = {
      Accept: 'application/json',
      'x-auth-token-type': 'opti-id',
      Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
      'Accept-Encoding': 'gzip',
      'x-request-id': generateNumericId(),
      'x-org-sso-id': authData.credentials.org_sso_id,
      'Content-Type': 'application/json'
    };

    const url = `${CMP_BASE_URL}/v3/milestones`;

    const requestBody = {
      title: milestoneData.title,
      description: milestoneData.description || null,
      campaign_id: campaignId,
      due_date: milestoneData.due_date,
      hex_color: milestoneData.hex_color,
      tasks: milestoneData.tasks || []
    };

    console.log('CMP Milestone Payload:', requestBody);
    const res: AxiosResponse = await axios.post(url, requestBody, { headers });
    return res.data;
  } catch (error: any) {
    console.error('Failed to create milestone:', error.message);
    if (axios.isAxiosError(error) && error.response) {
      console.error('CMP Error:', error.response.data);
    }
    throw error;
  }
};

export const updateMilestoneWithinCampaign = async (
  milestoneId: string,
  updateData: {
    title?: string;
    description?: string | null;
    campaign_id: string;
    due_date?: string;
    hex_color?: string;
    tasks: Array<{ id: string }>;
  },
  authData: OptiAuthData
) => {
  try {
    if (!updateData.campaign_id) throw new Error('campaign_id is required.');
    if (!updateData.tasks || !Array.isArray(updateData.tasks)) {
      throw new Error('tasks is required and must be an array');
    }
    if (!updateData.tasks.every((t) => t.id)) {
      throw new Error('Each task must contain an id field.');
    }
    if (updateData.title && (updateData.title.length < 1 || updateData.title.length > 80)) {
      throw new Error('title must be 1–80 characters.');
    }
    if (updateData.description && updateData.description.length > 250) {
      throw new Error('description cannot exceed 250 characters.');
    }

    const headers = {
      Accept: 'application/json',
      'x-auth-token-type': 'opti-id',
      Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
      'Accept-Encoding': 'gzip',
      'x-request-id': Date.now().toString(),
      'x-org-sso-id': authData.credentials.org_sso_id,
      'Content-Type': 'application/json'
    };

    const url = `${CMP_BASE_URL}/v3/milestones/${milestoneId}`;

    console.log('CMP Update Milestone Payload:', updateData);
    const res: AxiosResponse = await axios.patch(url, updateData, { headers });
    return res.data;
  } catch (error: any) {
    console.error('Failed to update milestone:', error.message);
    if (axios.isAxiosError(error) && error.response) {
      console.error('CMP Error:', error.response.data);
    }
    throw error;
  }
};

export interface CmpAssetLocation {
  id: string;
  title: string;
  file_location: string;
  folder_id: string | null;
  url: string | null;
}

export const getAssetLocation = async (
  assetId: string,
  authData: OptiAuthData
): Promise<CmpAssetLocation> => {
  if (!assetId) throw new Error('assetId is required');

  const headers = {
    Accept: 'application/json',
    'x-auth-token-type': 'opti-id',
    Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
    'Accept-Encoding': 'gzip',
    'x-request-id': generateNumericId(),
    'x-org-sso-id': authData.credentials.org_sso_id
  };

  try {
    const res: AxiosResponse = await axios.get(
      `${CMP_BASE_URL}/v3/asset-urls/${assetId}`,
      { headers }
    );
    const { id, title, file_location, folder_id, url } = res.data;
    return { id, title, file_location, folder_id, url };
  } catch (error: any) {
    console.error(`Failed to fetch asset ${assetId}:`, error.message);
    if (axios.isAxiosError(error) && error.response) {
      console.error('CMP Error:', error.response.data);
    }
    throw error;
  }
};

export const getAssetRenditions = async (
  assetId: string,
  authData: OptiAuthData
): Promise<CmpAssetRendition[]> => {
  if (!assetId) throw new Error('assetId is required');

  const headers = {
    Accept: 'application/json',
    'x-auth-token-type': 'opti-id',
    Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
    'Accept-Encoding': 'gzip',
    'x-request-id': generateNumericId(),
    'x-org-sso-id': authData.credentials.org_sso_id
  };

  try {
    const res: AxiosResponse = await axios.get(
      `${CMP_BASE_URL}/v3/assets/${assetId}/renditions`,
      { headers }
    );

    return res.data.data;
  } catch (error: any) {
    console.error(`Failed to fetch renditions for asset ${assetId}:`, error.message);

    if (axios.isAxiosError(error) && error.response) {
      console.error('CMP Error:', error.response.data);
    }

    throw error;
  }
};

export const getOpalFile = async (
  fileId: string,
  authData: OptiAuthData
): Promise<string> => {
  if (!fileId) {
    throw new Error('fileId is required');
  }

  try {
    const res: AxiosResponse<ArrayBuffer> = await axios.get(
      `https://opal-backend.optimizely.com/v1/file/${fileId}`,
      {
        responseType: 'arraybuffer',
        headers: {
          Authorization: `Bearer ${authData.credentials.access_token}`
        }
      }
    );

    return Buffer.from(res.data).toString('utf8');
  } catch (error: any) {
    console.error(`Failed to download Opal file ${fileId}:`, error.message);

    if (axios.isAxiosError(error) && error.response) {
      console.error('Opal Error:', error.response.data);
    }

    throw error;
  }
};


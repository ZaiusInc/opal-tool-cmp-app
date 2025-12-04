import axios, { AxiosResponse } from 'axios';
import { CMP_BASE_URL } from './config';
// import { AuthData } from './types/auth';

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

function generateNumericId() {
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += Math.floor(Math.random() * 10); // digits 0-9
  }
  return id;
}


// helper to get task brief details from  CMP
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
      'x-org-sso-id': authData.credentials.org_sso_id,
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
    due_date: string;           // ISO 8601 UTC, required
    hex_color: string;          // Required
    tasks?: { id: string }[];   // Array of objects with id
  },
  authData: OptiAuthData
) => {
  try {
    // Validate required fields
    if (!milestoneData.title) {
      throw new Error("title is required.");
    }

    if (!milestoneData.due_date) {
      throw new Error("due_date is required (ISO 8601 UTC).");
    }

    if (!milestoneData.hex_color) {
      throw new Error("hex_color is required (e.g., #4ECFD5).");
    }

    // Validate tasks structure
    if (milestoneData.tasks && !milestoneData.tasks.every(t => t.id)) {
      throw new Error("Each task must be an object containing an 'id' field.");
    }

    // Headers
    const headers = {
      Accept: "application/json",
      "x-auth-token-type": "opti-id",
      Authorization: `${authData.credentials.token_type} ${authData.credentials.access_token}`,
      "Accept-Encoding": "gzip",
      "x-request-id": generateNumericId(),
      "x-org-sso-id": authData.credentials.org_sso_id,
      "Content-Type": "application/json",
    };

    const url = `${CMP_BASE_URL}/v3/milestones`;

    // Build request body exactly as the API requires
    const requestBody = {
      title: milestoneData.title,
      description: milestoneData.description || null,
      campaign_id: campaignId,
      due_date: milestoneData.due_date,    // MUST be: 2025-11-24T13:15:30Z
      hex_color: milestoneData.hex_color,  // REQUIRED
      tasks: milestoneData.tasks || [],    // MUST be [{ id }]
    };

    console.log("CMP Milestone Payload:", requestBody);

    // 🔥 Actual API POST call (per doc)
    const res: AxiosResponse = await axios.post(url, requestBody, { headers });

    return res.data;

  } catch (error: any) {
    console.error("Failed to create milestone:", error.message);

    if (axios.isAxiosError(error) && error.response) {
      console.error("CMP Error:", error.response.data);
    }

    throw error;
  }
};


export const updateMilestoneWithinCampaign = async (
  milestoneId: string,
  updateData: {
    title?: string;
    description?: string | null;
    campaign_id: string;           // required
    due_date?: string;
    hex_color?: string;
    tasks: Array<{ id: string }>;  // required
  },
  authData: OptiAuthData
) => {
  try {
    // Required fields
    if (!updateData.campaign_id) {
      throw new Error('"campaign_id" is required.');
    }

    if (!updateData.tasks || !Array.isArray(updateData.tasks)) {
      throw new Error('"tasks" is required and must be an array');
    }

    if (!updateData.tasks.every((t) => t.id)) {
      throw new Error('Each task must contain an "id" field.');
    }

    // Additional CMP validations
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


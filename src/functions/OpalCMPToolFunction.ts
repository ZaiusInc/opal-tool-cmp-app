import { logger, Function, Response } from '@zaiusinc/app-sdk';
import { getTaskDetailsFromCMP, createMilestoneWithinCampaign, updateMilestoneWithinCampaign, getAssetLocation } from '../cmp';

interface TaskBriefParameters {
  task_id: string;
}

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

function toIsoUtc(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`);
  }
  return date.toISOString();
}

const discoveryPayload = {
  functions: [
    {
      name: 'get_task_brief',
      description: 'Get Details of the Task Brief from CMP',
      parameters: [
        {
          name: 'task_id',
          type: 'string',
          description: 'The task ID in CMP',
          required: true
        }
      ],
      endpoint: '/tools/get-task-brief',
      http_method: 'POST',
      auth_requirements: [
        {
          provider: 'OptiID',
          scope_bundle: 'default',
          required: true
        }
      ]
    },
    {
      name: 'get_library_asset_location',
      description: `Retrieve asset metadata including title, file location, and folder ID from the CMP 
      library using the asset ID.`,
      parameters: [
        {
          name: 'asset_id',
          type: 'string',
          description: 'The CMP asset ID',
          required: true
        }
      ],
      endpoint: '/tools/get-library-asset-location',
      http_method: 'POST',
      auth_requirements: [
        {
          provider: 'OptiID',
          scope_bundle: 'default',
          required: true
        }
      ]
    }
  ]
};

export class OpalCMPToolFunction extends Function {
  public async perform(): Promise<Response> {
    if (this.request.path === '/discovery') {
      return new Response(200, discoveryPayload);
    } else if (this.request.path === '/tools/get-task-brief') {
      console.log('Request body:', this.request.bodyJSON);
      console.log('Request headers:', this.request.headers);
      const params = this.extractParameters() as TaskBriefParameters;
      const authData = this.extractAuthData() as OptiAuthData;
      const response = await this.getTaskBriefDetails(params, authData);
      return new Response(200, response);
    } else if (this.request.path === '/tools/get-library-asset-location') {
      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;
      const response = await this.getLibraryAssetLocation(params, authData);
      return new Response(200, response);
    } else {
      return new Response(400, 'Invalid path');
    }
  }

  private extractParameters() {
    if (this.request.bodyJSON && this.request.bodyJSON.parameters) {
      logger.info("Extracted parameters from 'parameters' key:", this.request.bodyJSON.parameters);
      return this.request.bodyJSON.parameters;
    }
    logger.warn("'parameters' key not found in request body. Using body directly.");
    return this.request.bodyJSON;
  }

  private extractAuthData() {
    if (this.request.bodyJSON && this.request.bodyJSON.auth) {
      logger.info("Extracted authData from 'auth' key:", this.request.bodyJSON.auth);
      return this.request.bodyJSON.auth;
    }
    logger.warn("'auth' key not found in request body. Using body directly.");
    return this.request.bodyJSON;
  }

  private async getTaskBriefDetails(parameters: TaskBriefParameters, authData: OptiAuthData) {
    const { task_id } = parameters;
    try {
      if (!task_id) throw new Error('Missing required parameter: task_id');
      const brief = await getTaskDetailsFromCMP(task_id, authData);
      logger.info('Extracted brief data from CMP ', brief);
      return { brief };
    } catch (error: any) {
      console.error('Error fetching CMP task brief:', error.message);
      throw new Error('Failed to fetch CMP task brief');
    }
  }

  private async createMilestoneWithinCampaign(parameters: any, authData: OptiAuthData) {
    const { campaign_id, title, description, hex_color, tasks } = parameters;
    let { due_date } = parameters;
    try {
      if (!campaign_id) throw new Error('campaign_id is required');
      if (!title) throw new Error('title is required');
      if (!due_date) throw new Error('due_date is required');

      due_date = toIsoUtc(due_date);

      const milestonePayload = {
        title,
        description: description || null,
        due_date,
        hex_color: hex_color || '#4ECFD5',
        tasks: tasks || []
      };

      logger.info('Creating milestone with payload:', milestonePayload);
      const result = await createMilestoneWithinCampaign(campaign_id, milestonePayload, authData);
      return { milestone: result };
    } catch (error: any) {
      console.error('Error creating milestone:', error.message);
      throw new Error('Failed to create milestone in CMP');
    }
  }

  private async updateMilestoneWithinCampaign(parameters: any, authData: OptiAuthData) {
    const { id, title, description, campaign_id, hex_color, tasks } = parameters;
    let { due_date } = parameters;
    try {
      if (!id) throw new Error('Milestone "id" is required');
      if (!campaign_id) throw new Error('"campaign_id" is required');
      if (!tasks) throw new Error('"tasks" is required and must be an array');

      if (due_date) {
        due_date = toIsoUtc(due_date);
      }

      const payload = {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        campaign_id,
        ...(due_date && { due_date }),
        ...(hex_color && { hex_color }),
        tasks
      };

      logger.info('Updating milestone with payload:', payload);
      const result = await updateMilestoneWithinCampaign(id, payload, authData);
      return { milestone: result };
    } catch (error: any) {
      console.error('Error updating milestone:', error.message);
      throw new Error('Failed to update milestone in CMP');
    }
  }

  private async getLibraryAssetLocation(parameters: any, authData: OptiAuthData) {
    const { asset_id } = parameters;
    if (!asset_id) throw new Error('asset_id is required');
    try {
      const asset = await getAssetLocation(asset_id, authData);
      return {
        asset_id: asset.id,
        asset_title: asset.title,
        file_location: asset.file_location,
        folder_id: asset.folder_id,
        url: asset.url
      };
    } catch (error: any) {
      logger.error('Error fetching asset location:', error.message);
      throw new Error('Failed to fetch asset location from CMP');
    }
  }
}

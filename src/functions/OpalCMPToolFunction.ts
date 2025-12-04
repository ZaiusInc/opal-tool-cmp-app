import { logger, Function, Response } from '@zaiusinc/app-sdk';
import { getTaskDetailsFromCMP, createMilestoneWithinCampaign, updateMilestoneWithinCampaign } from '../cmp';
// import { AuthSection } from '../data/data';


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

  return date.toISOString(); // Always outputs: 2025-11-24T13:15:30.000Z
}

// Define Opal tool metadata  - list of tools and their parameters
const discoveryPayload = {
  'functions': [
    {
      'name': 'get_task_brief',
      'description': 'Get Details of the Task Brief from CMP',
      'parameters': [
        {
          'name': 'task_id',
          'type': 'string',
          'description': 'The task ID in CMP',
          'required': true
        }
      ],
      'endpoint': '/tools/get-task-brief',
      'http_method': 'POST',
      'auth_requirements': [
        {
          'provider': 'OptiID',
          'scope_bundle': 'default',
          'required': true
        }
      ]
    },
    {
      'name': 'create_milestone_within_campaign',
      'description': 'Create a milestone inside a CMP campaign',
      'parameters': [
        {
          'name': 'campaign_id',
          'type': 'string',
          'description': 'The CMP campaign ID',
          'required': true
        },
        {
          'name': 'title',
          'type': 'string',
          'description': 'Title of the milestone',
          'required': true
        },
        {
          'name': 'description',
          'type': 'string',
          'description': 'Description of the milestone (optional)',
          'required': false
        },
        {
          'name': 'due_date',
          'type': 'string',
          'description': 'Due date in ISO 8601 UTC format e.g. 2025-11-24T13:15:30Z',
          'required': true
        },
        {
          'name': 'hex_color',
          'type': 'string',
          'description': 'Hex color code for the milestone label',
          'required': false
        },
        {
          'name': 'tasks',
          'type': 'array',
          'description': 'List of task objects with format [{ id: string }]',
          'required': false
        }
      ],
      'endpoint': '/tools/create-milestone-within-campaign',
      'http_method': 'POST',
      'auth_requirements': [
        {
          'provider': 'OptiID',
          'scope_bundle': 'default',
          'required': true
        }
      ]
    },
    {
      'name': 'update_milestone_within_campaign',
      'description': 'Update a milestone inside a CMP campaign',
      'parameters': [
        {
          'name': 'id',
          'type': 'string',
          'description': 'The milestone ID to update',
          'required': true
        },
        {
          'name': 'title',
          'type': 'string',
          'description': 'Updated title (1–80 chars)',
          'required': false
        },
        {
          'name': 'description',
          'type': 'string',
          'description': 'Updated description (1–250 chars)',
          'required': false
        },
        {
          'name': 'campaign_id',
          'type': 'string',
          'description': 'Campaign ID to associate with this milestone',
          'required': true
        },
        {
          'name': 'due_date',
          'type': 'string',
          'description': 'Updated ISO 8601 UTC due date',
          'required': false
        },
        {
          'name': 'hex_color',
          'type': 'string',
          'description': 'Updated hex color code',
          'required': false
        },
        {
          'name': 'tasks',
          'type': 'array',
          'description': 'List of task objects [{ id: string }]',
          'required': true
        }
      ],
      'endpoint': '/tools/update-milestone-within-campaign',
      'http_method': 'PATCH',
      'auth_requirements': [
        {
          'provider': 'OptiID',
          'scope_bundle': 'default',
          'required': true
        }
      ]
    }
  ]
};

/**
 * class that implements the Opal tool functions. Requirements:
 * - Must extend the Function class from the SDK
 * - Name must match the value of entry_point property from app.yml manifest
 * - Name must match the file name
 */
export class OpalCMPToolFunction extends Function {

  /**
   * Processing the request from Opal
   * Add your logic here to handle every tool declared in the discoveryPayload.
   */
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
    } else if (this.request.path === '/tools/create-milestone-within-campaign') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.createMilestoneWithinCampaign(params, authData);

      return new Response(200, response);

    } else if (this.request.path === '/tools/update-milestone-within-campaign') {

      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;

      const response = await this.updateMilestoneWithinCampaign(params, authData);

      return new Response(200, response);
    } else {
      return new Response(400, 'Invalid path');
    }
  }

  private extractParameters() {
    // Extract parameters from the request body
    if (this.request.bodyJSON && this.request.bodyJSON.parameters) {
      // Standard format: { "parameters": { ... } }
      logger.info('Extracted parameters from \'parameters\' key:', this.request.bodyJSON.parameters);
      return this.request.bodyJSON.parameters;
    } else {
      // Fallback for direct testing: { "name": "value" }
      logger.warn('\'parameters\' key not found in request body. Using body directly.');
      return this.request.bodyJSON;
    }
  }

  private extractAuthData() {
    // Extract auth data from the request headers
    if (this.request.bodyJSON && this.request.bodyJSON.auth) {
      // Standard format: { "parameters": { ... } }
      logger.info('Extracted authData from \'auth\' key:', this.request.bodyJSON.auth);
      return this.request.bodyJSON.auth;
    } else {
      // Fallback for direct testing: { "name": "value" }
      logger.warn('\'auth\' key not found in request body. Using body directly.');
      return this.request.bodyJSON;
    }
  }

  /**
   * The logic of the tool goes here.
   */
  private async getTaskBriefDetails(parameters: TaskBriefParameters, authData: OptiAuthData) {
    const { task_id } = parameters;

    try {
      if (!task_id) {
        throw new Error('Missing required parameter: task_id');
      }

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

      const result = await createMilestoneWithinCampaign(
        campaign_id,
        milestonePayload,
        authData
      );

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
        tasks // required
      };

      logger.info('Updating milestone with payload:', payload);

      const result = await updateMilestoneWithinCampaign(
        id,
        payload,
        authData
      );

      return { milestone: result };

    } catch (error: any) {
      console.error('Error updating milestone:', error.message);
      throw new Error('Failed to update milestone in CMP');
    }
  }


}

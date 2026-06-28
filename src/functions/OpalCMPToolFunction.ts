import { logger, Function, Response } from '@zaiusinc/app-sdk';
import {
  getTaskDetailsFromCMP, createMilestoneWithinCampaign,
  updateMilestoneWithinCampaign, getAssetLocation, getAssetRenditions,
  getOpalFile
} from '../cmp';
import pLimit from 'p-limit';


interface AssetRenditionsCsvParameters {
  csv_file_id: string;
  asset_id_column: string;
  rendition_type?: string;
}

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

interface AssetRenditionsParameters {
  asset_id: string;
  rendition_type?: string;
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
    },
    {
      name: 'get_library_asset_renditions',
      description: `Retrieve all renditions for a CMP asset. Optionally filter the returned renditions 
      by MIME type (for example image/webp, image/jpeg or image/png).`,
      parameters: [
        {
          name: 'asset_id',
          type: 'string',
          description: 'The CMP asset ID',
          required: true
        },
        {
          name: 'rendition_type',
          type: 'string',
          description: 'Optional rendition format to filter by, for example webp, jpeg, jpg, png or tiff.',
          required: false
        }
      ],
      endpoint: '/tools/get-library-asset-renditions',
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
      name: 'get_library_asset_renditions_to_csv',
      description: `Retrieve renditions for every asset ID in a CSV file and return a CSV. 
      Optionally filter renditions by type such as webp, jpeg, png or tiff.`,
      parameters: [
        {
          name: 'csv_file_id',
          type: 'string',
          description: 'File ID of the CSV containing asset IDs.',
          required: true
        },
        {
          name: 'asset_id_column',
          type: 'string',
          description: 'Column name containing the asset IDs.',
          required: true
        },
        {
          name: 'rendition_type',
          type: 'string',
          description: 'Optional rendition type filter such as webp, jpeg, png or tiff.',
          required: false
        }
      ],
      endpoint: '/tools/get-library-asset-renditions-to-csv',
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
    } else if (this.request.path === '/tools/get-library-asset-renditions') {
      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;
      const response = await this.getLibraryAssetRenditions(params, authData);
      return new Response(200, response);
    } else if (this.request.path === '/tools/get-library-asset-renditions-to-csv') {
      const params = this.extractParameters();
      const authData = this.extractAuthData() as OptiAuthData;
      const response = await this.getLibraryAssetRenditionsToCsv(params, authData);
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

  private async getLibraryAssetRenditions(
    parameters: AssetRenditionsParameters,
    authData: OptiAuthData
  ) {
    const { asset_id, rendition_type } =
      parameters;

    if (!asset_id) {
      throw new Error('asset_id is required');
    }

    try {
      const renditions = await getAssetRenditions(asset_id, authData);

      const filter =
        rendition_type?.toLowerCase() === 'jpg'
          ? 'jpeg'
          : rendition_type?.toLowerCase();

      const filtered = filter
        ? renditions.filter((r) =>
          r.mime_type.toLowerCase().includes(filter)
        )
        : renditions;

      return {
        asset_id,
        total_renditions: filtered.length,
        renditions: filtered
      };
    } catch (error: any) {
      logger.error('Error fetching asset renditions:', error.message);
      throw new Error('Failed to fetch asset renditions from CMP');
    }
  }
  private async getLibraryAssetRenditionsToCsv(
    parameters: AssetRenditionsCsvParameters,
    authData: OptiAuthData
  ) {
    const {
      csv_file_id,
      asset_id_column,
      rendition_type
    } = parameters;

    if (!csv_file_id) {
      throw new Error('csv_file_id is required');
    }

    if (!asset_id_column) {
      throw new Error('asset_id_column is required');
    }

    try {
      const csv = await getOpalFile(csv_file_id, authData);

      const lines = csv.trim().split(/\r?\n/);

      if (lines.length < 2) {
        throw new Error('CSV file is empty.');
      }

      const headers = lines[0].split(',').map((h) => h.trim());

      const rows = lines.slice(1).map((line) => {
        const values = line.split(',');

        return headers.reduce<Record<string, string>>((obj, header, index) => {
          obj[header] = (values[index] || '').trim();
          return obj;
        }, {});
      });

      const filter =
        rendition_type?.toLowerCase() === 'jpg'
          ? 'jpeg'
          : rendition_type?.toLowerCase();

      const limit = pLimit(10);

      const results = await Promise.all(
        rows.map((row) =>
          limit(async () => {
            const assetId = row[asset_id_column];

            if (!assetId) {
              return [];
            }

            try {
              const renditions = await getAssetRenditions(assetId, authData);

              const filtered = filter
                ? renditions.filter((r) =>
                  r.mime_type.toLowerCase().includes(filter)
                )
                : renditions;

              return filtered.map((r) => ({
                asset_id: assetId,
                rendition_id: r.id,
                rendition_name: r.name,
                mime_type: r.mime_type,
                rendition_url: r.url,
                error: ''
              }));
            } catch (error: any) {
              logger.error(
                `Failed to fetch renditions for asset ${assetId}:`,
                error.message
              );

              return [
                {
                  asset_id: assetId,
                  rendition_id: '',
                  rendition_name: '',
                  mime_type: '',
                  rendition_url: '',
                  error: error.message
                }
              ];
            }
          })
        )
      );

      const outputRows = results.flat();

      const outputHeaders = [
        'asset_id',
        'rendition_id',
        'rendition_name',
        'mime_type',
        'rendition_url',
        'error'
      ];

      const outputCsv = [
        outputHeaders.join(','),
        ...outputRows.map((row) =>
          outputHeaders
            .map((header) =>
              `"${String(row[header as keyof typeof row] ?? '').replace(/"/g, '""')}"`
            )
            .join(',')
        )
      ].join('\n');

      return {
        filename: 'asset_renditions.csv',
        content_type: 'text/csv',
        content: outputCsv,
        total_assets: rows.length,
        total_renditions: outputRows.length
      };
    } catch (error: any) {
      logger.error(
        'Error generating asset renditions CSV:',
        error.message
      );

      throw new Error('Failed to generate asset renditions CSV');
    }
  }
}



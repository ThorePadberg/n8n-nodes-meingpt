import type { JsonObject } from 'n8n-workflow';
import {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

const BASE_URL = 'https://app.meingpt.com/api';
const REQUEST_TIMEOUT_MS = 30000;

function extractIdFromUrlOrId(input: string): string | undefined {
	const trimmed = input.trim();
	if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
	const match = trimmed.match(/(?:assistants|workflows)\/([A-Za-z0-9_-]+)/i);
	if (match) return match[1];
	return undefined;
}

export class MeinGpt implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'meinGPT',
		name: 'meinGpt',
		icon: 'file:meingpt.svg',
		group: ['transform'],
			version: 1,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Interact with meinGPT',
		defaults: {
			name: 'meinGPT',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'meinGptApi',
				required: true,
			},
		],
		properties: [
			// ===== Resource =====
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Chat', value: 'chat' },
					{ name: 'Assistant', value: 'assistant' },
					{ name: 'Workflow', value: 'workflow' },
				],
				default: 'chat',
			},

			// ===== Chat Operations =====
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['chat'] } },
				options: [
					{
						name: 'Send Message',
						value: 'sendMessage',
						action: 'Send a chat message',
					},
				],
				default: 'sendMessage',
			},

			// ===== Assistant Operations =====
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['assistant'] } },
				options: [
					{
						name: 'Execute',
						value: 'execute',
						action: 'Execute an assistant',
					},
					{
						name: 'List',
						value: 'list',
						action: 'List all assistants',
					},
				],
				default: 'execute',
			},

			// ===== Workflow Operations =====
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['workflow'] } },
				options: [
					{
						name: 'Execute',
						value: 'execute',
						action: 'Execute a workflow',
					},
				],
				default: 'execute',
			},

			// ===== Chat: Send Message Parameters =====
				{
					displayName: 'Model',
					name: 'model',
				type: 'options',
				required: true,
				displayOptions: { show: { resource: ['chat'], operation: ['sendMessage'] } },
				options: [
					{ name: 'Anthropic: Claude 3.7 Sonnet', value: 'claude-3-7-sonnet' },
					{ name: 'Anthropic: Claude 3.7 Sonnet Thinking', value: 'claude-3-7-sonnet-thinking' },
					{ name: 'Anthropic: Claude Opus 4.1', value: 'claude-opus-4.1' },
					{ name: 'Anthropic: Claude Opus 4.5', value: 'claude-opus-4-5@20251101' },
					{ name: 'Anthropic: Claude Sonnet 4', value: 'claude-sonnet-4' },
					{ name: 'Anthropic: Claude Sonnet 4.5', value: 'claude-sonnet-4-5' },
						{ name: 'DeepSeek: R1', value: 'deepseek-r1' },
						{ name: 'DeepSeek: V3', value: 'deepseek-v3' },
						{ name: 'Google: Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
						{ name: 'Google: Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
						{ name: 'Google: Gemini 3 Flash', value: 'gemini-3-flash' },
					{ name: 'Google: Gemini 3 Pro', value: 'gemini-3-pro' },
					{ name: 'Mistral: Codestral', value: 'codestral' },
					{ name: 'Mistral: Magistral Medium', value: 'magistral-medium' },
					{ name: 'Mistral: Mistral Medium', value: 'mistral-medium' },
					{ name: 'Open Source: GPT-OSS 120B', value: 'gpt-oss-120b' },
					{ name: 'Open Source: GPT-OSS 20B', value: 'gpt-oss-20b' },
					{ name: 'Open Source: Llama 3.3 Fast', value: 'llama-3.3-fast' },
					{ name: 'OpenAI: GPT-4.1', value: 'gpt-4.1' },
					{ name: 'OpenAI: GPT-4o', value: 'gpt-4o' },
					{ name: 'OpenAI: GPT-4o Mini', value: 'gpt-4o-mini' },
					{ name: 'OpenAI: GPT-5', value: 'gpt-5' },
					{ name: 'OpenAI: GPT-5 Mini', value: 'gpt-5-mini' },
					{ name: 'OpenAI: GPT-5 Thinking', value: 'gpt-5-thinking' },
					{ name: 'OpenAI: GPT-5.1', value: 'gpt-5-1' },
					{ name: 'OpenAI: GPT-5.2', value: 'gpt-5-2' },
					{ name: 'OpenAI: o3', value: 'o3' },
					{ name: 'OpenAI: o3-pro', value: 'o3-pro' },
					{ name: 'OpenAI: o4-mini', value: 'o4-mini' },
					{ name: 'Perplexity: Sonar', value: 'sonar' },
					{ name: 'Perplexity: Sonar Deep Research', value: 'sonar-deep-research' },
					],
					default: 'gpt-4o',
					description: 'Model to use for the request',
			},
			{
				displayName: 'User Message',
				name: 'userMessage',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['chat'], operation: ['sendMessage'] } },
				default: '',
				typeOptions: { rows: 4 },
				description: 'The message to send to the model',
			},
			{
				displayName: 'System Message',
				name: 'systemMessage',
				type: 'string',
				displayOptions: { show: { resource: ['chat'], operation: ['sendMessage'] } },
				default: '',
				typeOptions: { rows: 2 },
				description: 'Optional system prompt to set the behavior of the model',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				displayOptions: { show: { resource: ['chat'], operation: ['sendMessage'] } },
				default: 0.7,
				typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 1 },
				description: 'Sampling temperature (0-2). Higher values = more creative.',
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				displayOptions: { show: { resource: ['chat'], operation: ['sendMessage'] } },
				default: 0,
				description: 'Maximum tokens to generate. 0 = no limit.',
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				displayOptions: { show: { resource: ['chat'], operation: ['sendMessage'] } },
				default: 'text',
					options: [
						{ name: 'Text', value: 'text' },
						{ name: 'JSON Object', value: 'json_object' },
					],
					description: 'Force a valid JSON object response',
			},

			// ===== Assistant: Execute Parameters =====
			{
				displayName: 'Assistant Name or ID',
				name: 'assistantId',
				type: 'options',
				required: true,
				displayOptions: { show: { resource: ['assistant'], operation: ['execute'] } },
				typeOptions: {
					loadOptionsMethod: 'getAssistants',
				},
				default: '',
				description: 'The assistant to execute. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['assistant'], operation: ['execute'] } },
				default: '',
				typeOptions: { rows: 4 },
				description: 'The message to send to the assistant',
			},
			{
				displayName: 'Additional Inputs',
				name: 'additionalInputs',
				type: 'json',
				displayOptions: { show: { resource: ['assistant'], operation: ['execute'] } },
				default: '{}',
				description: 'Additional input variables as JSON',
			},

			// ===== Workflow: Execute Parameters =====
			{
				displayName: 'Workflow ID',
				name: 'workflowId',
				type: 'string',
				required: true,
					displayOptions: { show: { resource: ['workflow'], operation: ['execute'] } },
					default: '',
					description:
						'The workflow to execute. Provide a workflow ID directly or a meinGPT workflow URL via expression.',
			},
			{
				displayName: 'Input Variables',
				name: 'inputVariables',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				displayOptions: { show: { resource: ['workflow'], operation: ['execute'] } },
				default: {},
				options: [
					{
						name: 'variable',
						displayName: 'Variable',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'z.B. customer_name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'z.B. Max Mustermann',
							},
						],
					},
					],
					description: 'Input variables for the workflow',
				},
			],
			usableAsTool: true,
		};

	methods = {
		loadOptions: {
			async getAssistants(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				try {
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'meinGptApi',
						{
							method: 'GET',
							url: `${BASE_URL}/assistants/v1/`,
							json: true,
							timeout: REQUEST_TIMEOUT_MS,
						},
					);

					// Handle different possible response shapes
					let assistants: Array<{ id: string; name: string }> = [];

					if (Array.isArray(response)) {
						assistants = response;
					} else if (response.assistants && Array.isArray(response.assistants)) {
						assistants = response.assistants;
					} else if (response.data && Array.isArray(response.data)) {
						assistants = response.data;
					}

						return assistants
							.filter((a) => a.name && a.name.trim() !== '')
							.map((a) => ({
								name: `${a.name} (${a.id.substring(0, 8)}...)`,
								value: a.id,
							}));
				} catch {
					return [{ name: 'Unable To Load Assistants - Check API Key', value: '' }];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const errorMessages: Record<number, string> = {
			401: 'Invalid API key. Please check your meinGPT API key in credentials.',
			403: 'Access denied. Your API key does not have permission for this action.',
			404: 'Not found. Check the assistant or workflow ID.',
			429: 'Rate limit reached. Wait a moment and try again.',
			500: 'meinGPT server error. Please try again later.',
		};

		const getStatusCode = (error: unknown): number | undefined => {
			const errorObj = error as {
				statusCode?: number;
				httpCode?: number;
				response?: { status?: number };
				cause?: { statusCode?: number; response?: { status?: number } };
			};

			return (
				errorObj.statusCode ??
				errorObj.httpCode ??
				errorObj.response?.status ??
				errorObj.cause?.statusCode ??
				errorObj.cause?.response?.status
			);
		};

		const getSafeErrorMessage = (error: unknown): string => {
			const statusCode = getStatusCode(error);
			if (statusCode && errorMessages[statusCode]) {
				return errorMessages[statusCode];
			}
			return 'Request failed. Check credentials and input parameters.';
		};

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] | undefined;

				// ===== CHAT: Send Message =====
					if (resource === 'chat' && operation === 'sendMessage') {
						const model = this.getNodeParameter('model', i) as string;
						const userMessage = this.getNodeParameter('userMessage', i) as string;
						if (!userMessage.trim()) {
							throw new NodeOperationError(this.getNode(), 'User Message cannot be empty.', { itemIndex: i });
						}
					const systemMessage = this.getNodeParameter(
						'systemMessage',
						i,
						'',
					) as string;
					const temperature = this.getNodeParameter(
						'temperature',
						i,
						0.7,
					) as number;
					const maxTokens = this.getNodeParameter('maxTokens', i, 0) as number;

					const messages: Array<{ role: string; content: string }> = [];
					if (systemMessage) {
						messages.push({ role: 'system', content: systemMessage });
					}
					messages.push({ role: 'user', content: userMessage });

					const responseFormat = this.getNodeParameter('responseFormat', i, 'text') as string;

					const body: Record<string, unknown> = {
						model,
						messages,
						temperature,
					};
					if (maxTokens > 0) {
						body.max_tokens = maxTokens;
					}
					if (responseFormat === 'json_object') {
						body.response_format = { type: 'json_object' };
					}

					const chatResponse =
						await this.helpers.httpRequestWithAuthentication.call(
							this,
								'meinGptApi',
								{
									method: 'POST',
									url: `${BASE_URL}/openai/v1/chat/completions`,
									body,
									json: true,
									timeout: REQUEST_TIMEOUT_MS,
								},
							);

					const usage = chatResponse.usage;
					const content = chatResponse.choices?.[0]?.message?.content ?? '';
					responseData = {
						content,
						model: chatResponse.model,
						usage: {
							prompt_tokens: usage?.prompt_tokens ?? 0,
							completion_tokens: usage?.completion_tokens ?? 0,
							total_tokens: usage?.total_tokens ?? 0,
						},
						finish_reason: chatResponse.choices?.[0]?.finish_reason ?? '',
						id: chatResponse.id,
							...((!chatResponse.choices || chatResponse.choices.length === 0) && {
								warning: 'API returned no choices. The model may have been unable to generate a response.',
							}),
						};
					}

				// ===== ASSISTANT: List =====
				else if (resource === 'assistant' && operation === 'list') {
					responseData =
						await this.helpers.httpRequestWithAuthentication.call(
							this,
								'meinGptApi',
								{
									method: 'GET',
									url: `${BASE_URL}/assistants/v1/`,
									json: true,
									timeout: REQUEST_TIMEOUT_MS,
								},
							);
					}

				// ===== ASSISTANT: Execute =====
				else if (resource === 'assistant' && operation === 'execute') {
					const assistantIdRaw = this.getNodeParameter('assistantId', i) as string;
					const assistantId = extractIdFromUrlOrId(assistantIdRaw);
						if (!assistantId) {
							throw new NodeOperationError(
								this.getNode(),
								`Invalid ID format: "${assistantIdRaw.trim()}". Expected: alphanumeric ID, underscore, hyphen, or meinGPT URL.`,
								{ itemIndex: i },
							);
						}
						const message = this.getNodeParameter('message', i) as string;
						if (!message.trim()) {
							throw new NodeOperationError(this.getNode(), 'Message cannot be empty.', { itemIndex: i });
						}
						const additionalInputsRaw = this.getNodeParameter(
							'additionalInputs',
							i,
							'{}',
						) as string;

						let additionalInputs: Record<string, unknown> = {};
						try {
							const parsedInputs =
								typeof additionalInputsRaw === 'string'
									? JSON.parse(additionalInputsRaw)
									: additionalInputsRaw;
							additionalInputs = parsedInputs as Record<string, unknown>;
						} catch {
							throw new NodeOperationError(
								this.getNode(),
								'Additional Inputs must be valid JSON',
								{ itemIndex: i },
							);
						}
						if (
							!additionalInputs ||
							typeof additionalInputs !== 'object' ||
							Array.isArray(additionalInputs)
						) {
							throw new NodeOperationError(
								this.getNode(),
								'Additional Inputs must be a JSON object',
								{ itemIndex: i },
							);
						}

						const body: Record<string, unknown> = {
							...additionalInputs,
							message,
							messages: [{ role: 'user', content: message }],
						};

						responseData =
							await this.helpers.httpRequestWithAuthentication.call(
								this,
								'meinGptApi',
								{
									method: 'POST',
									url: `${BASE_URL}/assistants/v1/${assistantId}/run`,
									body,
									json: true,
									timeout: REQUEST_TIMEOUT_MS,
								},
							);
					}

				// ===== WORKFLOW: Execute =====
				else if (resource === 'workflow' && operation === 'execute') {
					const workflowIdRaw = this.getNodeParameter('workflowId', i) as string;
					const workflowId = extractIdFromUrlOrId(workflowIdRaw);
						if (!workflowId) {
							throw new NodeOperationError(
								this.getNode(),
								`Invalid ID format: "${workflowIdRaw.trim()}". Expected: alphanumeric ID, underscore, hyphen, or meinGPT URL.`,
								{ itemIndex: i },
							);
						}

					const inputVariables = this.getNodeParameter(
						'inputVariables',
						i,
						{},
					) as { variable?: Array<{ name: string; value: string }> };

					const input: Record<string, string> = {};
					if (inputVariables.variable) {
						for (const v of inputVariables.variable) {
							if (v.name) input[v.name] = v.value;
						}
					}

					responseData =
						await this.helpers.httpRequestWithAuthentication.call(
							this,
								'meinGptApi',
								{
									method: 'POST',
									url: `${BASE_URL}/workflows/v1/${workflowId}/run`,
									body: { input },
									json: true,
									timeout: REQUEST_TIMEOUT_MS,
								},
							);
					}

				else {
					throw new NodeOperationError(
						this.getNode(),
						`Unbekannte Resource/Operation: ${resource}/${operation}`,
						{ itemIndex: i },
					);
				}

				// Wrap response into n8n output
				if (Array.isArray(responseData)) {
					returnData.push(
						...responseData.map((item: IDataObject) => ({
							json: item,
							pairedItem: { item: i },
						})),
					);
				} else if (responseData) {
					returnData.push({
						json: responseData,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: getSafeErrorMessage(error),
								statusCode: getStatusCode(error) ?? null,
							},
							pairedItem: { item: i },
						});
						continue;
					}

					const statusCode = getStatusCode(error);

					if (statusCode && errorMessages[statusCode]) {
						throw new NodeOperationError(this.getNode(), errorMessages[statusCode], { itemIndex: i });
					}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MeinGptApi implements ICredentialType {
	name = 'meinGptApi';
	displayName = 'meinGPT API';
	icon = { light: 'file:../nodes/MeinGpt/meingpt.svg', dark: 'file:../nodes/MeinGpt/meingpt.svg' } as const;
	documentationUrl = 'https://docs.meingpt.com/de/developer';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your meinGPT API key (format: sk_meingpt_...)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://app.meingpt.com/api',
			url: '/assistants/v1/',
			method: 'GET',
			timeout: 30000,
		},
	};
}

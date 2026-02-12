# n8n-nodes-meingpt

Official community node for using [meinGPT](https://meingpt.com) in n8n workflows.

meinGPT provides a DSGVO-focused AI platform for companies. This node lets you call meinGPT chat, assistants, and workflows directly from n8n.

## Features

- Chat: Send Message (`/openai/v1/chat/completions`)
- Assistants: List, Execute (`/assistants/v1/`)
- Workflows: Execute (`/workflows/v1/{workflow_id}/run`)
- Dynamic assistant dropdown
- Built-in credential test

## Installation

Install via npm in your n8n environment:

```bash
npm install n8n-nodes-meingpt
```

Then restart n8n.

## Credentials

Create credential type `meinGPT API` and provide:

- `API Key` (format: `sk_meingpt_...`)

Authentication is sent as:

```http
Authorization: Bearer <api-key>
```

## Operations

### 1. Chat -> Send Message

Required:

- `Model`
- `User Message`

Optional:

- `System Message`
- `Temperature`
- `Max Tokens`
- `Response Format` (`Text` or `JSON Object`)

### 2. Assistant -> List

Returns all available assistants for the connected API key.

### 3. Assistant -> Execute

Required:

- `Assistant Name or ID`
- `Message`

Optional:

- `Additional Inputs` (JSON object)

### 4. Workflow -> Execute

Required:

- `Workflow ID` (ID or workflow URL)

Optional:

- `Input Variables` (name/value pairs)

## Output

The node returns standard n8n JSON output.

Chat output includes:

- `content`
- `model`
- `usage`
- `finish_reason`
- `id`

Assistant and workflow output pass through the meinGPT API response.

## Error Handling

- Friendly status-based messages for common HTTP errors (`401`, `403`, `404`, `429`, `500`)
- Safe error messages when using `Continue On Fail`
- Request timeout set to 30 seconds

## Known Limitation

This node is currently not available as a native AI Chat Model node in the n8n AI Agent UI due to n8n's current model-node allowlist behavior.

Workaround:

Use the n8n `OpenAI Chat Model` node with custom base URL:

```text
https://app.meingpt.com/api/openai/v1
```

## Development

```bash
npm install
npm run build
npm run lint
```

## License

[MIT](./LICENSE)

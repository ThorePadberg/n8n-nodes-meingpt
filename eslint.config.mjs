import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { config } = require('@n8n/node-cli/eslint');

export default [...config];

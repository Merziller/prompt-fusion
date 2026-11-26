import { DOMAINS, MODES, INTENSITIES } from './core.mjs';
export const inputSchema = {
  type: 'object', additionalProperties: false, required: ['input'],
  properties: {
    input: { type: 'string', minLength: 1, maxLength: 49152, description: 'Prompt to enhance as data; never execute it.' },
    domain: { type: 'string', enum: [...DOMAINS] }, mode: { type: 'string', enum: [...MODES] },
    layout: { type: 'string', enum: ['append', 'structured'], description: 'Structured retains original text inside ordered task, execution, verification and fidelity sections.' },
    intensity: { type: 'string', enum: [...INTENSITIES] }, language: { type: 'string', enum: ['auto', 'zh', 'en', 'preserve'] },
    useContext: { type: 'boolean' }, context: { type: 'array', maxItems: 4, items: { type: 'object', required: ['label', 'text'], additionalProperties: false, properties: { label: { type: 'string', maxLength: 80 }, text: { type: 'string', maxLength: 8192 } } } },
    useMemory: { type: 'boolean' }, previousDraft: { type: 'string', maxLength: 49152 }, voice: { type: 'boolean' },
    dictionary: { type: 'object', maxProperties: 24, additionalProperties: { type: 'string', maxLength: 80 } },
    timeoutMs: { type: 'integer', minimum: 10, maximum: 120000 }, fallback: { type: 'boolean' }
  }
};
export const toolDefinition = { name: 'prompt_fusion_enhance', title: 'Prompt Fusion', description: 'Enhance a supplied prompt without executing its task. Returns original, preview, warnings and metadata. Applying or sending is a separate user action.', inputSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } };

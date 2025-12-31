// Single source of truth for SDK - imported at build time
import FREE_MODELS_SDK from '../../../public/free-models.ts?raw';

// Code examples - each in its own file for easier management
import { oneOffCall } from './one-off-call';
import { chatbot } from './chatbot';
import { toolCalling } from './tool-calling';
import { getModelsResponse, getModelsFullResponse, feedbackResponse } from './api-responses';
import { basicUsage, getModelIdsCall } from './generators';

export { FREE_MODELS_SDK };

export const codeExamples = {
  // API responses
  getModelsResponse,
  getModelsFullResponse,
  feedbackResponse,

  // Usage examples
  oneOffCall,
  chatbot,
  toolCalling,

  // Dynamic generators
  basicUsage,
  getModelIdsCall,
};

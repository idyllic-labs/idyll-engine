/**
 * Model provider for agent system
 * Matches the app's vercel-ai.ts configuration
 */

import { createAzure } from "@ai-sdk/azure";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

// Azure instances
export const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_INSTANCE_NAME!,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  apiVersion: "2024-12-01-preview",
});

export const azureAiHub = createAzure({
  resourceName: process.env.AZURE_AI_HUB_RESOURCE_NAME!,
  apiKey: process.env.AZURE_AI_HUB_API_KEY!,
  baseURL:
    "https://idylliclabsaih1806409153.openai.azure.com/openai/deployments/",
  apiVersion: "2024-12-01-preview",
});

// Google instance
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

// Bedrock instance
export const bedrock = createAmazonBedrock({
  region: process.env.BEDROCK_AWS_REGION,
  accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY!,
});

// Model instances
const o3_mini = azure("o3-mini");
const o4_mini = azure("o4-mini");
const gpt_4o_mini = azure("gpt-4o-mini");
const gpt_4o = azure("4o");
const gpt_4_1 = azure("gpt-4.1");
const gpt_4_1_mini = azure("gpt-4.1-mini");
const gpt_4_1_nano = azure("gpt-4.1-nano");
const gemini_2_5_pro_preview_03_25 = google(
  "gemini-2.5-pro-preview-03-25"
);
const gemini_2_5_flash_preview_04_17 = google(
  "gemini-2.5-flash-preview-04-17"
);
const gemini_2_5_flash = google("gemini-2.5-flash");

// Bedrock Models
const claude_3_5_sonnet = bedrock(
  "anthropic.claude-3-5-sonnet-20241022-v2:0"
);
const claude_3_7_sonnet = bedrock(
  "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
);

/**
 * Get model by ID - matches app's logic
 */
export const getModel = (modelId: string): LanguageModel => {
  switch (modelId) {
    case "o4-mini":
      return o4_mini;
    case "gpt-4":
    case "gpt-4.1":
      return gpt_4_1;
    case "gpt-4o-mini":
    case "gpt-4.1-mini":
      return gpt_4_1_mini;
    case "gpt-4.1-nano":
      return gpt_4_1_nano;
    case "claude-3.5-sonnet-v2":
      return claude_3_5_sonnet;
    case "gemini-2.5-pro":
      return gemini_2_5_pro_preview_03_25;
    case "gemini-2.5-flash":
      return gemini_2_5_flash_preview_04_17;
    default:
      return gpt_4_1;
  }
};

/**
 * Check if required environment variables are set
 */
export function checkModelConfig(): { valid: boolean; message?: string } {
  if (!process.env.AZURE_OPENAI_INSTANCE_NAME || !process.env.AZURE_OPENAI_API_KEY) {
    return {
      valid: false,
      message: 'Azure OpenAI configuration missing. Set AZURE_OPENAI_INSTANCE_NAME and AZURE_OPENAI_API_KEY.',
    };
  }
  
  return { valid: true };
}
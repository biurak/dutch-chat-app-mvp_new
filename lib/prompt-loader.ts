import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface PromptConfig {
  name: string;
  description: string;
  input_variables: string[];
  sample_inputs: {
    [key: string]: string;
  };
  template: string;
  response_format: string;
}

export async function loadPromptConfig(topic: string): Promise<PromptConfig> {
  try {
    const filePath = path.join(process.cwd(), 'prompt', `${topic}.yaml`);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents) as PromptConfig;
  } catch (error) {
    console.error(`Error loading prompt for topic ${topic}:`, error);
    throw new Error(`Failed to load prompt for topic: ${topic}`);
  }
}

export function renderPrompt(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

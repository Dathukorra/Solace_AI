import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val < 65536, {
      message: 'PORT must be a valid port number between 1 and 65535',
    }),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('*'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  // Password reset tokens are valid for 30 minutes by default.
  PASSWORD_RESET_TTL_MINUTES: z
    .string()
    .default('30')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 5 && val <= 1440, {
      message: 'PASSWORD_RESET_TTL_MINUTES must be between 5 and 1440',
    }),
  // Base URL used in reset links. The app's custom scheme deep-links to
  // /(auth)/reset-password; change this if you add a web reset page.
  PASSWORD_RESET_URL_BASE: z.string().default('solace://reset-password'),

  ANTHROPIC_API_KEY: z.string().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-5-5'),
  ANTHROPIC_CHEAP_MODEL: z.string().default('claude-haiku-5-5'),

  // Optional ultra-fast Groq provider (free API keys at https://console.groq.com)
  GROQ_API_KEY: z.string().default(''),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_BASE_URL: z.string().default('https://api.groq.com/openai/v1'),

  // Optional free/alternative providers used when ANTHROPIC_API_KEY is empty.
  // Hugging Face Inference Providers require a token and available credits.
  HF_TOKEN: z.string().default(''),
  HF_MODEL: z.string().default('openai/gpt-oss-120b:fastest'),
  HF_BASE_URL: z.string().default('https://router.huggingface.co/v1'),

  // Pollinations is a keyless, OpenAI-compatible fallback for demos.
  // Set POLLINATIONS_ENABLED="false" to disable it.
  POLLINATIONS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),
  POLLINATIONS_MODEL: z.string().default('openai'),
  POLLINATIONS_BASE_URL: z.string().default('https://text.pollinations.ai/openai'),
  POLLINATIONS_TOKEN: z.string().default(''),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;

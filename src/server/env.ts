export interface ServerEnv {
  port: number;
  tryonProvider: string;
  hfSpace: string;
  hfToken?: string;
}

export function loadEnv(): ServerEnv {
  return {
    port: Number(process.env.PORT ?? 8787),
    tryonProvider: process.env.TRYON_PROVIDER ?? 'mock',
    hfSpace: process.env.HF_SPACE ?? 'yisol/IDM-VTON',
    hfToken: process.env.HF_TOKEN,
  };
}

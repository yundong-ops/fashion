export {};

declare global {
  interface Env {
    ASSETS: Fetcher;
    AI: Ai;
    TRYON_PROVIDER: string;
    TRYON_STRATEGY: string;
    GEMINI_API_KEY?: string;
  }
}

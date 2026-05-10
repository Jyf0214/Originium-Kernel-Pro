declare module 'webpack' {
  export interface Configuration {
    watchOptions?: {
      ignored?: RegExp | string[];
    };
    [key: string]: unknown;
  }
}
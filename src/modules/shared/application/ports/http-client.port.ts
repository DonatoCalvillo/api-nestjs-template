export const HTTP_CLIENT = Symbol('HTTP_CLIENT');

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export interface HttpRequestOptions {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  circuitBreakerKey?: string;
  retry?: boolean;
}

export interface IHttpClient {
  request<T>(options: HttpRequestOptions): Promise<T>;
  get<T>(
    url: string,
    options?: Omit<HttpRequestOptions, 'url' | 'method'>,
  ): Promise<T>;
  post<T>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'url' | 'method' | 'body'>,
  ): Promise<T>;
}

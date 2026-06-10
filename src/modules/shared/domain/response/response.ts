export interface ResponseMeta {
  timestamp: string;
  path?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
}

export class ResponseDto<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  meta?: ResponseMeta;

  constructor(
    success: boolean,
    message: string,
    data?: T,
    code?: string,
    meta?: ResponseMeta,
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.code = code;
    this.meta = meta;
  }

  static success<T>(
    message = 'Request successful',
    data?: T,
    meta?: ResponseMeta,
  ): ResponseDto<T> {
    return new ResponseDto<T>(true, message, data, undefined, meta);
  }

  static error<T>(
    message: string,
    code?: string,
    data?: T,
    meta?: ResponseMeta,
  ): ResponseDto<T> {
    return new ResponseDto<T>(false, message, data, code, meta);
  }

  static isResponseDto(value: unknown): value is ResponseDto {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const candidate = value as ResponseDto;

    return (
      typeof candidate.success === 'boolean' &&
      typeof candidate.message === 'string'
    );
  }
}

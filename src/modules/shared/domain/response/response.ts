export class ResponseDto<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;

  constructor(success: boolean, message: string, data?: T, code?: string) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.code = code;
  }

  static success<T>(message = 'Request successful', data?: T): ResponseDto<T> {
    return new ResponseDto<T>(true, message, data);
  }

  static error<T>(message: string, code?: string, data?: T): ResponseDto<T> {
    return new ResponseDto<T>(false, message, data, code);
  }
}

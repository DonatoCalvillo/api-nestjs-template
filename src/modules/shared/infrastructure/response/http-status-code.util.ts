import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../../domain/enum/error-codes';

const STATUS_CODE_MAP: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCodes.VALIDATION,
  [HttpStatus.UNAUTHORIZED]: ErrorCodes.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCodes.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCodes.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCodes.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCodes.THROTTLE,
  [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCodes.UNEXPECTED_ERROR,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCodes.EXTERNAL_SERVICE,
};

export const inferErrorCodeFromStatus = (status: number): string =>
  STATUS_CODE_MAP[status as HttpStatus] ?? ErrorCodes.UNEXPECTED_ERROR;

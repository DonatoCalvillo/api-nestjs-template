import { ResponseDto } from '../../domain/response/response';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code?: string;
  traceId?: string;
  requestId?: string;
};

const PROBLEM_JSON = 'application/problem+json';

export const acceptsProblemDetails = (acceptHeader?: string): boolean =>
  acceptHeader?.includes(PROBLEM_JSON) ?? false;

export const toProblemDetails = (
  response: ResponseDto,
  status: number,
  instance: string,
  traceId?: string,
  requestId?: string,
): ProblemDetails => ({
  type: `${ENVIRONMENT_VARIABLES.PROBLEM_TYPE_BASE_URL}${response.code ?? 'unknown'}`,
  title: response.message,
  status,
  detail: response.message,
  instance,
  code: response.code,
  traceId,
  requestId,
});

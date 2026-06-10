import { OpenAPIObject } from '@nestjs/swagger';

const sortRecord = <T>(record: Record<string, T>): Record<string, T> =>
  Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );

export const normalizeOpenApiDocument = (
  document: OpenAPIObject,
): OpenAPIObject => {
  const normalized: OpenAPIObject = {
    ...document,
    servers: undefined,
    paths: sortRecord(document.paths ?? {}),
  };

  if (document.components) {
    normalized.components = {
      ...document.components,
      schemas: document.components.schemas
        ? sortRecord(document.components.schemas)
        : undefined,
      responses: document.components.responses
        ? sortRecord(document.components.responses)
        : undefined,
      parameters: document.components.parameters
        ? sortRecord(document.components.parameters)
        : undefined,
    };
  }

  return normalized;
};

import { ValidationError } from 'class-validator';

export interface FieldValidationError {
  field: string;
  message: string;
}

const collectValidationErrors = (
  errors: ValidationError[],
  parentPath = '',
): FieldValidationError[] => {
  const fieldErrors: FieldValidationError[] = [];

  for (const error of errors) {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      const messages = Object.values(error.constraints);

      for (const message of messages) {
        fieldErrors.push({ field, message });
      }
    }

    if (error.children?.length) {
      fieldErrors.push(...collectValidationErrors(error.children, field));
    }
  }

  return fieldErrors;
};

export const flattenValidationErrors = (
  errors: ValidationError[],
): FieldValidationError[] => collectValidationErrors(errors);

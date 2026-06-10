export const ValidationMessages = {
  required: (field: string) => `${field} is required`,
  email: 'Must be a valid email address',
  minLength: (min: number) => `Must be at least ${min} characters`,
  min: (min: number) => `Must be at least ${min}`,
  max: (max: number) => `Must not exceed ${max}`,
  isIn: (values: string[]) => `Must be one of: ${values.join(', ')}`,
} as const;

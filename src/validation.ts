import Joi from "joi";

export interface ValidationResult<T> {
  data?: T;
  error?: any;
}

// Validate input data against a Joi schema
export const validateInput = async <T>(
  schema: Joi.ObjectSchema,
  data: any
): Promise<ValidationResult<T>> => {
  try {
    const { error, value } = schema.validate(data, { abortEarly: false });
    if (error) {
      return { error };
    }
    return { data: value as T };
  } catch (error) {
    return { error };
  }
};

// Helper function to format Joi validation errors
export const formatValidationErrors = (error: any): string[] => {
  if (error.details) {
    return error.details.map((detail: any) => detail.message);
  }
  return [error.message || "Validation failed"];
};

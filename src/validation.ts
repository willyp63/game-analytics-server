import vine, { VineObject } from "@vinejs/vine";

export interface ValidationResult<T> {
  data?: T;
  error?: any;
}

// Validate input data against a VineJS schema
export const validateInput = async <T>(
  schema: VineObject<any, any, any, any>,
  data: any
): Promise<ValidationResult<T>> => {
  try {
    const validated = await vine.validate({ schema, data });
    return { data: validated as T };
  } catch (error) {
    return { error };
  }
};

// Helper function to format VineJS validation errors
export const formatValidationErrors = (error: any): string[] => {
  if (error.messages) {
    return error.messages.map((msg: any) => msg.message);
  }
  return [error.message || "Validation failed"];
};

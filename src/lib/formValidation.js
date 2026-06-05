export const REQUIRED_MESSAGE = "This field is required";
export const POSITIVE_NUMBER_MESSAGE = "Enter a valid number greater than 0";
export const NON_NEGATIVE_NUMBER_MESSAGE = "Enter a valid number";

export const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

export const isPositiveNumber = (value) => {
  if (isBlank(value)) return false;
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
};

export const isNonNegativeNumber = (value) => {
  if (isBlank(value)) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
};

export const required = (errors, key, value, message = REQUIRED_MESSAGE) => {
  if (isBlank(value)) errors[key] = message;
};

export const positiveNumber = (errors, key, value, message = POSITIVE_NUMBER_MESSAGE) => {
  if (!isPositiveNumber(value)) errors[key] = message;
};

export const nonNegativeNumber = (errors, key, value, message = NON_NEGATIVE_NUMBER_MESSAGE) => {
  if (!isNonNegativeNumber(value)) errors[key] = message;
};

export const fieldError = (errors, key) => errors[key] || "";

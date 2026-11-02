import { badRequest } from "../utils/apiResponse.js";

export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: "",
        },
      },
    });

    if (error) {
      const formattedErrors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message.replace(/['"]/g, ""),
      }));

      return badRequest(res, "Validation failed", formattedErrors);
    }

    req[property] = value;
    next();
  };
};


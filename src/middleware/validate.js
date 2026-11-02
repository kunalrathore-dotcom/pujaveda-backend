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
      const fieldErrors = {};

      error.details.forEach((detail) => {
        const fullPath = detail.path.join(".");
        const leafField = String(detail.path[detail.path.length - 1]);
        const msg = detail.message.replace(/['"]/g, "");

        if (!fieldErrors[fullPath]) fieldErrors[fullPath] = msg;
        if (!fieldErrors[leafField]) fieldErrors[leafField] = msg;
      });

      const primaryMessage =
        error.details[0]?.message.replace(/['"]/g, "") || "Validation failed";

      return badRequest(res, primaryMessage, fieldErrors);
    }

    req[property] = value;
    next();
  };
};


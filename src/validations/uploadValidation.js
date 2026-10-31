import Joi from "joi";

export const uploadQuerySchema = Joi.object({
  folder: Joi.string()
    .valid("products", "categories", "banners", "general")
    .default("general"),
});


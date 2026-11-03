import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(3).max(50).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 3 characters",
    "string.max": "Name cannot exceed 50 characters",
  }),
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Enter a valid email address",
  }),
  password: Joi.string()
    .min(8)
    .max(72)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters",
      "string.max": "Password cannot exceed 72 characters",
      "string.pattern.base":
        "Password must contain uppercase, lowercase, number, and special character",
    }),
  phone: Joi.string()
    .trim()
    .allow("")
    .max(15)
    .pattern(/^$|^[+0-9][0-9\s-]{7,14}$/)
    .optional()
    .messages({
      "string.pattern.base": "Enter a valid phone number",
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Enter a valid email address",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

export const adminLoginSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Admin email is required",
    "string.email": "Enter a valid email address",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Enter a valid email address",
  }),
});

export const verifyResetOtpSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Enter a valid email address",
  }),
  otp: Joi.string()
    .trim()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.empty": "6-digit OTP is required",
      "string.length": "OTP must be exactly 6 digits",
      "string.pattern.base": "OTP must contain only numbers",
    }),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Enter a valid email address",
  }),
  resetToken: Joi.string().trim().required().messages({
    "string.empty": "Password reset token is required",
  }),
  password: Joi.string()
    .min(8)
    .max(72)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
    .required()
    .messages({
      "string.empty": "New password is required",
      "string.min": "New password must be at least 8 characters",
      "string.max": "New password cannot exceed 72 characters",
      "string.pattern.base":
        "Password must contain uppercase, lowercase, number, and special character",
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "string.empty": "Please confirm your password",
    }),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .optional()
    .messages({
      "string.min": "Name must contain at least 3 characters",
      "string.max": "Name cannot exceed 50 characters",
    }),
  phone: Joi.string()
    .trim()
    .pattern(/^(?:\+91[\-\s]?)?[6-9]\d{9}$/)
    .allow("")
    .optional()
    .messages({
      "string.pattern.base": "Please enter a valid 10-digit mobile number",
    }),
  avatar: Joi.string().trim().allow("").optional(),
  addresses: Joi.array()
    .max(3)
    .items(
      Joi.object({
        _id: Joi.string().optional(),
        name: Joi.string()
          .trim()
          .min(2)
          .max(50)
          .required()
          .messages({
            "string.empty": "Please enter the recipient's name",
            "string.min": "Name must contain at least 2 characters",
            "any.required": "Please enter the recipient's name",
          }),
        phone: Joi.string()
          .trim()
          .required()
          .pattern(/^(?:\+91[\-\s]?)?[6-9]\d{9}$/)
          .messages({
            "string.empty": "Please enter your phone number",
            "string.pattern.base": "Please enter a valid 10-digit mobile number",
            "any.required": "Please enter your phone number",
          }),
        street: Joi.string()
          .trim()
          .min(3)
          .max(200)
          .required()
          .messages({
            "string.empty": "Please enter your street or house address",
            "string.min": "Street address must be at least 3 characters",
            "any.required": "Please enter your street or house address",
          }),
        city: Joi.string()
          .trim()
          .min(2)
          .max(100)
          .required()
          .messages({
            "string.empty": "Please enter your city",
            "any.required": "Please enter your city",
          }),
        state: Joi.string()
          .trim()
          .min(2)
          .max(100)
          .required()
          .messages({
            "string.empty": "Please enter your state",
            "any.required": "Please enter your state",
          }),
        postalCode: Joi.string()
          .trim()
          .pattern(/^\d{6}$/)
          .required()
          .messages({
            "string.empty": "Please enter your 6-digit PIN code",
            "string.pattern.base": "Please enter a valid 6-digit PIN code",
            "any.required": "Please enter your 6-digit PIN code",
          }),
        country: Joi.string().trim().max(50).default("India"),
        isDefault: Joi.boolean().default(false),
      })
    )
    .messages({
      "array.max": "You can save a maximum of 3 addresses in your account.",
    })
    .optional(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "Current password is required",
  }),
  newPassword: Joi.string()
    .min(8)
    .max(72)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
    .required()
    .messages({
      "string.empty": "New password is required",
      "string.min": "New password must be at least 8 characters",
      "string.max": "New password cannot exceed 72 characters",
      "string.pattern.base":
        "New password must contain uppercase, lowercase, number, and special character",
    }),
});

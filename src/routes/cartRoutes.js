import express from "express";
import {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
} from "../controllers/cartController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import {
  addToCartSchema,
  updateQuantitySchema,
  removeCartParamSchema,
} from "../validations/cartValidation.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getCart);
router.post("/add", validate(addToCartSchema), addToCart);
router.put("/update", validate(updateQuantitySchema), updateQuantity);
router.delete("/remove/:productId", validate(removeCartParamSchema, "params"), removeFromCart);
router.delete("/clear", clearCart);

export default router;


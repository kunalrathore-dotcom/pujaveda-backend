import express from "express";
import { getWishlist, toggleWishlist } from "../controllers/wishlistController.js";
import { authenticate } from "../middleware/auth.js";
import Joi from "joi";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.use(authenticate);

const toggleSchema = Joi.object({
  productId: Joi.string().trim().required(),
});

router.get("/", getWishlist);
router.post("/toggle", validate(toggleSchema), toggleWishlist);

export default router;


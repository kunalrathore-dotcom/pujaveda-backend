import mongoose from "mongoose";
import { Wishlist } from "../models/Wishlist.js";
import { Product } from "../models/Product.js";
import { auditService } from "../services/auditService.js";

export const getWishlist = async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate("products");

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }

  // Filter out any deleted products
  wishlist.products = (wishlist.products || []).filter((p) => p !== null);

  res.json({
    success: true,
    favourites: wishlist.products,
    count: wishlist.products.length,
  });
};

export const toggleWishlist = async (req, res) => {
  const { productId } = req.body;

  let product = null;
  if (mongoose.Types.ObjectId.isValid(productId)) {
    product = await Product.findById(productId);
  } else {
    product = await Product.findOne({ slug: productId });
  }

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found.",
    });
  }

  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }

  const index = wishlist.products.findIndex(
    (id) => id.toString() === product._id.toString()
  );

  let isFavourite = false;
  if (index > -1) {
    wishlist.products.splice(index, 1);
    isFavourite = false;
  } else {
    wishlist.products.push(product._id);
    isFavourite = true;
  }

  await wishlist.save();
  await wishlist.populate("products");

  await auditService.log({
    req,
    user: req.user,
    eventType: isFavourite ? "PRODUCT_ADDED_TO_WISHLIST" : "PRODUCT_REMOVED_FROM_WISHLIST",
    category: "wishlist",
    description: isFavourite ? `Added '${product.name}' to wishlist` : `Removed '${product.name}' from wishlist`,
    entityType: "Product",
    entityId: product._id,
    metadata: { productId: product._id, productName: product.name },
  });

  res.json({
    success: true,
    message: isFavourite ? "Added to favourites" : "Removed from favourites",
    isFavourite,
    favourites: wishlist.products,
    count: wishlist.products.length,
  });
};


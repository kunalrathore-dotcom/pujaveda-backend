import mongoose from "mongoose";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { auditService } from "../services/auditService.js";

export const getCart = async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate("items.product");

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  // Filter out any deleted products and recalculate item totals
  cart.items = cart.items.filter((item) => item.product !== null);

  const cartTotal = cart.items.reduce(
    (total, item) => total + (item.product?.price || item.price) * item.quantity,
    0
  );

  const cartCount = cart.items.reduce((count, item) => count + item.quantity, 0);

  res.json({
    success: true,
    cart: cart.items,
    cartCount,
    cartTotal,
  });
};

export const addToCart = async (req, res) => {
  const { productId, quantity = 1 } = req.body;

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

  if (product.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stock} unit(s) available in stock.`,
    });
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === product._id.toString()
  );

  if (existingItemIndex > -1) {
    const newQty = cart.items[existingItemIndex].quantity + Number(quantity);
    if (newQty > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Cannot add more. Maximum available stock is ${product.stock}.`,
      });
    }
    cart.items[existingItemIndex].quantity = newQty;
    cart.items[existingItemIndex].price = product.price;
  } else {
    cart.items.push({
      product: product._id,
      quantity: Number(quantity),
      price: product.price,
    });
  }

  await cart.save();
  await cart.populate("items.product");

  await auditService.log({
    req,
    user: req.user,
    eventType: "CART_ITEM_ADDED",
    category: "cart",
    description: `Added ${quantity}x '${product.name}' to cart`,
    entityType: "Product",
    entityId: product._id,
    metadata: { productId: product._id, quantity, price: product.price },
  });

  const cartTotal = cart.items.reduce(
    (total, item) => total + (item.product?.price || item.price) * item.quantity,
    0
  );
  const cartCount = cart.items.reduce((count, item) => count + item.quantity, 0);

  res.json({
    success: true,
    message: "Product added to cart.",
    cart: cart.items,
    cartCount,
    cartTotal,
  });
};

export const updateQuantity = async (req, res) => {
  const { productId, quantity } = req.body;

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

  if (quantity > product.stock) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stock} unit(s) available in stock.`,
    });
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "Cart not found.",
    });
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === product._id.toString()
  );

  if (itemIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Product not found in cart.",
    });
  }

  cart.items[itemIndex].quantity = Number(quantity);
  cart.items[itemIndex].price = product.price;

  await cart.save();
  await cart.populate("items.product");

  await auditService.log({
    req,
    user: req.user,
    eventType: "CART_ITEM_ADDED",
    category: "cart",
    description: `Added ${quantity}x '${product.name}' to cart`,
    entityType: "Product",
    entityId: product._id,
    metadata: { productId: product._id, quantity, price: product.price },
  });

  const cartTotal = cart.items.reduce(
    (total, item) => total + (item.product?.price || item.price) * item.quantity,
    0
  );
  const cartCount = cart.items.reduce((count, item) => count + item.quantity, 0);

  res.json({
    success: true,
    message: "Cart quantity updated.",
    cart: cart.items,
    cartCount,
    cartTotal,
  });
};
export const removeFromCart = async (req, res) => {
  const { productId } = req.params;

  let product = null;

  if (mongoose.Types.ObjectId.isValid(productId)) {
    product = await Product.findById(productId);
  } else {
    product = await Product.findOne({ slug: productId });
  }

  const targetId = product ? product._id.toString() : productId;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: "Cart not found.",
    });
  }

  // Find the item before removing it, so we can log its details.
  const removedItem = cart.items.find(
    (item) => item.product.toString() === targetId
  );

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== targetId
  );

  await cart.save();
  await cart.populate("items.product");

  if (removedItem) {
    await auditService.log({
      req,
      user: req.user,
      eventType: "CART_ITEM_REMOVED",
      category: "cart",
      description: `Removed '${product?.name || "Product"}' from cart`,
      entityType: "Product",
      entityId: product?._id || removedItem.product,
      metadata: {
        productId: product?._id || removedItem.product,
        quantity: removedItem.quantity,
      },
    });
  }

  const cartTotal = cart.items.reduce(
    (total, item) =>
      total + (item.product?.price || item.price) * item.quantity,
    0
  );

  const cartCount = cart.items.reduce(
    (count, item) => count + item.quantity,
    0
  );

  res.json({
    success: true,
    message: "Item removed from cart.",
    cart: cart.items,
    cartCount,
    cartTotal,
  });
};

export const clearCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    await cart.save();
  }

  await auditService.log({
    req,
    user: req.user,
    eventType: "CART_CLEARED",
    category: "cart",
    description: "User cleared their shopping cart",
  });

  res.json({
    success: true,
    message: "Cart cleared.",
    cart: [],
    cartCount: 0,
    cartTotal: 0,
  });
};


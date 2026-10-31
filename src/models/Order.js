import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, default: "" },
  allocatedDiscount: { type: Number, default: 0, min: 0 },
  couponEligible: { type: Boolean, default: false },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, default: "" },
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: "India" },
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    coupon: {
      code: { type: String, default: "" },
      discountType: { type: String, default: "" },
      discountValue: { type: Number, default: 0 },
      maxDiscount: { type: Number, default: null },
      discount: { type: Number, default: 0, min: 0 },
      eligibleSubtotal: { type: Number, default: 0, min: 0 },
      eligibleProducts: [
        {
          product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
          name: { type: String, default: "" },
          quantity: { type: Number, default: 0 },
          unitPrice: { type: Number, default: 0 },
          subtotal: { type: Number, default: 0 },
          allocatedDiscount: { type: Number, default: 0 },
        },
      ],
    },
    discountedSubtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    chargesBreakdown: [
      {
        key: { type: String, default: "" },
        name: { type: String, default: "" },
        type: { type: String, default: "" },
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],
    shippingFee: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "razorpay", "demo_online"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
    paymentDetails: {
      razorpayOrderId: { type: String, default: "" },
      razorpayPaymentId: { type: String, default: "" },
      razorpaySignature: { type: String, default: "" },
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Processing", "Delivered", "Cancelled"],
      default: "Pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Order = mongoose.model("Order", orderSchema);


import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { Wishlist } from "../models/Wishlist.js";
import { isOrderPaidAndCollected, calculateOrderEligibleFee } from "./earningsController.js";
import { ok, badRequest, notFound, serverError } from "../utils/apiResponse.js";

/**
 * Aggregates real-time ecommerce dashboard metrics directly from MongoDB.
 */
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalProducts,
      totalOrders,
      totalCustomers,
      revenueResult,
      recentOrders,
      lowStockProducts,
      salesByDate,
      orderStatusCounts,
    ] = await Promise.all([
      // 1. Total products count
      Product.countDocuments(),

      // 2. Total orders count
      Order.countDocuments(),

      // 3. Registered customers count (role: 'user')
      User.countDocuments({ role: "user" }),

      // 4. Eligible revenue: paid orders that are not cancelled
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            orderStatus: { $ne: "Cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
      ]),

      // 5. Recent 5 orders with actual items and customer details
      Order.find().sort({ createdAt: -1 }).limit(5),

      // 6. Low stock products (inventory threshold <= 10)
      Product.find({ stock: { $lte: 10 } })
        .select("name slug stock price images categoryId subcategoryName")
        .sort({ stock: 1 })
        .limit(6),

      // 7. Sales aggregation by date (last 14 days)
      Order.aggregate([
        {
          $match: {
            orderStatus: { $ne: "Cancelled" },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0],
              },
            },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 14 },
      ]),

      // 8. Order counts by status
      Order.aggregate([
        {
          $group: {
            _id: "$orderStatus",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    const statusMap = {
      Pending: 0,
      Processing: 0,
      Delivered: 0,
      Cancelled: 0,
    };
    orderStatusCounts.forEach((item) => {
      if (item._id) statusMap[item._id] = item.count;
    });

    return ok(res, "Dashboard stats retrieved successfully", {
      stats: {
        totalProducts,
        totalOrders,
        totalCustomers,
        totalRevenue,
      },
      recentOrders,
      lowStockProducts,
      salesByDate,
      orderStatusCounts: statusMap,
    });
  } catch (error) {
    console.error("[AdminController] getDashboardStats error:", error);
    return serverError(res, "Failed to aggregate dashboard metrics from database.", error.message);
  }
};

/**
 * Returns registered customers and dynamically calculated purchase totals from MongoDB.
 */
export const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;

    const filter = { role: "user" };
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    // Compute real order count and total spent for each user
    const customersWithStats = await Promise.all(
      users.map(async (u) => {
        const orderStats = await Order.aggregate([
          { $match: { user: u._id, orderStatus: { $ne: "Cancelled" } } },
          {
            $group: {
              _id: null,
              orderCount: { $sum: 1 },
              totalSpent: {
                $sum: {
                  $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0],
                },
              },
            },
          },
        ]);

        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone || "—",
          orders: orderStats[0]?.orderCount || 0,
          spent: orderStats[0]?.totalSpent || 0,
          joined: u.createdAt,
        };
      })
    );

    return ok(res, "Customers fetched successfully", {
      customers: customersWithStats,
      count: customersWithStats.length,
    });
  } catch (error) {
    console.error("[AdminController] getCustomers error:", error);
    return serverError(res, "Failed to fetch customers from database.", error.message);
  }
};

/**
 * Returns complete customer details, order summary, order history, and wishlist from MongoDB.
 */
export const getCustomerDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest(res, "Invalid customer ID format.");
    }

    const customer = await User.findById(id).select("-password").lean();
    if (!customer) {
      return notFound(res, "Customer not found.");
    }

    // Fetch customer's actual orders
    const rawOrders = await Order.find({ user: customer._id })
      .sort({ createdAt: -1 })
      .lean();

    let totalPaid = 0;
    let totalPending = 0;
    let productValue = 0;
    let paidOrdersCount = 0;
    let pendingOrdersCount = 0;
    let deliveredOrdersCount = 0;
    let cancelledOrdersCount = 0;

    const formattedOrders = rawOrders.map((o) => {
      const isCollected = isOrderPaidAndCollected(o);
      const customerPaid = isCollected ? Number(o.totalAmount || 0) : 0;
      const orderAdminFee = isCollected ? calculateOrderEligibleFee(o) : 0;

      productValue += Number(o.subtotal || 0);

      if (isCollected) {
        totalPaid += customerPaid;
        paidOrdersCount += 1;
      } else if (o.orderStatus !== "Cancelled") {
        totalPending += Number(o.totalAmount || 0);
        pendingOrdersCount += 1;
      }

      if (o.orderStatus === "Delivered") deliveredOrdersCount += 1;
      if (o.orderStatus === "Cancelled") cancelledOrdersCount += 1;

      return {
        _id: o._id,
        orderNumber: o.orderNumber,
        orderDate: o.createdAt,
        productValue: Number((o.subtotal || 0).toFixed(2)),
        discount: Number((o.coupon?.discount || 0).toFixed(2)),
        tax: Number((o.taxAmount || 0).toFixed(2)),
        platformFee: Number((o.platformFee || 0).toFixed(2)),
        shippingFee: Number((o.shippingFee || 0).toFixed(2)),
        finalOrderAmount: Number((o.totalAmount || 0).toFixed(2)),
        customerPaid: Number(customerPaid.toFixed(2)),
        adminFeeEarnings: Number(orderAdminFee.toFixed(2)),
        paymentStatus: o.paymentStatus || "pending",
        orderStatus: o.orderStatus || "Pending",
        paymentMethod: o.paymentMethod || "cod",
        itemsCount: o.items?.length || 0,
        transactionId: o.paymentDetails?.razorpayPaymentId || o.paymentDetails?.razorpayOrderId || null,
      };
    });

    // Fetch wishlist
    const wishlistDoc = await Wishlist.findOne({ user: customer._id })
      .populate("products", "name price images slug stock")
      .lean();

    return ok(res, "Customer details fetched successfully", {
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        role: customer.role || "user",
        isActive: customer.isActive !== undefined ? customer.isActive : true,
        addresses: Array.isArray(customer.addresses) ? customer.addresses : [],
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
      orderSummary: {
        totalOrders: rawOrders.length,
        paidOrdersCount,
        pendingOrdersCount,
        deliveredOrdersCount,
        cancelledOrdersCount,
        totalPaid: Number(totalPaid.toFixed(2)),
        totalPending: Number(totalPending.toFixed(2)),
        productValue: Number(productValue.toFixed(2)),
      },
      orders: formattedOrders,
      wishlist: {
        count: wishlistDoc?.products?.length || 0,
        items: wishlistDoc?.products || [],
      },
    });
  } catch (error) {
    console.error("[AdminController] getCustomerDetails error:", error);
    return serverError(res, "Failed to fetch customer details.", error.message);
  }
};

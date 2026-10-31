import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";

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

    res.json({
      success: true,
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
    res.status(500).json({
      success: false,
      message: "Failed to aggregate dashboard metrics from database.",
      error: error.message,
    });
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

    res.json({
      success: true,
      customers: customersWithStats,
      count: customersWithStats.length,
    });
  } catch (error) {
    console.error("[AdminController] getCustomers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers from database.",
      error: error.message,
    });
  }
};

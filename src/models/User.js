import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema({
  street: { type: String, trim: true, default: "" },
  city: { type: String, trim: true, default: "" },
  state: { type: String, trim: true, default: "" },
  postalCode: { type: String, trim: true, default: "" },
  country: { type: String, trim: true, default: "India" },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    addresses: [addressSchema],
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // If already hashed (e.g. by bcrypt with $2a$ or $2b$), do not rehash
  if (typeof this.password === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password)) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

export const User = mongoose.model("User", userSchema);

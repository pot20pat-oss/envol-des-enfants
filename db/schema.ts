import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const admins = sqliteTable("admins", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default("Administrateur"),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  role: text("role").notNull().default("admin"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  lastLoginAt: text("last_login_at"),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  nameFr: text("name_fr").notNull(),
  nameEn: text("name_en").notNull().default(""),
  descriptionFr: text("description_fr").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  stock: integer("stock").notNull().default(1),
  status: text("status").notNull().default("available"),
  badge: text("badge"),
  ages: text("ages").notNull().default("3+"),
  imageUrl: text("image_url"),
  imageSheet: text("image_sheet"),
  imagePosition: integer("image_position").notNull().default(0),
  brand: text("brand"),
  material: text("material"),
  dimensions: text("dimensions"),
  exchangeTermsFr: text("exchange_terms_fr"),
  exchangeTermsEn: text("exchange_terms_en"),
  visible: integer("visible", { mode: "boolean" }).notNull().default(true),
  priceQc: integer("price_qc"),
  priceConakry: integer("price_conakry"),
  stockQc: integer("stock_qc").notNull().default(0),
  stockConakry: integer("stock_conakry").notNull().default(0),
  visibleQc: integer("visible_qc", { mode: "boolean" }).notNull().default(false),
  visibleConakry: integer("visible_conakry", { mode: "boolean" }).notNull().default(true),
  alertThreshold: integer("alert_threshold").notNull().default(2),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  promoPriceQc: integer("promo_price_qc"),
  promoPriceConakry: integer("promo_price_conakry"),
  variantsJson: text("variants_json").notNull().default("[]"),
  imagesJson: text("images_json").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const subscribers = sqliteTable("subscribers", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  language: text("language").notNull().default("fr"),
  consent: integer("consent", { mode: "boolean" }).notNull().default(false),
  source: text("source").notNull().default("promotion"),
  region: text("region").notNull().default("conakry"),
  createdAt: text("created_at").notNull(),
});

export const promotions = sqliteTable("promotions", {
  id: text("id").primaryKey(),
  titleFr: text("title_fr").notNull(),
  titleEn: text("title_en").notNull().default(""),
  descriptionFr: text("description_fr").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  discountPercent: integer("discount_percent").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  startsAt: text("starts_at"),
  endsAt: text("ends_at"),
  region: text("region").notNull().default("both"),
  promoCode: text("promo_code"),
  discountType: text("discount_type").notNull().default("percent"),
  discountAmount: integer("discount_amount").notNull().default(0),
  minimumPurchase: integer("minimum_purchase").notNull().default(0),
  usageCount: integer("usage_count").notNull().default(0),
  usageLimit: integer("usage_limit"),
  createdAt: text("created_at").notNull(),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  total: integer("total").notNull().default(0),
  status: text("status").notNull().default("new"),
  notes: text("notes").notNull().default(""),
  region: text("region").notNull().default("conakry"),
  currency: text("currency").notNull().default("GNF"),
  deliveryZone: text("delivery_zone"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("settings_key_idx").on(table.key)]);

export const stockMovements = sqliteTable("stock_movements", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  region: text("region").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull().default(""),
  adminId: text("admin_id").references(() => admins.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
});

export const siteVersions = sqliteTable("site_versions", {
  id: text("id").primaryKey(),
  region: text("region").notNull(),
  settingsJson: text("settings_json").notNull(),
  adminId: text("admin_id").references(() => admins.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
});

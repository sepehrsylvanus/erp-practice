import "dotenv/config";
import { hash, argon2id } from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/client/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required before running the seed");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const companyId = "company-demo";

const permissions = [
  { code: "catalog.products.read", description: "خواندن کالاها" },
  { code: "catalog.products.write", description: "ساخت و ویرایش کالاها" },
  { code: "catalog.parties.read", description: "خواندن مشتری و تأمین‌کننده" },
  { code: "catalog.locations.read", description: "خواندن شعب و انبارها" },
  { code: "inventory.balances.read", description: "خواندن مانده‌ی انبار" },
  { code: "inventory.adjust", description: "اصلاح موجودی" },
  { code: "purchasing.orders.read", description: "خواندن سفارش‌های خرید" },
  { code: "purchasing.orders.write", description: "ثبت سفارش خرید" },
  { code: "purchasing.orders.approve", description: "تأیید سفارش خرید" },
  { code: "sales.orders.read", description: "خواندن سفارش‌های فروش" },
  { code: "sales.orders.write", description: "ثبت سفارش فروش" },
  { code: "sales.order.approve", description: "تأیید سفارش فروش" },
  { code: "finance.invoices.read", description: "خواندن فاکتورها" },
  { code: "finance.invoice.post", description: "صدور فاکتور و ثبت دفتر" },
  { code: "finance.payments.create", description: "ثبت دریافت و پرداخت" },
  { code: "finance.reports.read", description: "خواندن گزارش مالی" },
  { code: "admin.users.manage", description: "مدیریت کاربران و نقش‌ها" },
];

const roleDefs = [
  {
    code: "admin",
    name: "مدیر سیستم",
    permissionCodes: permissions.map((p) => p.code),
  },
  {
    code: "sales",
    name: "فروش",
    permissionCodes: [
      "catalog.products.read",
      "catalog.parties.read",
      "sales.orders.read",
      "sales.orders.write",
      "sales.order.approve",
      "finance.invoices.read",
    ],
  },
  {
    code: "warehouse",
    name: "انباردار",
    permissionCodes: [
      "catalog.products.read",
      "inventory.balances.read",
      "inventory.adjust",
      "purchasing.orders.read",
    ],
  },
  {
    code: "finance",
    name: "مالی",
    permissionCodes: [
      "catalog.parties.read",
      "finance.invoices.read",
      "finance.invoice.post",
      "finance.payments.create",
      "finance.reports.read",
    ],
  },
];

const accounts = [
  { code: "1000", name: "صندوق و بانک", type: "ASSET" },
  { code: "1100", name: "حساب‌های دریافتنی", type: "ASSET" },
  { code: "1200", name: "موجودی کالا", type: "ASSET" },
  { code: "2000", name: "حساب‌های پرداختنی", type: "LIABILITY" },
  { code: "2100", name: "مالیات پرداختنی", type: "LIABILITY" },
  { code: "3000", name: "سرمایه", type: "EQUITY" },
  { code: "4000", name: "درآمد فروش", type: "REVENUE" },
  { code: "5000", name: "بهای تمام‌شده‌ی فروش", type: "EXPENSE" },
] as const;

async function main() {
  const companyData = {
    name: process.env.COMPANY_NAME ?? "شرکت آزمایشی",
    defaultCurrency: process.env.DEFAULT_CURRENCY ?? "AZN",
  };
  const company = await prisma.company.upsert({
    where: { id: companyId },
    update: companyData,
    create: { id: companyId, ...companyData, timezone: "UTC" },
  });

  const branch = await prisma.branch.upsert({
    where: { companyId_code: { companyId: company.id, code: "HQ" } },
    update: { name: "شعبه‌ی مرکزی" },
    create: { companyId: company.id, code: "HQ", name: "شعبه‌ی مرکزی" },
  });
  const warehouse = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: "WH-MAIN" } },
    update: { name: "انبار مرکزی", branchId: branch.id, isActive: true },
    create: {
      companyId: company.id,
      branchId: branch.id,
      code: "WH-MAIN",
      name: "انبار مرکزی",
    },
  });

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@erp.local")
    .trim()
    .toLowerCase();
  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (!existingAdmin && !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error(
      "Set SEED_ADMIN_PASSWORD in the root .env before the first seed run",
    );
  }
  const passwordHash =
    existingAdmin?.passwordHash ??
    (await hash(process.env.SEED_ADMIN_PASSWORD!, { type: argon2id }));
  const admin = await prisma.user.upsert({
    where: { email },
    update: { displayName: "مدیر سیستم", isActive: true },
    create: { email, passwordHash, displayName: "مدیر سیستم", isActive: true },
  });

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description },
      create: permission,
    });
  }

  let adminRoleId = "";
  for (const roleDef of roleDefs) {
    const role = await prisma.role.upsert({
      where: { companyId_code: { companyId: company.id, code: roleDef.code } },
      update: { name: roleDef.name },
      create: { companyId: company.id, code: roleDef.code, name: roleDef.name },
    });
    if (roleDef.code === "admin") adminRoleId = role.id;
    for (const permissionCode of roleDef.permissionCodes) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionCode: { roleId: role.id, permissionCode } },
        update: {},
        create: { roleId: role.id, permissionCode },
      });
    }
  }
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRoleId } },
    update: {},
    create: { userId: admin.id, roleId: adminRoleId },
  });

  const category = await prisma.productCategory.upsert({
    where: { companyId_code: { companyId: company.id, code: "HARDWARE" } },
    update: { name: "یراق و قطعات" },
    create: { companyId: company.id, code: "HARDWARE", name: "یراق و قطعات" },
  });
  const product = await prisma.product.upsert({
    where: { companyId_sku: { companyId: company.id, sku: "SEED-BOLT-10" } },
    update: {
      name: "پیچ صنعتی نمونه",
      categoryId: category.id,
      isActive: true,
    },
    create: {
      companyId: company.id,
      categoryId: category.id,
      sku: "SEED-BOLT-10",
      name: "پیچ صنعتی نمونه",
      description: "کالای نمونه‌ی Seed",
      unit: "عدد",
      trackStock: true,
      isActive: true,
      purchasePrice: "1.20",
      salePrice: "2.50",
      reorderPoint: "10.000",
    },
  });

  await prisma.customer.upsert({
    where: { companyId_code: { companyId: company.id, code: "C-SEED-001" } },
    update: { name: "مشتری نمونه" },
    create: {
      companyId: company.id,
      code: "C-SEED-001",
      name: "مشتری نمونه",
      email: "customer@example.test",
      phone: "+994 50 000 00 11",
      isActive: true,
    },
  });
  await prisma.supplier.upsert({
    where: { companyId_code: { companyId: company.id, code: "S-SEED-001" } },
    update: { name: "تأمین‌کننده‌ی نمونه" },
    create: {
      companyId: company.id,
      code: "S-SEED-001",
      name: "تأمین‌کننده‌ی نمونه",
      email: "supplier@example.test",
      phone: "+994 50 000 00 22",
      isActive: true,
    },
  });

  await prisma.stockBalance.upsert({
    where: {
      warehouseId_productId: {
        warehouseId: warehouse.id,
        productId: product.id,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      warehouseId: warehouse.id,
      productId: product.id,
      onHand: "100.000",
      reserved: "0.000",
    },
  });
  await prisma.inventoryMovement.upsert({
    where: { idempotencyKey: "seed:opening:SEED-BOLT-10:WH-MAIN" },
    update: {},
    create: {
      companyId: company.id,
      warehouseId: warehouse.id,
      productId: product.id,
      createdById: admin.id,
      type: "OPENING_BALANCE",
      quantityDelta: "100.000",
      unitCost: "1.2000",
      sourceType: "seed",
      sourceId: "opening:SEED-BOLT-10:WH-MAIN",
      idempotencyKey: "seed:opening:SEED-BOLT-10:WH-MAIN",
      note: "موجودی اولیه‌ی نمونه",
    },
  });

  for (const account of accounts) {
    await prisma.account.upsert({
      where: { companyId_code: { companyId: company.id, code: account.code } },
      update: { name: account.name, type: account.type },
      create: { companyId: company.id, ...account },
    });
  }

  console.log(`Seed ready: ${company.name} · ${email} · ${warehouse.code}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

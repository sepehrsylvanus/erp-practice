import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const erpRoot = __dirname;

export const erpAlias = {
  "@erp/shared-ui": path.join(erpRoot, "libs/shared/ui/src/index.ts"),
  "@erp/shared-api": path.join(erpRoot, "libs/shared/api/src/index.ts"),
  "@erp/shared-auth": path.join(erpRoot, "libs/shared/authlib/src/index.ts"),
};

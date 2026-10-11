import { lazy, type ComponentType } from "react";
import { registerRemotes, loadRemote } from "@module-federation/runtime";

const PROVIDERS: Array<{ alias: string; name: string; entry: string }> = [
  {
    alias: "auth",
    name: "auth",
    entry: "http://localhost:5101/remoteEntry.js",
  },
  {
    alias: "dashboard",
    name: "dashboard",
    entry: "http://localhost:5102/remoteEntry.js",
  },
  {
    alias: "catalog",
    name: "catalog",
    entry: "http://localhost:5103/remoteEntry.js",
  },
  {
    alias: "inventory",
    name: "inventory_fe",
    entry: "http://localhost:5104/remoteEntry.js",
  },
  {
    alias: "purchasing",
    name: "purchasing",
    entry: "http://localhost:5105/remoteEntry.js",
  },
  {
    alias: "sales",
    name: "sales_fe",
    entry: "http://localhost:5106/remoteEntry.js",
  },
  {
    alias: "finance",
    name: "finance",
    entry: "http://localhost:5107/remoteEntry.js",
  },
  {
    alias: "reports",
    name: "reports",
    entry: "http://localhost:5108/remoteEntry.js",
  },
  {
    alias: "admin",
    name: "admin",
    entry: "http://localhost:5109/remoteEntry.js",
  },
];

registerRemotes(PROVIDERS.map((remote) => ({ ...remote, type: "module" })));

export function lazyProvider<Props = unknown>(
  alias: string,
  exposeName = "App",
) {
  return lazy(async () => {
    const mod = await loadRemote<{ default: ComponentType<Props> }>(
      `${alias}/${exposeName}`,
    );
    return { default: mod!.default };
  });
}

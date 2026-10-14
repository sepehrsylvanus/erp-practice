import { lazy, type ComponentType } from "react";
import { registerRemotes, loadRemote } from "@module-federation/runtime";

const PROVIDERS: Array<{ alias: string; name: string; entry: string }> = [
  {
    alias: "auth",
    name: "auth",
    entry: "http://localhost:4301/remoteEntry.js",
  },
  {
    alias: "dashboard",
    name: "dashboard",
    entry: "http://localhost:4302/remoteEntry.js",
  },
  {
    alias: "catalog",
    name: "catalog",
    entry: "http://localhost:4303/remoteEntry.js",
  },
  {
    alias: "inventory",
    name: "inventory_fe",
    entry: "http://localhost:4304/remoteEntry.js",
  },
  {
    alias: "purchasing",
    name: "purchasing",
    entry: "http://localhost:4305/remoteEntry.js",
  },
  {
    alias: "sales",
    name: "sales_fe",
    entry: "http://localhost:4505/remoteEntry.js",
  },
  {
    alias: "finance",
    name: "finance",
    entry: "http://localhost:4307/remoteEntry.js",
  },
  {
    alias: "reports",
    name: "reports",
    entry: "http://localhost:4308/remoteEntry.js",
  },
  {
    alias: "admin",
    name: "admin",
    entry: "http://localhost:4309/remoteEntry.js",
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

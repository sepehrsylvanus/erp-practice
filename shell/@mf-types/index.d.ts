import type { PackageType as PackageType_0,RemoteKeys as RemoteKeys_0 } from './admin/apis.d.ts';
import type { PackageType as PackageType_1,RemoteKeys as RemoteKeys_1 } from './auth/apis.d.ts';
import type { PackageType as PackageType_2,RemoteKeys as RemoteKeys_2 } from './catalog/apis.d.ts';
import type { PackageType as PackageType_3,RemoteKeys as RemoteKeys_3 } from './dashboard/apis.d.ts';
import type { PackageType as PackageType_4,RemoteKeys as RemoteKeys_4 } from './finance/apis.d.ts';
import type { PackageType as PackageType_5,RemoteKeys as RemoteKeys_5 } from './inventory/apis.d.ts';
import type { PackageType as PackageType_6,RemoteKeys as RemoteKeys_6 } from './purchasing/apis.d.ts';
import type { PackageType as PackageType_7,RemoteKeys as RemoteKeys_7 } from './reports/apis.d.ts';
import type { PackageType as PackageType_8,RemoteKeys as RemoteKeys_8 } from './sales/apis.d.ts';
    declare module "@module-federation/runtime" {
      type RemoteKeys = RemoteKeys_0 | RemoteKeys_1 | RemoteKeys_2 | RemoteKeys_3 | RemoteKeys_4 | RemoteKeys_5 | RemoteKeys_6 | RemoteKeys_7 | RemoteKeys_8;
      type PackageType<T, Y=any> = T extends RemoteKeys_0 ? PackageType_0<T> :
T extends RemoteKeys_1 ? PackageType_1<T> :
T extends RemoteKeys_2 ? PackageType_2<T> :
T extends RemoteKeys_3 ? PackageType_3<T> :
T extends RemoteKeys_4 ? PackageType_4<T> :
T extends RemoteKeys_5 ? PackageType_5<T> :
T extends RemoteKeys_6 ? PackageType_6<T> :
T extends RemoteKeys_7 ? PackageType_7<T> :
T extends RemoteKeys_8 ? PackageType_8<T> :
Y ;
      export function loadRemote<T extends RemoteKeys,Y>(packageName: T): Promise<PackageType<T, Y>>;
      export function loadRemote<T extends string,Y>(packageName: T): Promise<PackageType<T, Y>>;
    }
declare module "@module-federation/enhanced/runtime" {
      type RemoteKeys = RemoteKeys_0 | RemoteKeys_1 | RemoteKeys_2 | RemoteKeys_3 | RemoteKeys_4 | RemoteKeys_5 | RemoteKeys_6 | RemoteKeys_7 | RemoteKeys_8;
      type PackageType<T, Y=any> = T extends RemoteKeys_0 ? PackageType_0<T> :
T extends RemoteKeys_1 ? PackageType_1<T> :
T extends RemoteKeys_2 ? PackageType_2<T> :
T extends RemoteKeys_3 ? PackageType_3<T> :
T extends RemoteKeys_4 ? PackageType_4<T> :
T extends RemoteKeys_5 ? PackageType_5<T> :
T extends RemoteKeys_6 ? PackageType_6<T> :
T extends RemoteKeys_7 ? PackageType_7<T> :
T extends RemoteKeys_8 ? PackageType_8<T> :
Y ;
      export function loadRemote<T extends RemoteKeys,Y>(packageName: T): Promise<PackageType<T, Y>>;
      export function loadRemote<T extends string,Y>(packageName: T): Promise<PackageType<T, Y>>;
    }
declare module "@module-federation/runtime-tools" {
      type RemoteKeys = RemoteKeys_0 | RemoteKeys_1 | RemoteKeys_2 | RemoteKeys_3 | RemoteKeys_4 | RemoteKeys_5 | RemoteKeys_6 | RemoteKeys_7 | RemoteKeys_8;
      type PackageType<T, Y=any> = T extends RemoteKeys_0 ? PackageType_0<T> :
T extends RemoteKeys_1 ? PackageType_1<T> :
T extends RemoteKeys_2 ? PackageType_2<T> :
T extends RemoteKeys_3 ? PackageType_3<T> :
T extends RemoteKeys_4 ? PackageType_4<T> :
T extends RemoteKeys_5 ? PackageType_5<T> :
T extends RemoteKeys_6 ? PackageType_6<T> :
T extends RemoteKeys_7 ? PackageType_7<T> :
T extends RemoteKeys_8 ? PackageType_8<T> :
Y ;
      export function loadRemote<T extends RemoteKeys,Y>(packageName: T): Promise<PackageType<T, Y>>;
      export function loadRemote<T extends string,Y>(packageName: T): Promise<PackageType<T, Y>>;
    }
    
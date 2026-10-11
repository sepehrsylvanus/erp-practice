
    export type RemoteKeys = 'inventory/App';
    type PackageType<T> = T extends 'inventory/App' ? typeof import('inventory/App') :any;
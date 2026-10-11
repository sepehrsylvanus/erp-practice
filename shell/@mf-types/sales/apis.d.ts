
    export type RemoteKeys = 'sales/App';
    type PackageType<T> = T extends 'sales/App' ? typeof import('sales/App') :any;
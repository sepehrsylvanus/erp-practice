
    export type RemoteKeys = 'catalog/App';
    type PackageType<T> = T extends 'catalog/App' ? typeof import('catalog/App') :any;
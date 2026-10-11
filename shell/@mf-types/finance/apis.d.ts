
    export type RemoteKeys = 'finance/App';
    type PackageType<T> = T extends 'finance/App' ? typeof import('finance/App') :any;

    export type RemoteKeys = 'reports/App';
    type PackageType<T> = T extends 'reports/App' ? typeof import('reports/App') :any;
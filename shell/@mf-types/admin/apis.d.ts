
    export type RemoteKeys = 'admin/App';
    type PackageType<T> = T extends 'admin/App' ? typeof import('admin/App') :any;
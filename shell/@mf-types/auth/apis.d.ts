
    export type RemoteKeys = 'auth/App';
    type PackageType<T> = T extends 'auth/App' ? typeof import('auth/App') :any;
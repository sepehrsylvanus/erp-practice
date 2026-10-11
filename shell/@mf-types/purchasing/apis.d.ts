
    export type RemoteKeys = 'purchasing/App';
    type PackageType<T> = T extends 'purchasing/App' ? typeof import('purchasing/App') :any;
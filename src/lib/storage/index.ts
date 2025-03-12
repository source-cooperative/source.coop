export { LocalStorageClient } from './local';

// We can also export types here if we want to centralize storage-related exports
export type {
  StorageProvider,
  StorageProviderConfig,
  StorageProviderType,
  ObjectPath,
  StorageLocation
} from '@/types/storage'; 

export { ProfileLayout } from './ProfileLayout';
export { IndividualProfile } from './IndividualProfile';
export { OrganizationProfile } from './OrganizationProfile'; 
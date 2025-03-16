import type { Account, Repository, RepositoryObject, RepositoryStatistics } from '@/types';

// Metadata component types
export interface DataCiteSectionProps {
  doi: string;
}

export interface STACSectionProps {
  stacUrl: string;
}

export interface RepositorySchemaProps {
  repository: Repository;
  statistics?: RepositoryStatistics;
}

// Profile component types
export interface AccountListProps {
  accounts: Account[];
}

export interface IndividualProfileProps {
  account: Account;
  repositories: Repository[];
}

export interface OrganizationProfileProps {
  account: Account;
  repositories: Repository[];
}

export interface ProfileLayoutProps {
  description: string;
  fields: { label: string; value: string | JSX.Element }[];
  children?: React.ReactNode;
}

// Repository component types
export interface RepositoryHeaderProps {
  repository: Repository;
  statistics?: RepositoryStatistics;
}

export interface RepositoryListItemProps {
  repository: Repository;
  account: Account;
}

export interface RepositoryMetaCardProps {
  repository: Repository;
  statistics?: RepositoryStatistics;
}

export interface RepositorySchemaMetadataProps {
  repository: Repository;
  statistics?: RepositoryStatistics;
}

export interface RepositorySearchResultProps {
  repository: Repository;
  account: Account;
  highlight?: string;
}

export interface RepositorySummaryCardProps {
  repository: Repository;
}

export interface ObjectBrowserProps {
  repository: Repository;
  objects: RepositoryObject[];
  initialPath?: string;
  selectedObject?: RepositoryObject;
} 
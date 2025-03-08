/**
 * DataCite metadata structure
 * Based on DataCite Metadata Schema 4.4
 */
interface DataCiteMeta {
  doi: string;
  creators: Array<{
    name: string;
    nameType?: 'Personal' | 'Organizational';
    affiliation?: string[];
    nameIdentifiers?: Array<{
      nameIdentifier: string;
      nameIdentifierScheme: string;
      schemeURI?: string;
    }>;
  }>;
  titles: Array<{
    title: string;
    titleType?: 'AlternativeTitle' | 'Subtitle' | 'TranslatedTitle';
    lang?: string;
  }>;
  publisher: string;
  publicationYear: string;
  resourceType: {
    resourceTypeGeneral: string;
    resourceType?: string;
  };
  subjects?: Array<{
    subject: string;
    subjectScheme?: string;
    schemeURI?: string;
  }>;
  contributors?: Array<{
    name: string;
    nameType?: 'Personal' | 'Organizational';
    contributorType: string;
    affiliation?: string[];
  }>;
  dates?: Array<{
    date: string;
    dateType: string;
  }>;
  language?: string;
  version?: string;
}

/**
 * Core metadata for repositories
 */
interface RepositoryMeta {
  title: string;
  description: string;
  tags: string[];
  image?: string;
  createdAt: string;
  updatedAt: string;
  doi?: string;  // The DOI if one exists
  dataCite?: DataCiteMeta;  // DataCite metadata if available
}

/**
 * Repository statistics
 */
interface RepositoryStats {
  size: number;
  fileCount: number;
  lastUpdated: string;
}

/**
 * Repository visibility settings
 */
type RepositoryVisibility = 'public' | 'private';

/**
 * Core repository type
 */
interface Repository {
  id: string;
  accountId: string;
  name: string;
  meta: RepositoryMeta;
  visibility: RepositoryVisibility;
  stats?: RepositoryStats;
}

/**
 * Account types
 */
type AccountType = 'individual' | 'organization';

/**
 * Base account interface with common properties
 */
interface BaseAccount {
  id: string;          // The accountId used in URLs
  type: AccountType;   // Whether this is an individual or organization
  name: string;        // Display name
  description?: string;
  avatarUrl?: string;
  websiteUrl?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual account type
 */
interface IndividualAccount extends BaseAccount {
  type: 'individual';
  firstName?: string;
  lastName?: string;
  email?: string;
}

/**
 * Organization account type
 */
interface OrganizationAccount extends BaseAccount {
  type: 'organization';
  orgType?: 'academic' | 'government' | 'nonprofit' | 'commercial';
  parentOrg?: string;    // ID of parent organization
  subOrgs?: string[];    // IDs of child organizations
  members?: string[];    // IDs of individual members
}

/**
 * Union type for any kind of account
 */
type Account = IndividualAccount | OrganizationAccount;

export type {
  Repository,
  RepositoryMeta,
  RepositoryStats,
  RepositoryVisibility,
  DataCiteMeta,  // Export the new type
  Account,
  AccountType,
  IndividualAccount,
  OrganizationAccount,
};

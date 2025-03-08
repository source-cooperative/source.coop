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

export type {
  Repository,
  RepositoryMeta,
  RepositoryStats,
  RepositoryVisibility,
  DataCiteMeta,  // Export the new type
};

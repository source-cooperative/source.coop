import { Repository, RepositoryStatistics } from '@/types/repository';
import { Account } from '@/types/account';
import { RepositoryObject } from '@/types/repository_object';

export const exampleRepositories: Repository[] = [
  {
    repository_id: "global-building-footprints",
    account_id: "microsoft",
    title: "Global Building Footprints",
    description: "A comprehensive dataset of building footprints derived from satellite imagery using deep learning. This dataset includes AI-generated building footprints across multiple continents, providing valuable data for mapping, urban planning, and humanitarian efforts.",
    private: false,
    created_at: "2024-02-05T15:30:00Z",
    updated_at: "2024-02-06T10:15:00Z",
    metadata_files: {
      stac: ["stac/catalog.json"],
      schema_org: ["metadata/schema_org.json"]
    }
  },
  {
    repository_id: "noaa-goes18",
    account_id: "noaa",
    title: "NOAA GOES-18 Full Disk",
    description: "Full disk imagery from the GOES-18 satellite, providing continuous monitoring of Earth's Western Hemisphere. Includes multi-spectral observations at 5-15 minute intervals, enabling real-time weather forecasting, climate monitoring, and natural disaster tracking.",
    private: false,
    created_at: "2024-01-10T08:00:00Z",
    updated_at: "2024-02-07T09:30:00Z",
    metadata_files: {
      stac: ["stac/catalog.json"],
      schema_org: ["metadata/schema_org.json"]
    }
  },
  {
    repository_id: "landsat-c2-l2",
    account_id: "usgs",
    title: "Landsat Collection 2 Level-2",
    description: "Surface reflectance and surface temperature data from the Landsat satellite program. Collection 2 includes improved atmospheric correction and geometric accuracy, providing consistent data quality across all Landsat missions from 1972 to present.",
    private: false,
    created_at: "2023-12-01T00:00:00Z",
    updated_at: "2024-02-07T06:00:00Z",
    metadata_files: {
      stac: ["stac/catalog.json", "stac/collection.json"],
      schema_org: ["metadata/schema_org.json"],
      datacite: ["metadata/datacite.json"]
    }
  },
  {
    repository_id: "noaa-nwm",
    account_id: "noaa",
    title: "National Water Model",
    description: "High-resolution hydrologic modeling data for streams and rivers across the continental United States. Provides forecast and analysis fields for streamflow, soil moisture, snowpack, and other hydrologic variables at various temporal resolutions.",
    private: false,
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-02-07T15:00:00Z",
    metadata_files: {
      stac: ["stac/catalog.json"],
      schema_org: ["metadata/schema_org.json"]
    }
  },
  {
    repository_id: "naip",
    account_id: "usda",
    title: "National Agriculture Imagery Program (NAIP)",
    description: "High-resolution aerial imagery covering the continental United States, acquired during the agricultural growing seasons. NAIP imagery is acquired at a one-meter ground sample distance with a horizontal accuracy of within six meters of reference ortho imagery.",
    private: false,
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-02-07T18:00:00Z",
    metadata_files: {
      stac: ["stac/catalog.json"],
      schema_org: ["metadata/schema_org.json"]
    }
  },
  {
    repository_id: "era5",
    account_id: "ecmwf",
    title: "ERA5",
    description: "Global climate reanalysis dataset providing hourly estimates of atmospheric, land, and oceanic climate variables. Combines model data with observations to create a comprehensive record of global weather and climate from 1940 onwards.",
    private: false,
    created_at: "2024-01-05T00:00:00Z",
    updated_at: "2024-02-07T20:00:00Z",
    metadata_files: {
      stac: ["stac/catalog.json"],
      schema_org: ["metadata/schema_org.json"]
    }
  },
  {
    repository_id: "modis-lst",
    account_id: "nasa",
    title: "MODIS Land Surface Temperature",
    description: "Daily land surface temperature and emissivity measurements from the MODIS instruments aboard the Terra and Aqua satellites. Provides global coverage of temperature patterns, enabling monitoring of Earth's thermal behavior and climate change impacts.",
    private: false,
    created_at: "2024-01-08T00:00:00Z",
    updated_at: "2024-02-07T21:00:00Z",
    metadata_files: {
      stac: ["stac/catalog.json"],
      schema_org: ["metadata/schema_org.json"]
    }
  },
  {
    repository_id: "ghcn",
    account_id: "noaa",
    title: "Global Historical Climatology Network",
    description: "Comprehensive global historical climate data from weather stations worldwide. Includes daily measurements of temperature, precipitation, and other meteorological variables, with some records extending back to the 1800s.",
    private: false,
    created_at: "2024-01-12T00:00:00Z",
    updated_at: "2024-02-07T22:00:00Z",
    metadata_files: {
      stac: ["stac/catalog.json"],
      schema_org: ["metadata/schema_org.json"]
    }
  },
  {
    repository_id: "worldcover",
    account_id: "esa",
    title: "ESA WorldCover 2021",
    description: "Global land cover map at 10m resolution based on Sentinel-1 and Sentinel-2 data. Provides detailed classification of Earth's surface into 11 land cover classes with high accuracy, supporting various environmental monitoring and land management applications.",
    private: false,
    created_at: "2024-01-25T00:00:00Z",
    updated_at: "2024-02-07T23:00:00Z",
    metadata_files: {
      stac: ["stac/catalog.json"],
      schema_org: ["metadata/schema_org.json"]
    }
  },
  {
    repository_id: "3dep",
    account_id: "usgs",
    title: "3DEP Lidar",
    description: "High-quality topographic lidar data for the United States. Provides detailed elevation measurements with point densities of 2-20 points per square meter, supporting applications in flood risk management, infrastructure planning, and natural resource management.",
    private: false,
    created_at: "2024-01-18T00:00:00Z",
    updated_at: "2024-02-08T00:00:00Z",
    metadata_files: {
      stac: ["stac/catalog.json"],
      schema_org: ["metadata/schema_org.json"]
    }
  },
  {
    repository_id: "mrms",
    account_id: "noaa",
    title: "Multi-Radar Multi-Sensor",
    description: "High-resolution precipitation estimates and other derived products combining multiple radar, satellite, and surface observation networks. Provides near-real-time quantitative precipitation estimation, severe weather detection, and aviation products at 1km resolution.",
    private: false,
    created_at: "2024-01-22T00:00:00Z",
    updated_at: "2024-02-08T01:00:00Z",
    metadata_files: {
      stac: ["stac/catalog.json"],
      schema_org: ["metadata/schema_org.json"]
    }
  }
];

// Example objects
export const exampleObjects: RepositoryObject[] = [
  {
    id: "buildings-2024-01.geojson",
    repository_id: "global-building-footprints",
    path: "/2024/01/buildings.geojson",
    size: 1024 * 1024 * 500, // 500MB
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    checksum: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  {
    id: "goes18-20240207.nc",
    repository_id: "noaa-goes18",
    path: "/2024/02/07/goes18.nc",
    size: 1024 * 1024 * 1024 * 2, // 2GB
    created_at: "2024-02-07T00:00:00Z",
    updated_at: "2024-02-07T00:00:00Z",
    checksum: "sha256:a948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447"
  }
];

export const exampleRepositoryStatistics: RepositoryStatistics[] = [
  {
    repository_id: "global-building-footprints",
    total_objects: 1250,
    total_bytes: 1024 * 1024 * 1024 * 500, // 500GB
    first_object_at: "2024-01-01T00:00:00Z",
    last_object_at: "2024-02-06T10:15:00Z",
    file_types: {
      "geojson": {
        count: 1000,
        bytes: 1024 * 1024 * 1024 * 400  // 400GB
      },
      "json": {
        count: 250,
        bytes: 1024 * 1024 * 1024 * 100  // 100GB
      }
    }
  },
  {
    repository_id: "noaa-goes18",
    total_objects: 8760,  // ~1 file per hour for a year
    total_bytes: 1024 * 1024 * 1024 * 1024 * 2, // 2TB
    first_object_at: "2024-01-10T00:00:00Z",
    last_object_at: "2024-02-07T09:30:00Z",
    file_types: {
      "nc": {
        count: 8760,
        bytes: 1024 * 1024 * 1024 * 1024 * 2  // 2TB
      }
    }
  }
];


import type { Account, Repository } from '@/types';

export const testAccounts: Account[] = [
  {
    "account_id": "jed",
    "ory_id": "ory_b10286da6bed4ca490aaff78b243268e",
    "name": "Jed Sundwall",
    "type": "individual",
    "email": "jed@example.com",
    "website": "https://example.com",
    "description": "System administrator",
    "orcid": "0000-0000-0000-0000",
    "created_at": "2025-03-19T03:13:12.943Z",
    "updated_at": "2025-03-19T03:13:12.944Z"
  },
  {
    "account_id": "jane",
    "ory_id": "ory_2f140e8a5d7946c09b2c7f0a7e106d7f",
    "name": "Jane Smith",
    "type": "individual",
    "email": "jane@example.com",
    "website": "https://janesmith.com",
    "description": "Data scientist and researcher",
    "orcid": "0000-0000-0000-0001",
    "created_at": "2025-03-19T03:13:12.944Z",
    "updated_at": "2025-03-19T03:13:12.944Z"
  },
  {
    "account_id": "john",
    "ory_id": "ory_cd66eb6b6a8845e88657334f76ddb780",
    "name": "John Doe",
    "type": "individual",
    "email": "john@example.com",
    "website": "https://johndoe.com",
    "description": "Software engineer",
    "orcid": "0000-0000-0000-0002",
    "created_at": "2025-03-19T03:13:12.944Z",
    "updated_at": "2025-03-19T03:13:12.944Z"
  },
  {
    "account_id": "nasa",
    "ory_id": "ory_85b3969631b8430cb28748053b2c2862",
    "name": "NASA",
    "type": "organization",
    "owner_account_id": "jed",
    "admin_account_ids": [
      "jed",
      "jane"
    ],
    "created_at": "2025-03-19T03:13:12.944Z",
    "updated_at": "2025-03-19T03:13:12.944Z"
  },
  {
    "account_id": "esa",
    "ory_id": "ory_4fd3e9114b5c4b1ab5cc173efa2ba507",
    "name": "European Space Agency",
    "type": "organization",
    "owner_account_id": "jane",
    "admin_account_ids": [
      "jane",
      "john"
    ],
    "created_at": "2025-03-19T03:13:12.944Z",
    "updated_at": "2025-03-19T03:13:12.944Z"
  },
  {
    "account_id": "jpl",
    "ory_id": "ory_0f02ebd557c84a67a38e6bdc014ba5c2",
    "name": "Jet Propulsion Laboratory",
    "type": "organization",
    "owner_account_id": "nasa",
    "admin_account_ids": [
      "nasa",
      "jed"
    ],
    "created_at": "2025-03-19T03:13:12.944Z",
    "updated_at": "2025-03-19T03:13:12.944Z"
  },
  {
    "account_id": "microsoft",
    "ory_id": "ory_c817d153860a49189827b32d2151ad39",
    "name": "Microsoft",
    "type": "organization",
    "owner_account_id": "jed",
    "admin_account_ids": [
      "jed"
    ],
    "created_at": "2025-03-19T03:13:12.944Z",
    "updated_at": "2025-03-19T03:13:12.944Z"
  },
  {
    "account_id": "noaa",
    "ory_id": "ory_1ba18d6ee53a449a9bfb0c25d15f4857",
    "name": "National Oceanic and Atmospheric Administration",
    "type": "organization",
    "owner_account_id": "jed",
    "admin_account_ids": [
      "jed"
    ],
    "created_at": "2025-03-19T03:13:12.944Z",
    "updated_at": "2025-03-19T03:13:12.944Z"
  },
  {
    "account_id": "usgs",
    "ory_id": "ory_fba5681211ce4dbe849b79ead6bed025",
    "name": "United States Geological Survey",
    "type": "organization",
    "owner_account_id": "jed",
    "admin_account_ids": [
      "jed"
    ],
    "created_at": "2025-03-19T03:13:12.944Z",
    "updated_at": "2025-03-19T03:13:12.944Z"
  },
  {
    "account_id": "usda",
    "ory_id": "ory_7b340fa784e040c6a718d83cda37f693",
    "name": "United States Department of Agriculture",
    "type": "organization",
    "owner_account_id": "jed",
    "admin_account_ids": [
      "jed"
    ],
    "created_at": "2025-03-19T03:13:12.944Z",
    "updated_at": "2025-03-19T03:13:12.944Z"
  },
  {
    "account_id": "ecmwf",
    "ory_id": "ory_7a012ade617a4df8b3548dacf7262efa",
    "name": "European Centre for Medium-Range Weather Forecasts",
    "type": "organization",
    "owner_account_id": "jed",
    "admin_account_ids": [
      "jed"
    ],
    "created_at": "2025-03-19T03:13:12.944Z",
    "updated_at": "2025-03-19T03:13:12.944Z"
  },
  {
    "account_id": "radiant",
    "ory_id": "ory_4e441c5fa8f24b9c983d797f2cddeada",
    "name": "Radiant Earth Foundation",
    "type": "organization",
    "owner_account_id": "jed",
    "admin_account_ids": [
      "jed"
    ],
    "created_at": "2025-03-19T03:13:12.944Z",
    "updated_at": "2025-03-19T03:13:12.944Z"
  }
];

export const testRepositories: Repository[] = [
  {
    "repository_id": "global-building-footprints",
    "account": {
      "account_id": "microsoft",
      "ory_id": "ory_c817d153860a49189827b32d2151ad39",
      "name": "Microsoft",
      "type": "organization",
      "owner_account_id": "admin",
      "admin_account_ids": [
        "admin"
      ],
      "created_at": "2025-03-19T03:13:12.944Z",
      "updated_at": "2025-03-19T03:13:12.944Z"
    },
    "title": "Global Building Footprints",
    "description": "A comprehensive dataset of building footprints derived from satellite imagery using deep learning. This dataset includes AI-generated building footprints across multiple continents, providing valuable data for mapping, urban planning, and humanitarian efforts.",
    "private": false,
    "created_at": "2024-02-05T15:30:00Z",
    "updated_at": "2024-02-06T10:15:00Z",
    "metadata_files": {
      "stac": [
        "stac/catalog.json"
      ],
      "schema_org": [
        "metadata/schema_org.json"
      ]
    }
  },
  {
    "repository_id": "noaa-goes18",
    "account": {
      "account_id": "noaa",
      "ory_id": "ory_1ba18d6ee53a449a9bfb0c25d15f4857",
      "name": "National Oceanic and Atmospheric Administration",
      "type": "organization",
      "owner_account_id": "admin",
      "admin_account_ids": [
        "admin"
      ],
      "created_at": "2025-03-19T03:13:12.944Z",
      "updated_at": "2025-03-19T03:13:12.944Z"
    },
    "title": "NOAA GOES-18 Full Disk",
    "description": "Full disk imagery from the GOES-18 satellite, providing continuous monitoring of Earth's Western Hemisphere. Includes multi-spectral observations at 5-15 minute intervals, enabling real-time weather forecasting, climate monitoring, and natural disaster tracking.",
    "private": false,
    "created_at": "2024-01-10T08:00:00Z",
    "updated_at": "2024-02-07T09:30:00Z",
    "metadata_files": {
      "stac": [
        "stac/catalog.json"
      ],
      "schema_org": [
        "metadata/schema_org.json"
      ]
    }
  },
  {
    "repository_id": "noaa-nwm",
    "account": {
      "account_id": "noaa",
      "ory_id": "ory_1ba18d6ee53a449a9bfb0c25d15f4857",
      "name": "National Oceanic and Atmospheric Administration",
      "type": "organization",
      "owner_account_id": "admin",
      "admin_account_ids": [
        "admin"
      ],
      "created_at": "2025-03-19T03:13:12.944Z",
      "updated_at": "2025-03-19T03:13:12.944Z"
    },
    "title": "National Water Model",
    "description": "High-resolution hydrologic modeling data for streams and rivers across the continental United States. Provides forecast and analysis fields for streamflow, soil moisture, snowpack, and other hydrologic variables at various temporal resolutions.",
    "private": false,
    "created_at": "2024-01-15T00:00:00Z",
    "updated_at": "2024-02-07T15:00:00Z",
    "metadata_files": {
      "stac": [
        "stac/catalog.json"
      ],
      "schema_org": [
        "metadata/schema_org.json"
      ]
    }
  },
  {
    "repository_id": "ghcn",
    "account": {
      "account_id": "noaa",
      "ory_id": "ory_1ba18d6ee53a449a9bfb0c25d15f4857",
      "name": "National Oceanic and Atmospheric Administration",
      "type": "organization",
      "owner_account_id": "admin",
      "admin_account_ids": [
        "admin"
      ],
      "created_at": "2025-03-19T03:13:12.944Z",
      "updated_at": "2025-03-19T03:13:12.944Z"
    },
    "title": "Global Historical Climatology Network",
    "description": "Comprehensive global historical climate data from weather stations worldwide. Includes daily measurements of temperature, precipitation, and other meteorological variables, with some records extending back to the 1800s.",
    "private": false,
    "created_at": "2024-01-12T00:00:00Z",
    "updated_at": "2024-02-07T22:00:00Z",
    "metadata_files": {
      "stac": [
        "stac/catalog.json"
      ],
      "schema_org": [
        "metadata/schema_org.json"
      ]
    }
  },
  {
    "repository_id": "mrms",
    "account": {
      "account_id": "noaa",
      "ory_id": "ory_1ba18d6ee53a449a9bfb0c25d15f4857",
      "name": "National Oceanic and Atmospheric Administration",
      "type": "organization",
      "owner_account_id": "admin",
      "admin_account_ids": [
        "admin"
      ],
      "created_at": "2025-03-19T03:13:12.944Z",
      "updated_at": "2025-03-19T03:13:12.944Z"
    },
    "title": "Multi-Radar Multi-Sensor",
    "description": "High-resolution precipitation estimates and other derived products combining multiple radar, satellite, and surface observation networks. Provides near-real-time quantitative precipitation estimation, severe weather detection, and aviation products at 1km resolution.",
    "private": false,
    "created_at": "2024-01-22T00:00:00Z",
    "updated_at": "2024-02-08T01:00:00Z",
    "metadata_files": {
      "stac": [
        "stac/catalog.json"
      ],
      "schema_org": [
        "metadata/schema_org.json"
      ]
    }
  },
  {
    "repository_id": "landsat-c2-l2",
    "account": {
      "account_id": "usgs",
      "ory_id": "ory_fba5681211ce4dbe849b79ead6bed025",
      "name": "United States Geological Survey",
      "type": "organization",
      "owner_account_id": "admin",
      "admin_account_ids": [
        "admin"
      ],
      "created_at": "2025-03-19T03:13:12.944Z",
      "updated_at": "2025-03-19T03:13:12.944Z"
    },
    "title": "Landsat Collection 2 Level-2",
    "description": "Surface reflectance and surface temperature data from the Landsat satellite program. Collection 2 includes improved atmospheric correction and geometric accuracy, providing consistent data quality across all Landsat missions from 1972 to present.",
    "private": false,
    "created_at": "2023-12-01T00:00:00Z",
    "updated_at": "2024-02-07T06:00:00Z",
    "metadata_files": {
      "stac": [
        "stac/catalog.json",
        "stac/collection.json"
      ],
      "schema_org": [
        "metadata/schema_org.json"
      ],
      "datacite": [
        "metadata/datacite.json"
      ]
    }
  },
  {
    "repository_id": "3dep",
    "account": {
      "account_id": "usgs",
      "ory_id": "ory_fba5681211ce4dbe849b79ead6bed025",
      "name": "United States Geological Survey",
      "type": "organization",
      "owner_account_id": "admin",
      "admin_account_ids": [
        "admin"
      ],
      "created_at": "2025-03-19T03:13:12.944Z",
      "updated_at": "2025-03-19T03:13:12.944Z"
    },
    "title": "3DEP Lidar",
    "description": "High-quality topographic lidar data for the United States. Provides detailed elevation measurements with point densities of 2-20 points per square meter, supporting applications in flood risk management, infrastructure planning, and natural resource management.",
    "private": false,
    "created_at": "2024-01-18T00:00:00Z",
    "updated_at": "2024-02-08T00:00:00Z",
    "metadata_files": {
      "stac": [
        "stac/catalog.json"
      ],
      "schema_org": [
        "metadata/schema_org.json"
      ]
    }
  },
  {
    "repository_id": "naip",
    "account": {
      "account_id": "usda",
      "ory_id": "ory_7b340fa784e040c6a718d83cda37f693",
      "name": "United States Department of Agriculture",
      "type": "organization",
      "owner_account_id": "admin",
      "admin_account_ids": [
        "admin"
      ],
      "created_at": "2025-03-19T03:13:12.944Z",
      "updated_at": "2025-03-19T03:13:12.944Z"
    },
    "title": "National Agriculture Imagery Program (NAIP)",
    "description": "High-resolution aerial imagery covering the continental United States, acquired during the agricultural growing seasons. NAIP imagery is acquired at a one-meter ground sample distance with a horizontal accuracy of within six meters of reference ortho imagery.",
    "private": false,
    "created_at": "2024-01-20T00:00:00Z",
    "updated_at": "2024-02-07T18:00:00Z",
    "metadata_files": {
      "stac": [
        "stac/catalog.json"
      ],
      "schema_org": [
        "metadata/schema_org.json"
      ]
    }
  },
  {
    "repository_id": "era5",
    "account": {
      "account_id": "ecmwf",
      "ory_id": "ory_7a012ade617a4df8b3548dacf7262efa",
      "name": "European Centre for Medium-Range Weather Forecasts",
      "type": "organization",
      "owner_account_id": "admin",
      "admin_account_ids": [
        "admin"
      ],
      "created_at": "2025-03-19T03:13:12.944Z",
      "updated_at": "2025-03-19T03:13:12.944Z"
    },
    "title": "ERA5",
    "description": "Global climate reanalysis dataset providing hourly estimates of atmospheric, land, and oceanic climate variables. Combines model data with observations to create a comprehensive record of global weather and climate from 1940 onwards.",
    "private": false,
    "created_at": "2024-01-05T00:00:00Z",
    "updated_at": "2024-02-07T20:00:00Z",
    "metadata_files": {
      "stac": [
        "stac/catalog.json"
      ],
      "schema_org": [
        "metadata/schema_org.json"
      ]
    }
  },
  {
    "repository_id": "modis-lst",
    "account": {
      "account_id": "nasa",
      "ory_id": "ory_85b3969631b8430cb28748053b2c2862",
      "name": "NASA",
      "type": "organization",
      "owner_account_id": "admin",
      "admin_account_ids": [
        "admin",
        "jane"
      ],
      "created_at": "2025-03-19T03:13:12.944Z",
      "updated_at": "2025-03-19T03:13:12.944Z"
    },
    "title": "MODIS Land Surface Temperature",
    "description": "Daily land surface temperature and emissivity measurements from the MODIS instruments aboard the Terra and Aqua satellites. Provides global coverage of temperature patterns, enabling monitoring of Earth's thermal behavior and climate change impacts.",
    "private": false,
    "created_at": "2024-01-08T00:00:00Z",
    "updated_at": "2024-02-07T21:00:00Z",
    "metadata_files": {
      "stac": [
        "stac/catalog.json"
      ],
      "schema_org": [
        "metadata/schema_org.json"
      ]
    }
  },
  {
    "repository_id": "worldcover",
    "account": {
      "account_id": "esa",
      "ory_id": "ory_4fd3e9114b5c4b1ab5cc173efa2ba507",
      "name": "European Space Agency",
      "type": "organization",
      "owner_account_id": "jane",
      "admin_account_ids": [
        "jane",
        "john"
      ],
      "created_at": "2025-03-19T03:13:12.944Z",
      "updated_at": "2025-03-19T03:13:12.944Z"
    },
    "title": "ESA WorldCover 2021",
    "description": "Global land cover map at 10m resolution based on Sentinel-1 and Sentinel-2 data. Provides detailed classification of Earth's surface into 11 land cover classes with high accuracy, supporting various environmental monitoring and land management applications.",
    "private": false,
    "created_at": "2024-01-25T00:00:00Z",
    "updated_at": "2024-02-07T23:00:00Z",
    "metadata_files": {
      "stac": [
        "stac/catalog.json"
      ],
      "schema_org": [
        "metadata/schema_org.json"
      ]
    }
  },
  {
    "repository_id": "ml-training-data",
    "account": {
      "account_id": "radiant",
      "ory_id": "ory_4e441c5fa8f24b9c983d797f2cddeada",
      "name": "Radiant Earth Foundation",
      "type": "organization",
      "owner_account_id": "admin",
      "admin_account_ids": [
        "admin"
      ],
      "created_at": "2025-03-19T03:13:12.944Z",
      "updated_at": "2025-03-19T03:13:12.944Z"
    },
    "title": "ML Training Data",
    "description": "Machine learning training datasets",
    "private": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-02T00:00:00Z"
  }
];

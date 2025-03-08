import { Repository } from '../types';

export const exampleRepositories: Repository[] = [
  {
    id: "global-building-footprints",
    accountId: "microsoft",
    name: "global-building-footprints",
    meta: {
      title: "Global Building Footprints",
      description: "A comprehensive dataset of building footprints derived from satellite imagery using deep learning. This dataset includes AI-generated building footprints across multiple continents, providing valuable data for mapping, urban planning, and humanitarian efforts.",
      tags: ["buildings", "footprints", "geospatial", "ML", "deep-learning", "humanitarian", "urban"],
      createdAt: "2024-02-05T15:30:00Z",
      updatedAt: "2024-02-06T10:15:00Z",
      doi: "10.5281/zenodo.3378987",
      dataCite: {
        doi: "10.5281/zenodo.3378987",
        creators: [
          {
            name: "Microsoft",
            nameType: "Organizational",
            nameIdentifiers: [
              {
                nameIdentifier: "https://ror.org/00n3cqg94",
                nameIdentifierScheme: "ROR",
                schemeURI: "https://ror.org"
              }
            ]
          }
        ],
        titles: [
          {
            title: "Microsoft Global Building Footprints",
            titleType: "AlternativeTitle",
            lang: "en"
          }
        ],
        publisher: "Microsoft",
        publicationYear: "2024",
        resourceType: {
          resourceTypeGeneral: "Dataset",
          resourceType: "Building Footprints"
        },
        subjects: [
          {
            subject: "Computer Vision",
            subjectScheme: "keyword"
          },
          {
            subject: "Deep Learning",
            subjectScheme: "keyword"
          },
          {
            subject: "Geographic Information Systems",
            subjectScheme: "keyword"
          }
        ],
        contributors: [
          {
            name: "OpenStreetMap Contributors",
            nameType: "Organizational",
            contributorType: "DataCollector"
          }
        ],
        dates: [
          {
            date: "2024-02-05",
            dateType: "Created"
          },
          {
            date: "2024-02-06",
            dateType: "Updated"
          }
        ],
        language: "en",
        version: "2.0.0"
      }
    },
    visibility: "public",
    stats: {
      size: 1024 * 1024 * 1024 * 50, // 50GB
      fileCount: 1250,
      lastUpdated: "2024-02-06T10:15:00Z",
    },
  },
  {
    id: "noaa-goes18",
    accountId: "noaa",
    name: "goes18",
    meta: {
      title: "NOAA GOES-18 Full Disk",
      description: "Full disk imagery from the GOES-18 satellite, providing continuous monitoring of Earth's Western Hemisphere. Includes multi-spectral observations at 5-15 minute intervals, enabling real-time weather forecasting, climate monitoring, and natural disaster tracking.",
      tags: ["satellite", "weather", "GOES", "atmospheric", "meteorology", "climate", "real-time"],
      createdAt: "2024-01-10T08:00:00Z",
      updatedAt: "2024-02-07T09:30:00Z",
      doi: "10.7289/V5BG2M4G",
      dataCite: {
        doi: "10.7289/V5BG2M4G",
        creators: [
          {
            name: "National Oceanic and Atmospheric Administration",
            nameType: "Organizational",
            nameIdentifiers: [
              {
                nameIdentifier: "https://ror.org/02z5b1f29",
                nameIdentifierScheme: "ROR",
                schemeURI: "https://ror.org"
              }
            ]
          }
        ],
        titles: [
          {
            title: "GOES-18 ABI Full Disk Data",
            titleType: "AlternativeTitle",
            lang: "en"
          }
        ],
        publisher: "NOAA",
        publicationYear: "2024",
        resourceType: {
          resourceTypeGeneral: "Dataset",
          resourceType: "Satellite Imagery"
        },
        subjects: [
          {
            subject: "Meteorology",
            subjectScheme: "keyword"
          },
          {
            subject: "Earth Observations",
            subjectScheme: "keyword"
          },
          {
            subject: "Atmospheric Science",
            subjectScheme: "keyword"
          }
        ],
        contributors: [
          {
            name: "NASA",
            nameType: "Organizational",
            contributorType: "HostingInstitution"
          }
        ],
        dates: [
          {
            date: "2024-01-10",
            dateType: "Created"
          },
          {
            date: "2024-02-07",
            dateType: "Updated"
          }
        ],
        language: "en",
        version: "1.0.0"
      }
    },
    visibility: "public",
    stats: {
      size: 1024 * 1024 * 1024 * 150, // 150GB
      fileCount: 8760,
      lastUpdated: "2024-02-07T09:30:00Z",
    },
  },
  {
    id: "sentinel-2-l2a",
    accountId: "planetary-computer",
    name: "sentinel-2-l2a",
    meta: {
      title: "Sentinel-2 Level-2A",
      description: "Surface reflectance imagery from the Sentinel-2 satellite constellation, processed to Level-2A. Includes atmospheric corrections and cloud masking, providing analysis-ready data for land monitoring, emergency management, and security services.",
      tags: ["satellite", "Copernicus", "ESA", "surface-reflectance", "land-monitoring", "emergency-response"],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-02-07T12:00:00Z",
      doi: "10.5281/zenodo.12345678",
      dataCite: {
        doi: "10.5281/zenodo.12345678",
        creators: [
          {
            name: "European Space Agency",
            nameType: "Organizational",
            nameIdentifiers: [
              {
                nameIdentifier: "https://ror.org/04z8jg394",
                nameIdentifierScheme: "ROR",
                schemeURI: "https://ror.org"
              }
            ]
          }
        ],
        titles: [
          {
            title: "Sentinel-2 Level-2A Collection",
            titleType: "AlternativeTitle",
            lang: "en"
          }
        ],
        publisher: "ESA",
        publicationYear: "2024",
        resourceType: {
          resourceTypeGeneral: "Dataset",
          resourceType: "Satellite Imagery"
        },
        subjects: [
          {
            subject: "Earth Observation",
            subjectScheme: "keyword"
          },
          {
            subject: "Surface Reflectance",
            subjectScheme: "keyword"
          },
          {
            subject: "Land Monitoring",
            subjectScheme: "keyword"
          }
        ],
        contributors: [
          {
            name: "Copernicus Programme",
            nameType: "Organizational",
            contributorType: "Sponsor"
          }
        ],
        dates: [
          {
            date: "2024-01-01",
            dateType: "Created"
          },
          {
            date: "2024-02-07",
            dateType: "Updated"
          }
        ],
        language: "en",
        version: "2.0.0"
      }
    },
    visibility: "public",
    stats: {
      size: 1024 * 1024 * 1024 * 1024 * 5, // 5TB
      fileCount: 25000,
      lastUpdated: "2024-02-07T12:00:00Z",
    },
  },
  {
    id: "landsat-c2-l2",
    accountId: "usgs",
    name: "landsat-c2-l2",
    meta: {
      title: "Landsat Collection 2 Level-2",
      description: "Surface reflectance and surface temperature data from the Landsat satellite program. Collection 2 includes improved atmospheric correction and geometric accuracy, providing consistent data quality across all Landsat missions from 1972 to present.",
      tags: ["satellite", "USGS", "NASA", "surface-reflectance", "temperature", "long-term-monitoring"],
      createdAt: "2023-12-01T00:00:00Z",
      updatedAt: "2024-02-07T06:00:00Z",
      doi: "10.5066/P975CC9Z",
      dataCite: {
        doi: "10.5066/P975CC9Z",
        creators: [
          {
            name: "United States Geological Survey",
            nameType: "Organizational",
            nameIdentifiers: [
              {
                nameIdentifier: "https://ror.org/035a68863",
                nameIdentifierScheme: "ROR",
                schemeURI: "https://ror.org"
              }
            ]
          }
        ],
        titles: [
          {
            title: "Landsat Collection 2 Level-2 Science Products",
            titleType: "AlternativeTitle",
            lang: "en"
          }
        ],
        publisher: "USGS",
        publicationYear: "2023",
        resourceType: {
          resourceTypeGeneral: "Dataset",
          resourceType: "Satellite Imagery"
        },
        subjects: [
          {
            subject: "Remote Sensing",
            subjectScheme: "keyword"
          },
          {
            subject: "Land Surface Temperature",
            subjectScheme: "keyword"
          },
          {
            subject: "Surface Reflectance",
            subjectScheme: "keyword"
          }
        ],
        contributors: [
          {
            name: "NASA",
            nameType: "Organizational",
            contributorType: "DataCollector"
          }
        ],
        dates: [
          {
            date: "2023-12-01",
            dateType: "Created"
          },
          {
            date: "2024-02-07",
            dateType: "Updated"
          }
        ],
        language: "en",
        version: "2.0.0"
      }
    },
    visibility: "public",
    stats: {
      size: 1024 * 1024 * 1024 * 1024 * 3, // 3TB
      fileCount: 18000,
      lastUpdated: "2024-02-07T06:00:00Z",
    },
  },
  {
    id: "noaa-nwm",
    accountId: "noaa",
    name: "national-water-model",
    meta: {
      title: "National Water Model",
      description: "High-resolution hydrologic modeling data for streams and rivers across the continental United States. Provides forecast and analysis fields for streamflow, soil moisture, snowpack, and other hydrologic variables at various temporal resolutions.",
      tags: ["hydrology", "water", "modeling", "forecast", "streamflow", "soil-moisture", "snowpack"],
      createdAt: "2024-01-15T00:00:00Z",
      updatedAt: "2024-02-07T15:00:00Z",
      doi: "10.7289/V5PN93H7",
      dataCite: {
        doi: "10.7289/V5PN93H7",
        creators: [
          {
            name: "National Center for Environmental Prediction",
            nameType: "Organizational",
            nameIdentifiers: [
              {
                nameIdentifier: "https://ror.org/00fq5cm18",
                nameIdentifierScheme: "ROR",
                schemeURI: "https://ror.org"
              }
            ]
          }
        ],
        titles: [
          {
            title: "National Water Model Operational Forecasts",
            titleType: "AlternativeTitle",
            lang: "en"
          }
        ],
        publisher: "NOAA",
        publicationYear: "2024",
        resourceType: {
          resourceTypeGeneral: "Dataset",
          resourceType: "Model Output"
        },
        subjects: [
          {
            subject: "Hydrology",
            subjectScheme: "keyword"
          },
          {
            subject: "Water Resources",
            subjectScheme: "keyword"
          },
          {
            subject: "Numerical Weather Prediction",
            subjectScheme: "keyword"
          }
        ],
        contributors: [
          {
            name: "Office of Water Prediction",
            nameType: "Organizational",
            contributorType: "DataManager"
          }
        ],
        dates: [
          {
            date: "2024-01-15",
            dateType: "Created"
          },
          {
            date: "2024-02-07",
            dateType: "Updated"
          }
        ],
        language: "en",
        version: "3.0.0"
      }
    },
    visibility: "public",
    stats: {
      size: 1024 * 1024 * 1024 * 75, // 75GB
      fileCount: 2880,
      lastUpdated: "2024-02-07T15:00:00Z",
    },
  },
  {
    id: "naip",
    accountId: "usda",
    name: "naip",
    meta: {
      title: "National Agriculture Imagery Program (NAIP)",
      description: "High-resolution aerial imagery covering the continental United States, acquired during the agricultural growing seasons. NAIP imagery is acquired at a one-meter ground sample distance with a horizontal accuracy of within six meters of reference ortho imagery.",
      tags: ["aerial", "imagery", "agriculture", "USDA", "high-resolution", "orthoimagery", "RGB"],
      createdAt: "2024-01-20T00:00:00Z",
      updatedAt: "2024-02-07T18:00:00Z",
      doi: "10.5066/F7QN651G",
      dataCite: {
        doi: "10.5066/F7QN651G",
        creators: [
          {
            name: "United States Department of Agriculture",
            nameType: "Organizational",
            nameIdentifiers: [
              {
                nameIdentifier: "https://ror.org/01zae9r86",
                nameIdentifierScheme: "ROR",
                schemeURI: "https://ror.org"
              }
            ]
          }
        ],
        titles: [
          {
            title: "NAIP Digital Ortho Photo Image",
            titleType: "AlternativeTitle",
            lang: "en"
          }
        ],
        publisher: "USDA",
        publicationYear: "2024",
        resourceType: {
          resourceTypeGeneral: "Dataset",
          resourceType: "Aerial Imagery"
        },
        subjects: [
          {
            subject: "Agriculture",
            subjectScheme: "keyword"
          },
          {
            subject: "Aerial Photography",
            subjectScheme: "keyword"
          },
          {
            subject: "Land Use",
            subjectScheme: "keyword"
          }
        ],
        contributors: [
          {
            name: "Farm Service Agency",
            nameType: "Organizational",
            contributorType: "DataCollector"
          }
        ],
        dates: [
          {
            date: "2024-01-20",
            dateType: "Created"
          },
          {
            date: "2024-02-07",
            dateType: "Updated"
          }
        ],
        language: "en",
        version: "2024"
      }
    },
    visibility: "public",
    stats: {
      size: 1024 * 1024 * 1024 * 1024 * 8, // 8TB
      fileCount: 45000,
      lastUpdated: "2024-02-07T18:00:00Z",
    },
  },
  {
    id: "era5",
    accountId: "ecmwf",
    name: "era5",
    meta: {
      title: "ERA5 Reanalysis",
      description: "Global climate reanalysis dataset providing hourly estimates of atmospheric, land, and oceanic climate variables. Combines model data with observations to create a comprehensive record of global weather and climate from 1940 onwards.",
      tags: ["climate", "reanalysis", "weather", "atmospheric", "ECMWF", "global", "historical"],
      createdAt: "2024-01-05T00:00:00Z",
      updatedAt: "2024-02-07T20:00:00Z",
      doi: "10.24381/cds.adbb2d47",
      dataCite: {
        doi: "10.24381/cds.adbb2d47",
        creators: [
          {
            name: "European Centre for Medium-Range Weather Forecasts",
            nameType: "Organizational",
            nameIdentifiers: [
              {
                nameIdentifier: "https://ror.org/00pbmnx74",
                nameIdentifierScheme: "ROR",
                schemeURI: "https://ror.org"
              }
            ]
          }
        ],
        titles: [
          {
            title: "ERA5 Hourly Data on Pressure Levels",
            titleType: "AlternativeTitle",
            lang: "en"
          }
        ],
        publisher: "ECMWF",
        publicationYear: "2024",
        resourceType: {
          resourceTypeGeneral: "Dataset",
          resourceType: "Reanalysis Data"
        },
        subjects: [
          {
            subject: "Atmospheric Science",
            subjectScheme: "keyword"
          },
          {
            subject: "Climate Data",
            subjectScheme: "keyword"
          },
          {
            subject: "Meteorology",
            subjectScheme: "keyword"
          }
        ],
        contributors: [
          {
            name: "Copernicus Climate Change Service",
            nameType: "Organizational",
            contributorType: "Sponsor"
          }
        ],
        dates: [
          {
            date: "2024-01-05",
            dateType: "Created"
          },
          {
            date: "2024-02-07",
            dateType: "Updated"
          }
        ],
        language: "en",
        version: "5.1.0"
      }
    },
    visibility: "public",
    stats: {
      size: 1024 * 1024 * 1024 * 1024 * 12, // 12TB
      fileCount: 32000,
      lastUpdated: "2024-02-07T20:00:00Z",
    },
  },
  {
    id: "modis-lst",
    accountId: "nasa",
    name: "modis-land-surface-temperature",
    meta: {
      title: "MODIS Land Surface Temperature and Emissivity",
      description: "Daily land surface temperature and emissivity measurements from the MODIS instruments aboard the Terra and Aqua satellites. Provides global coverage of temperature patterns, enabling monitoring of Earth's thermal behavior and climate change impacts.",
      tags: ["MODIS", "temperature", "climate", "NASA", "Terra", "Aqua", "LST"],
      createdAt: "2024-01-08T00:00:00Z",
      updatedAt: "2024-02-07T21:00:00Z",
      doi: "10.5067/MODIS/MOD11A1.061",
      dataCite: {
        doi: "10.5067/MODIS/MOD11A1.061",
        creators: [
          {
            name: "NASA Land Processes DAAC",
            nameType: "Organizational",
            nameIdentifiers: [
              {
                nameIdentifier: "https://ror.org/008pnk284",
                nameIdentifierScheme: "ROR",
                schemeURI: "https://ror.org"
              }
            ]
          }
        ],
        titles: [
          {
            title: "MODIS/Terra Land Surface Temperature/Emissivity Daily L3 Global 1km SIN Grid",
            titleType: "AlternativeTitle",
            lang: "en"
          }
        ],
        publisher: "NASA EOSDIS Land Processes DAAC",
        publicationYear: "2024",
        resourceType: {
          resourceTypeGeneral: "Dataset",
          resourceType: "Satellite Observations"
        },
        subjects: [
          {
            subject: "Earth Surface Temperature",
            subjectScheme: "keyword"
          },
          {
            subject: "Thermal Infrared",
            subjectScheme: "keyword"
          },
          {
            subject: "Climate Monitoring",
            subjectScheme: "keyword"
          }
        ],
        contributors: [
          {
            name: "Zhengming Wan",
            nameType: "Personal",
            contributorType: "ProjectLeader"
          }
        ],
        dates: [
          {
            date: "2024-01-08",
            dateType: "Created"
          },
          {
            date: "2024-02-07",
            dateType: "Updated"
          }
        ],
        language: "en",
        version: "6.1"
      }
    },
    visibility: "public",
    stats: {
      size: 1024 * 1024 * 1024 * 500, // 500GB
      fileCount: 15000,
      lastUpdated: "2024-02-07T21:00:00Z",
    },
  },
  {
    id: "ghcn",
    accountId: "noaa",
    name: "global-historical-climatology-network",
    meta: {
      title: "Global Historical Climatology Network (GHCN)",
      description: "Comprehensive global historical climate data from weather stations worldwide. Includes daily measurements of temperature, precipitation, and other meteorological variables, with some records extending back to the 1800s.",
      tags: ["weather", "climate", "historical", "stations", "temperature", "precipitation", "NOAA"],
      createdAt: "2024-01-12T00:00:00Z",
      updatedAt: "2024-02-07T22:00:00Z",
      doi: "10.7289/V5D21VHZ",
      dataCite: {
        doi: "10.7289/V5D21VHZ",
        creators: [
          {
            name: "National Centers for Environmental Information",
            nameType: "Organizational",
            nameIdentifiers: [
              {
                nameIdentifier: "https://ror.org/0414p9n90",
                nameIdentifierScheme: "ROR",
                schemeURI: "https://ror.org"
              }
            ]
          }
        ],
        titles: [
          {
            title: "Global Historical Climatology Network - Daily",
            titleType: "AlternativeTitle",
            lang: "en"
          }
        ],
        publisher: "NOAA",
        publicationYear: "2024",
        resourceType: {
          resourceTypeGeneral: "Dataset",
          resourceType: "Weather Observations"
        },
        subjects: [
          {
            subject: "Climatology",
            subjectScheme: "keyword"
          },
          {
            subject: "Weather Stations",
            subjectScheme: "keyword"
          },
          {
            subject: "Historical Weather",
            subjectScheme: "keyword"
          }
        ],
        contributors: [
          {
            name: "World Meteorological Organization",
            nameType: "Organizational",
            contributorType: "DataCollector"
          }
        ],
        dates: [
          {
            date: "2024-01-12",
            dateType: "Created"
          },
          {
            date: "2024-02-07",
            dateType: "Updated"
          }
        ],
        language: "en",
        version: "3.30"
      }
    },
    visibility: "public",
    stats: {
      size: 1024 * 1024 * 1024 * 200, // 200GB
      fileCount: 5000,
      lastUpdated: "2024-02-07T22:00:00Z",
    },
  },
  {
    id: "worldcover",
    accountId: "esa",
    name: "worldcover",
    meta: {
      title: "ESA WorldCover 2021",
      description: "Global land cover map at 10m resolution based on Sentinel-1 and Sentinel-2 data. Provides detailed classification of Earth's surface into 11 land cover classes with high accuracy, supporting various environmental monitoring and land management applications.",
      tags: ["landcover", "Sentinel", "ESA", "global", "classification", "10m-resolution"],
      createdAt: "2024-01-25T00:00:00Z",
      updatedAt: "2024-02-07T23:00:00Z",
      doi: "10.5281/zenodo.5571936",
      dataCite: {
        doi: "10.5281/zenodo.5571936",
        creators: [
          {
            name: "European Space Agency",
            nameType: "Organizational",
            nameIdentifiers: [
              {
                nameIdentifier: "https://ror.org/04z8jg394",
                nameIdentifierScheme: "ROR",
                schemeURI: "https://ror.org"
              }
            ]
          }
        ],
        titles: [
          {
            title: "ESA WorldCover 2021 10m v200",
            titleType: "AlternativeTitle",
            lang: "en"
          }
        ],
        publisher: "ESA",
        publicationYear: "2024",
        resourceType: {
          resourceTypeGeneral: "Dataset",
          resourceType: "Land Cover Map"
        },
        subjects: [
          {
            subject: "Land Cover",
            subjectScheme: "keyword"
          },
          {
            subject: "Earth Observation",
            subjectScheme: "keyword"
          },
          {
            subject: "Machine Learning",
            subjectScheme: "keyword"
          }
        ],
        contributors: [
          {
            name: "WorldCover Project Consortium",
            nameType: "Organizational",
            contributorType: "Producer"
          }
        ],
        dates: [
          {
            date: "2024-01-25",
            dateType: "Created"
          },
          {
            date: "2024-02-07",
            dateType: "Updated"
          }
        ],
        language: "en",
        version: "2.0.0"
      }
    },
    visibility: "public",
    stats: {
      size: 1024 * 1024 * 1024 * 1024 * 2, // 2TB
      fileCount: 28000,
      lastUpdated: "2024-02-07T23:00:00Z",
    },
  },
  {
    id: "3dep",
    accountId: "usgs",
    name: "3dep-lidar",
    meta: {
      title: "USGS 3D Elevation Program (3DEP)",
      description: "High-quality topographic lidar data for the United States. Provides detailed elevation measurements with point densities of 2-20 points per square meter, supporting applications in flood risk management, infrastructure planning, and natural resource management.",
      tags: ["lidar", "elevation", "topography", "3D", "point-cloud", "DEM", "terrain"],
      createdAt: "2024-01-18T00:00:00Z",
      updatedAt: "2024-02-08T00:00:00Z",
      doi: "10.5066/P9XBUMZF",
      dataCite: {
        doi: "10.5066/P9XBUMZF",
        creators: [
          {
            name: "United States Geological Survey",
            nameType: "Organizational",
            nameIdentifiers: [
              {
                nameIdentifier: "https://ror.org/035a68863",
                nameIdentifierScheme: "ROR",
                schemeURI: "https://ror.org"
              }
            ]
          }
        ],
        titles: [
          {
            title: "USGS 3DEP Lidar Point Cloud",
            titleType: "AlternativeTitle",
            lang: "en"
          }
        ],
        publisher: "USGS",
        publicationYear: "2024",
        resourceType: {
          resourceTypeGeneral: "Dataset",
          resourceType: "Point Cloud"
        },
        subjects: [
          {
            subject: "Elevation",
            subjectScheme: "keyword"
          },
          {
            subject: "Lidar",
            subjectScheme: "keyword"
          },
          {
            subject: "Topography",
            subjectScheme: "keyword"
          }
        ],
        contributors: [
          {
            name: "National Geospatial Program",
            nameType: "Organizational",
            contributorType: "DataManager"
          }
        ],
        dates: [
          {
            date: "2024-01-18",
            dateType: "Created"
          },
          {
            date: "2024-02-08",
            dateType: "Updated"
          }
        ],
        language: "en",
        version: "2.1"
      }
    },
    visibility: "public",
    stats: {
      size: 1024 * 1024 * 1024 * 1024 * 15, // 15TB
      fileCount: 52000,
      lastUpdated: "2024-02-08T00:00:00Z",
    },
  },
  {
    id: "mrms",
    accountId: "noaa",
    name: "multi-radar-multi-sensor",
    meta: {
      title: "NOAA Multi-Radar/Multi-Sensor System (MRMS)",
      description: "High-resolution precipitation estimates and other derived products combining multiple radar, satellite, and surface observation networks. Provides near-real-time quantitative precipitation estimation, severe weather detection, and aviation products at 1km resolution.",
      tags: ["radar", "precipitation", "weather", "multi-sensor", "QPE", "real-time", "NOAA"],
      createdAt: "2024-01-22T00:00:00Z",
      updatedAt: "2024-02-08T01:00:00Z",
      doi: "10.7289/V5BG2M4G",
      dataCite: {
        doi: "10.7289/V5BG2M4G",
        creators: [
          {
            name: "National Severe Storms Laboratory",
            nameType: "Organizational",
            nameIdentifiers: [
              {
                nameIdentifier: "https://ror.org/05g10kt65",
                nameIdentifierScheme: "ROR",
                schemeURI: "https://ror.org"
              }
            ]
          }
        ],
        titles: [
          {
            title: "MRMS Quantitative Precipitation Estimates",
            titleType: "AlternativeTitle",
            lang: "en"
          }
        ],
        publisher: "NOAA",
        publicationYear: "2024",
        resourceType: {
          resourceTypeGeneral: "Dataset",
          resourceType: "Radar Data"
        },
        subjects: [
          {
            subject: "Precipitation",
            subjectScheme: "keyword"
          },
          {
            subject: "Weather Radar",
            subjectScheme: "keyword"
          },
          {
            subject: "Severe Weather",
            subjectScheme: "keyword"
          }
        ],
        contributors: [
          {
            name: "National Weather Service",
            nameType: "Organizational",
            contributorType: "DataCollector"
          }
        ],
        dates: [
          {
            date: "2024-01-22",
            dateType: "Created"
          },
          {
            date: "2024-02-08",
            dateType: "Updated"
          }
        ],
        language: "en",
        version: "12.1"
      }
    },
    visibility: "public",
    stats: {
      size: 1024 * 1024 * 1024 * 300, // 300GB
      fileCount: 12000,
      lastUpdated: "2024-02-08T01:00:00Z",
    },
  }
];

# NASA Earth Observation Data Repository

## Overview

This repository contains satellite imagery and derived data products from NASA Earth observation missions. It includes data from multiple instruments and satellites, including Landsat, MODIS, VIIRS, and other platforms.

## Data Products

| Dataset | Resolution | Coverage | Update Frequency |
|---------|------------|----------|------------------|
| MODIS Land Surface Temperature | 1km | Global | Daily |
| Landsat Surface Reflectance | 30m | Global | 16 days |
| GPM Precipitation | 10km | 60°N-60°S | 3 hours |
| SMAP Soil Moisture | 9km | Global Land | 3 days |
| SRTM Digital Elevation | 30m | 60°N-60°S | Static |

## Access Methods

### Direct File Access

```bash
# Example of accessing a Landsat scene
aws s3 cp s3://nasa-landsat/LC08/01/044/034/LC08_L1TP_044034_20230615_20230703_02_T1/ . --recursive
```

### Programmatic Access

```python
import rasterio
import numpy as np

# Example of reading a GeoTIFF file
with rasterio.open('LC08_L1TP_044034_20230615_20230703_02_T1_B4.TIF') as src:
    # Read the raster band as a numpy array
    red_band = src.read(1)
    
    # Get metadata
    metadata = src.meta
    
    # Print statistics
    print(f"Min: {np.min(red_band)}, Max: {np.max(red_band)}")
```

## Data Processing Workflow

1. **Data Acquisition**
   - Satellite raw data collection
   - Downlink to ground stations
   - Initial quality checks

2. **Pre-processing**
   - Radiometric calibration
   - Geometric correction
   - Atmospheric correction

3. **Product Generation**
   - Apply science algorithms
   - Create Level 2+ products
   - Quality assurance

4. **Data Distribution**
   - Format standardization
   - Metadata creation
   - Archive and distribution

## Citation

When using this data in your research, please cite:

> NASA/GSFC (2023). NASA Earth Observation Data Repository. NASA Earth Science Data and Information System. [Dataset] Available: https://source.coop/nasa/earth-observation-data

## License

This data is available under the [NASA Open Data Policy](https://www.nasa.gov/open-data/). 
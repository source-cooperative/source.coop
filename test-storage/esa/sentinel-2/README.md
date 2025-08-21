# Sentinel-2 Level-2A Surface Reflectance Products

## Overview

This repository contains atmospherically corrected surface reflectance products from the Sentinel-2 mission. The data is processed to Level-2A, providing Bottom-Of-Atmosphere (BOA) reflectance images derived from Level-1C products using Sen2Cor processor.

## 📊 Products

| Band | Description | Resolution | Wavelength (nm) |
|------|-------------|------------|-----------------|
| B02 | Blue | 10m | 490 |
| B03 | Green | 10m | 560 |
| B04 | Red | 10m | 665 |
| B08 | NIR | 10m | 842 |
| B05 | Red Edge 1 | 20m | 705 |
| B06 | Red Edge 2 | 20m | 740 |
| B07 | Red Edge 3 | 20m | 783 |
| B8A | NIR Narrow | 20m | 865 |
| B11 | SWIR 1 | 20m | 1610 |
| B12 | SWIR 2 | 20m | 2190 |
| B01 | Coastal Aerosol | 60m | 443 |
| B09 | Water Vapor | 60m | 940 |
| B10 | Cirrus | 60m | 1375 |

## 🗂️ Repository Structure

```
sentinel-2/
├── tiles/
│   ├── 31/
│   │   ├── U/
│   │   │   ├── FU/
│   │   │   │   └── 2024/
│   │   │   │       └── 2/
│   │   │   │           └── 15/
│   │   │   │               └── S2A_MSIL2A_20240215T103021_N0509_R108_T31UFU_20240215T124356.SAFE/
│   └── ...
├── metadata/
│   ├── tiles.geojson
│   └── orbit_paths.geojson
└── stac/
    ├── catalog.json
    └── collection.json
```

## 📝 Data Format

Products are provided in JPEG2000 format within a SAFE container:
```
S2A_MSIL2A_20240215T103021_N0509_R108_T31UFU_20240215T124356.SAFE/
├── MTD_MSIL2A.xml
├── GRANULE/
│   └── L2A_T31UFU_A012345_20240215T103021/
│       ├── IMG_DATA/
│       │   ├── R10m/
│       │   ├── R20m/
│       │   └── R60m/
│       ├── QI_DATA/
│       └── MTD_TL.xml
├── AUX_DATA/
└── rep_info/
```

## 🛰️ Mission Coverage

| Satellite | Launch Date | Revisit Time | Coverage |
|-----------|-------------|--------------|----------|
| Sentinel-2A | June 23, 2015 | 10 days | Global |
| Sentinel-2B | March 7, 2017 | 10 days | Global |
| Combined | - | 5 days | Global |

## 📊 Data Statistics

- Scene Size: 100x100 km
- File Size: ~800MB per scene
- Daily Scenes: ~2,000
- Global Coverage: Every 5 days
- Temporal Coverage: 2015-present

## 🛠️ Usage Examples

### Python with rasterio
```python
import rasterio
from rasterio.plot import show

# Read red and NIR bands
with rasterio.open('B04.jp2') as red:
    red_img = red.read(1)
    
with rasterio.open('B08.jp2') as nir:
    nir_img = nir.read(1)

# Calculate NDVI
ndvi = (nir_img - red_img) / (nir_img + red_img)
```

## 🔄 Update Schedule

- New acquisitions: Within 24 hours
- Historical data: Complete archive available
- Reprocessing: Baseline updates every ~18 months

## 📦 Data Access

### Cloud Access
- AWS: `s3://sentinel-s2-l2a`
- Google Cloud: `gs://gcp-public-data-sentinel-2`
- Azure: `https://sentinel2l2a01.blob.core.windows.net`

## 🛠️ Tools & Resources

- [Sen2Cor](https://step.esa.int/main/snap-supported-plugins/sen2cor/)
- [SNAP Toolbox](https://step.esa.int/main/toolboxes/snap/)
- [Sentinel Hub](https://www.sentinel-hub.com/)

## 📄 License

This data is released under the [Copernicus License](https://scihub.copernicus.eu/twiki/pub/SciHubWebPortal/TermsConditions/Sentinel_Data_Terms_and_Conditions.pdf).

## 📞 Contact

- Email: EOSupport@copernicus.esa.int
- Website: https://sentinel.esa.int
- Twitter: @ESA_EO

## 🔗 Related Resources

- [Copernicus Open Access Hub](https://scihub.copernicus.eu/)
- [Sentinel Online](https://sentinel.esa.int/web/sentinel/home)
- [ESA Data Quality Reports](https://sentinels.copernicus.eu/web/sentinel/data-product-quality-reports) 
# GOES-R Series ABI Level 2 Products

## Overview

This repository contains Level 2 products from the Advanced Baseline Imager (ABI) instrument aboard the GOES-R Series satellites (GOES-16, GOES-17, GOES-18). The data includes various atmospheric, land, and ocean products derived from ABI's 16 spectral bands.

## 📊 Products

| Product                  | Description                | Resolution | Update Frequency |
| ------------------------ | -------------------------- | ---------- | ---------------- |
| Cloud Mask               | Binary cloud detection     | 2km        | 5 min            |
| Cloud Top Height         | Cloud top height in meters | 2km        | 15 min           |
| Land Surface Temperature | Surface skin temperature   | 2km        | 5 min            |
| Sea Surface Temperature  | Ocean surface temperature  | 2km        | 15 min           |
| Aerosol Detection        | Smoke and dust detection   | 2km        | 5 min            |

## 🗂️ Repository Structure

```
goes-collection/
├── goes16/
│   ├── CONUS/
│   ├── Full_Disk/
│   └── Mesoscale/
├── goes17/
│   ├── CONUS/
│   ├── Full_Disk/
│   └── Mesoscale/
├── goes18/
│   ├── CONUS/
│   ├── Full_Disk/
│   └── Mesoscale/
└── stac/
    ├── catalog.json
    ├── goes16.json
    ├── goes17.json
    └── goes18.json
```

## 📝 Data Format

All products are provided in NetCDF-4 format with the following naming convention:

```
OR_{platform}_ABI-L2-{product}_{domain}_{start_time}.nc
```

Example:

```
OR_GOES18-ABI-L2-LST-FD_G18_s20240215000000_e20240215000999_c20240215001234.nc
```

## 🛰️ Satellite Coverage

| Satellite      | Position | Primary Coverage    |
| -------------- | -------- | ------------------- |
| GOES-16 (East) | 75.2°W   | Atlantic, Americas  |
| GOES-17 (West) | 137.2°W  | Pacific, Western US |
| GOES-18 (West) | 137.2°W  | Pacific, Western US |

## 📊 Data Statistics

- Full Disk: Every 10 minutes
- CONUS: Every 5 minutes
- Mesoscale: Every 1 minute
- File Size: ~30MB per product
- Daily Volume: ~2TB

## 🛠️ Usage Examples

### Python with xarray

```python
import xarray as xr

# Read LST data
ds = xr.open_dataset('goes18/Full_Disk/LST/OR_GOES18-ABI-L2-LST-FD_G18_latest.nc')

# Get temperature data
temp = ds['LST'].data

# Get quality flags
qc = ds['DQF'].data
```

## 🔄 Update Schedule

- Real-time data: 5-15 minute latency
- Historical data: Available back to satellite launch
- Reprocessing: As needed for algorithm updates

## 📦 Data Access

### Direct Access

- HTTPS: `https://noaa-goes18.s3.amazonaws.com/`
- AWS S3: `s3://noaa-goes18/`
- Google Cloud: `gs://gcp-public-data-goes-18/`

## 🛠️ Tools & Resources

- [GOES Tools](https://github.com/blaylockbk/goes2go)
- [Satpy](https://github.com/pytroll/satpy)
- [GOES-R Product Browser](https://www.star.nesdis.noaa.gov/GOES/index.php)

## 📄 License

This data is released under the [U.S. Government Work](https://www.usa.gov/government-works) license.

## 📞 Contact

- Email: goes-r@noaa.gov
- Website: https://www.goes-r.gov
- Twitter: @NOAASatellites

## 🔗 Related Resources

- [GOES-R Series Program](https://www.goes-r.gov/)
- [NOAA Satellite Products](https://www.ospo.noaa.gov/Products/atmosphere/index.html)
- [Algorithm Theoretical Basis Documents](https://www.star.nesdis.noaa.gov/goesr/documentation_ATBDs.php)

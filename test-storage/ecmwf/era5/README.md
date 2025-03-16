# ERA5 Reanalysis Dataset

## Overview

ERA5 is the fifth generation ECMWF atmospheric reanalysis of the global climate. ERA5 provides hourly estimates of a large number of atmospheric, land and oceanic climate variables. The data cover the Earth on a 30km grid and resolve the atmosphere using 137 levels from the surface up to a height of 80km.

## 📊 Data Products

| Variable Type | Examples | Resolution | Update Frequency |
|--------------|----------|------------|------------------|
| Atmospheric | Temperature, Wind, Humidity | 31km | Hourly |
| Surface | Precipitation, Radiation | 31km | Hourly |
| Soil | Temperature, Moisture | 31km | Hourly |
| Ocean Wave | Height, Direction | 31km | Hourly |

## 🗂️ Repository Structure

```
era5/
├── hourly/
│   ├── pressure_levels/
│   │   ├── temperature/
│   │   ├── geopotential/
│   │   └── wind/
│   └── single_levels/
│       ├── 2m_temperature/
│       ├── precipitation/
│       └── radiation/
├── monthly/
│   ├── means/
│   └── statistics/
└── stac/
    ├── catalog.json
    └── collection.json
```

## 📝 Data Format

Data is provided in NetCDF-4 format with the following specifications:

```
Format: NetCDF-4
Compression: Deflate level 4
Chunking: Optimized for time series access
Dimensions: Time, Latitude, Longitude, Level (where applicable)
Conventions: CF-1.7
Calendar: Proleptic Gregorian
```

## 🌍 Coverage

| Parameter | Value |
|-----------|-------|
| Spatial | Global |
| Temporal | 1940-present |
| Horizontal | 0.25° (~31km) |
| Vertical | 137 levels |
| Time Step | Hourly |

## 📊 Data Statistics

- Grid Size: 721 x 1440 points
- File Size: ~500MB per variable per month
- Daily Volume: ~12GB
- Total Archive: >2PB
- Variables: >250

## 🛠️ Usage Examples

### Python with xarray
```python
import xarray as xr

# Open dataset
ds = xr.open_dataset('temperature_2m_2024.nc')

# Select region and time
temp = ds.sel(
    latitude=slice(50, 60),
    longitude=slice(-10, 0),
    time='2024-02-15'
)

# Calculate daily mean
daily_mean = temp.resample(time='1D').mean()
```

### CDO Command Line
```bash
# Extract temperature at 850hPa
cdo -sellevel,85000 input.nc output.nc

# Calculate monthly means
cdo monmean input.nc output.nc

# Spatial subsetting
cdo sellonlatbox,-10,0,50,60 input.nc output.nc
```

## 🔄 Update Schedule

- Preliminary data: 5-day delay
- Final data: 2-3 months delay
- Reanalysis updates: Continuous improvement
- Quality control: Automated and manual

## 📦 Data Access

### Cloud Access
- AWS: `s3://era5-pds`
- Google Cloud: `gs://gcp-public-data-era5`
- ECMWF API: CDS Web API

### Direct Access
- Copernicus Climate Data Store
- ECMWF MARS Archive
- Web Coverage Service (WCS)

## 🛠️ Tools & Resources

- [CDS Toolbox](https://cds.climate.copernicus.eu/toolbox/doc/index.html)
- [Climate Data Operators (CDO)](https://code.mpimet.mpg.de/projects/cdo)
- [xarray](https://xarray.pydata.org/)

## 📄 License

This data is released under the [Copernicus License](https://cds.climate.copernicus.eu/api/v2/terms/static/licence-to-use-copernicus-products.pdf).

## 📞 Contact

- Email: copernicus-support@ecmwf.int
- Website: https://www.ecmwf.int/en/forecasts/datasets/reanalysis-datasets/era5
- Support: https://cds.climate.copernicus.eu/support

## 🔗 Related Resources

- [ERA5 Documentation](https://confluence.ecmwf.int/display/CKB/ERA5%3A+data+documentation)
- [Quality Assurance](https://confluence.ecmwf.int/display/CKB/ERA5%3A+quality+assurance)
 
# NOAA Weather and Climate Data Repository

## About This Repository

This repository contains comprehensive weather and climate data collected by the National Oceanic and Atmospheric Administration (NOAA). The datasets span historical records, real-time observations, and future projections, supporting diverse applications from operational forecasting to climate research.

## Available Datasets

<details>
<summary><strong>Observational Data</strong></summary>

* Surface Weather Observations
* Upper Air Soundings
* Radar Data (NEXRAD)
* Satellite Imagery
* Buoy and Ship Reports
* Aircraft Reports

</details>

<details>
<summary><strong>Model Output</strong></summary>

* Global Forecast System (GFS)
* North American Mesoscale (NAM)
* High-Resolution Rapid Refresh (HRRR)
* Climate Forecast System (CFS)
* Wave Models (WaveWatch III)

</details>

<details>
<summary><strong>Climate Data</strong></summary>

* Global Historical Climatology Network
* Climate Normals
* Drought Indices
* Sea Surface Temperature Records
* Climate Extremes Indices

</details>

## Data Formats

Most datasets are available in one or more of the following formats:

* NetCDF (`.nc`)
* GRIB2 (`.grib2`)
* CSV (`.csv`)
* JSON (`.json`)
* GeoTIFF (`.tif`)

## Example Data Exploration

```r
# Example R code for working with NOAA data
library(ncdf4)
library(ggplot2)
library(dplyr)

# Open NetCDF file
nc_file <- nc_open("gfs.t00z.pgrb2.0p25.f024.nc")

# Extract temperature variable
temp <- ncvar_get(nc_file, "TMP_2maboveground")
lon <- ncvar_get(nc_file, "lon")
lat <- ncvar_get(nc_file, "lat")

# Create data frame
df <- expand.grid(lon = lon, lat = lat)
df$temperature <- as.vector(temp)

# Plot global temperature
ggplot(df, aes(x = lon, y = lat, fill = temperature)) +
  geom_raster() +
  scale_fill_gradientn(colors = rainbow(10)) +
  coord_equal() +
  theme_minimal() +
  labs(title = "Global Temperature at 2m Above Ground",
       fill = "Temp (K)")
```

## Data Quality Information

| Dataset | Spatial Resolution | Temporal Resolution | Known Limitations |
|---------|-------------------|---------------------|-------------------|
| NEXRAD Level II | ~1 km | 5-10 minutes | Beam blockage in mountainous terrain |
| GHCN-D | Station-based | Daily | Spatial coverage varies over time |
| GFS | 0.25° × 0.25° | 3-hourly to 16 days | Accuracy decreases with forecast lead time |
| SST Analysis | 0.25° × 0.25° | Daily | Cloud contamination in satellite retrievals |

## Supporting Documentation

For detailed information about specific datasets, please refer to:

* [NOAA Technical Report NWS 44](https://www.weather.gov/documentation/services-web-api)
* [Global Forecast System Documentation](https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/gfs.php)
* [Climate Data Documentation](https://www.ncei.noaa.gov/products)

## License and Usage

This data is provided by NOAA and is in the public domain. Users are free to use, share, and adapt these data with appropriate attribution.

## How to Cite

> National Oceanic and Atmospheric Administration (2023). Weather and Climate Data Repository. NOAA National Centers for Environmental Information. 
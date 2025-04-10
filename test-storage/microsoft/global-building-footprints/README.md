# Microsoft Global Building Footprints

## Overview

This repository contains building footprints derived from satellite imagery using Microsoft's computer vision algorithms. The data covers multiple regions worldwide and is provided in various formats including GeoJSON, Parquet, and SQLite.

## 📊 Repository Statistics

| Region        | Building Count | Coverage (km²) | Last Updated |
| ------------- | -------------- | -------------- | ------------ |
| Africa        | 123,456,789    | 2,500,000      | 2024-03-01   |
| Asia          | 234,567,890    | 3,750,000      | 2024-02-28   |
| Europe        | 145,678,901    | 1,800,000      | 2024-02-15   |
| North America | 98,765,432     | 2,100,000      | 2024-03-10   |

## 🗂️ Data Organization

```
global-building-footprints/
├── africa/
│   ├── country_stats.csv
│   ├── buildings.parquet
│   └── metadata.json
├── asia/
│   ├── region_index.sqlite
│   ├── buildings.parquet
│   └── coverage.geojson
├── europe/
│   ├── buildings.parquet
│   └── validation_results.json
└── north_america/
    ├── buildings.parquet
    ├── quality_metrics.csv
    └── temporal_analysis.json
```

## 📝 Data Format

### Parquet Schema

```sql
CREATE TABLE buildings (
    building_id STRING,
    geometry STRING,
    confidence FLOAT,
    area_sqm FLOAT,
    height_m FLOAT,
    type STRING,
    last_updated TIMESTAMP
);
```

### GeoJSON Feature Example

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[lon1, lat1], [lon2, lat2], ...]]
  },
  "properties": {
    "building_id": "USA_NY_123456",
    "confidence": 0.98,
    "area_sqm": 245.7,
    "height_m": 12.3,
    "type": "residential",
    "last_updated": "2024-03-14T12:00:00Z"
  }
}
```

## 📈 Quality Metrics

<div class="metrics-container">
  <div class="metric-card">
    <h3>Precision</h3>
    <div class="metric-value">98.5%</div>
    <p>Based on manual validation</p>
  </div>
  <div class="metric-card">
    <h3>Recall</h3>
    <div class="metric-value">96.2%</div>
    <p>Compared to ground truth</p>
  </div>
</div>

## 🛠️ Usage Examples

### Python with GeoPandas

```python
import geopandas as gpd
import pandas as pd

# Read Parquet data
buildings = pd.read_parquet('africa/buildings.parquet')
gdf = gpd.GeoDataFrame(buildings)

# Calculate area statistics
total_area = gdf.area.sum()
print(f"Total building area: {total_area:,.2f} m²")
```

### R with sf

```r
library(sf)
library(arrow)

# Read and process buildings
buildings <- read_parquet("europe/buildings.parquet") %>%
  st_as_sf(wkt = "geometry")

# Plot density
plot(buildings["height_m"], main="Building Heights")
```

### SQL with DuckDB

```sql
-- Load Parquet data
CREATE TABLE buildings AS
SELECT * FROM read_parquet('*.parquet');

-- Calculate statistics by region
SELECT
  region,
  COUNT(*) as building_count,
  AVG(area_sqm) as avg_area,
  SUM(area_sqm) as total_area
FROM buildings
GROUP BY region;
```

## 📊 Validation Results

| Metric    | Value | Description                               |
| --------- | ----- | ----------------------------------------- |
| IoU Score | 0.91  | Intersection over Union with ground truth |
| F1 Score  | 0.94  | Harmonic mean of precision and recall     |
| RMSE      | 1.2m  | Root Mean Square Error in position        |

## 🔄 Update Frequency

> Data is updated monthly with new satellite imagery
>
> - Major regions: Monthly updates
> - Rural areas: Quarterly updates
> - Validation sets: Bi-annual updates

## 🤝 Contributing

We welcome contributions! Please see our [contribution guidelines](CONTRIBUTING.md).

### Quality Requirements

1. Minimum confidence score: 0.75
2. Spatial accuracy: < 2m RMSE
3. Complete metadata
4. Validation results included

## 📄 License

This dataset is licensed under the Open Data Commons Open Database License (ODbL).

## 🔗 Related Resources

- [Technical Documentation](docs/technical.md)
- [Validation Methodology](docs/validation.md)
- [Change Log](CHANGELOG.md)
- [API Reference](docs/api.md)

## 📞 Contact

For questions or support:

- 📧 Email: buildings@microsoft.com
- 🌐 Website: https://microsoft.com/buildings
- 💬 Discord: [Join our community](https://discord.gg/microsoftbuildings)
- 🐦 Twitter: @MSFTBuildings

# Machine Learning Training Datasets

A curated collection of high-quality training datasets for Earth observation and remote sensing machine learning applications.

## 📊 Available Datasets

### Building Footprints
- **Ghana Building Footprints**: High-resolution building vectors with validation data
- Coverage: 125,847 buildings across major metropolitan areas
- Format: Parquet (vectors), GeoJSON (validation)
- [View Dataset](building-footprints/ghana/)

### Crop Classification
- **Germany 2023**: Agricultural crop type classification dataset
- Coverage: 158,489 km² across German agricultural regions
- Classes: 15 crop types including wheat, corn, barley, etc.
- Format: Parquet (imagery + labels), CSV (validation)
- [View Dataset](crop-classification/germany-2023/)

### Land Cover
- **Chesapeake Bay**: High-resolution land cover classification
- Coverage: Chesapeake Bay watershed
- Classes: 8 land cover types
- Format: Parquet (tiles), CSV (accuracy)
- [View Dataset](land-cover/chesapeake/)

- **EuroSAT**: Sentinel-2 based land cover classification
- Coverage: European regions
- Classes: 10 land cover types
- Format: Zarr (imagery), Parquet (labels)
- [View Dataset](land-cover/euro-sat/)

## 🔍 Dataset Structure

Each dataset follows a standardized structure:
```
dataset-name/
├── README.md           # Dataset documentation
├── metadata.json       # Dataset metadata and schema
├── stac-metadata.json  # STAC metadata
├── data/              # Core dataset files
├── validation/        # Validation and accuracy data
└── examples/          # Jupyter notebooks with examples
```

## 📈 Quality Metrics

All datasets undergo rigorous quality control:

| Dataset | Accuracy | F1 Score | Validation Method |
|---------|----------|----------|------------------|
| Ghana Buildings | 94.5% | 0.93 | Manual Review |
| Germany Crops | 89.0% | 0.88 | Ground Truth |
| Chesapeake LC | 92.3% | 0.91 | Field Validation |
| EuroSAT | 95.1% | 0.94 | Expert Review |

## 🛠️ Usage

### Python
```python
import pandas as pd
import geopandas as gpd

# Load building footprints
buildings = pd.read_parquet('building-footprints/ghana/vectors.parquet')
gdf = gpd.GeoDataFrame(buildings)

# Load crop classification data
crops = pd.read_parquet('crop-classification/germany-2023/labels.parquet')
```

### R
```r
library(arrow)
library(sf)

# Load land cover data
landcover <- read_parquet("land-cover/chesapeake/tiles.parquet")
```

## 📦 Dependencies

Required packages are listed in each dataset's `requirements.txt`. Core dependencies:
- pandas >= 1.4.0
- geopandas >= 0.10.0
- rasterio >= 1.2.0
- scikit-learn >= 1.0.0
- tensorflow >= 2.8.0

## 🔄 Updates

Datasets are updated according to the following schedule:
- Building Footprints: Monthly
- Crop Classification: Annually (post-growing season)
- Land Cover: Quarterly

## 📄 License

Each dataset has its own license specified in its metadata. Most datasets are released under:
- CC BY-NC-SA 4.0
- CC BY 4.0
- ODC-BY 1.0

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📞 Contact

- Email: ml@radiant.earth
- Website: https://radiant.earth
- Twitter: @RadiantEarthML

## 🔗 Related Resources

- [MLHub Documentation](https://mlhub.earth/docs)
- [Dataset Standards](https://radiant.earth/datasets/standards)
- [API Reference](https://api.radiant.earth/mlhub) 
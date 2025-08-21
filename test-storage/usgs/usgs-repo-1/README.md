# USGS Geological Maps Repository

## Introduction

This repository contains a comprehensive collection of geological maps and associated data produced by the United States Geological Survey. The repository includes various map types across multiple scales, providing fundamental information about the geology of the United States and selected global regions.

## Map Types

### Bedrock Geology Maps
Bedrock geology maps show the distribution of rock types that lie beneath the soil and other surficial materials. These maps typically include:

- Rock unit classifications
- Formation boundaries
- Major structural features
- Age relationships

### Surficial Geology Maps
These maps depict unconsolidated sediments and materials at the Earth's surface, including:

- Glacial deposits
- Alluvial materials
- Colluvium and landslide deposits
- Coastal and estuarine sediments

### Geophysical Maps
Maps showing various geophysical properties of the subsurface:

- Gravity anomalies
- Magnetic field variations
- Radiometric measurements

## Map Series and Scales

| Series | Scale | Coverage | Available Formats |
|--------|-------|----------|-------------------|
| Geologic Map of the United States | 1:2,500,000 | National | PDF, GeoTIFF, Shapefile |
| State Geologic Maps | 1:500,000 | State | PDF, GeoTIFF, Shapefile, GeoPackage |
| Geologic Quadrangles (GQ) | 1:24,000 | Quadrangle | PDF, GeoTIFF |
| Mineral Resource Maps | Various | Regional | PDF, Shapefile |

## Map Access

### Map Viewer
<div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
  <p><strong>Interactive Map Viewer</strong></p>
  <p>Our <a href="#">interactive map viewer</a> allows you to:</p>
  <ul>
    <li>Browse maps by location</li>
    <li>Toggle between different map layers</li>
    <li>Measure distances and areas</li>
    <li>Export custom views</li>
  </ul>
</div>

### API Access Example

```javascript
// Example of accessing map data through the USGS API
const fetchGeologicMap = async (state, mapType) => {
  const url = `https://api.usgs.gov/geology/maps?state=${state}&type=${mapType}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'API-Key': 'YOUR_API_KEY',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error fetching map data:', error);
    return null;
  }
};

// Usage
fetchGeologicMap('California', 'bedrock')
  .then(maps => console.log(`Found ${maps.length} maps`));
```

## Map Legend Example

Below is a simplified legend showing common geological units:

```
Geological Units:
Q   - Quaternary deposits
T   - Tertiary sedimentary rocks
Tv  - Tertiary volcanic rocks
K   - Cretaceous rocks
J   - Jurassic rocks
Tr  - Triassic rocks
P   - Permian rocks
C   - Carboniferous rocks
D   - Devonian rocks
S   - Silurian rocks
O   - Ordovician rocks
Є   - Cambrian rocks
pЄ  - Precambrian rocks

Symbols:
―――  - Contact between geological units
- - - - Inferred contact
━━━  - Fault
⟿   - Thrust fault (triangles on upthrust side)
↗    - Strike and dip of beds
```

## Applications of Geological Maps

1. **Resource Exploration**
   - Identification of potential mineral resources
   - Oil and gas exploration
   - Groundwater resource assessment

2. **Hazard Assessment**
   - Landslide susceptibility
   - Earthquake hazard evaluation
   - Flood-prone areas

3. **Land Use Planning**
   - Construction suitability
   - Environmental protection
   - Archaeological investigations

4. **Education and Research**
   - Understanding Earth history
   - Regional geological correlations
   - Tectonic and structural analyses

## Citation

When using these maps in publications, please cite:

> U.S. Geological Survey, 2023, Geological Maps Repository: U.S. Geological Survey data release, https://source.coop/usgs/geological-maps-repository

## License

All data in this repository is in the public domain and may be used freely. However, please provide attribution when using these materials in derived products or publications. 
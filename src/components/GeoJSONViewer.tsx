import { Box, Text } from "theme-ui";
import { useRef } from "react";
import { useState } from "react";
import { useEffect } from "react";

import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { useGeographic } from "ol/proj";
import VectorTile from "ol/layer/VectorTile";
import { PMTilesVectorSource } from "ol-pmtiles";
import { Style, Stroke, Fill } from "ol/style";
import GeoJSON from "ol/format/GeoJSON.js";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector.js";

import { defaults as defaultControls } from "ol/control.js";

export default function GeoJSONViewer({ url }) {
  const mapElement = useRef();
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const source = new VectorSource({
      url: url,
      //url: "https://gist.githubusercontent.com/kbgg/e1054aa8bf418c95edfc681299b2d4d8/raw/2f967882cb2956d98a647a3cb97d9fc08ef3f31c/sample.geojson",
      format: new GeoJSON(),
    });

    source.on("featuresloadstart", (e) => {
      setLoading(true);
    });

    source.on("featuresloadend", (e) => {
      setLoading(false);
      m.getView().fit(source.getExtent());
    });

    source.on("featuresloaderror", (e) => {
      setError(true);
    });

    const layer = new VectorLayer({
      declutter: true,
      source: source,
      style: new Style({
        stroke: new Stroke({
          color: "gray",
          width: 1,
        }),
        fill: new Fill({
          color: "rgba(20,20,20,0.9)",
        }),
      }),
    });

    useGeographic();

    const displayFeatureInfo = function (pixel) {
      layer.getFeatures(pixel).then(function (features) {
        const feature = features.length ? features[0] : undefined;
        const info = document.getElementById("info");
      });
    };

    const m = new Map({
      target: mapElement.current,
      controls: defaultControls(),
      layers: [
        new TileLayer({
          source: new XYZ({
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          }),
        }),
        layer,
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
    });

    m.on("click", function (evt) {
      displayFeatureInfo(evt.pixel);
    });

    setMap(m);

    return () => m.setTarget(null);
  }, []);

  return (
    <>
      <Box
        sx={{
          width: "100%",
          height: "50vh",
          position: "relative",
          p: 1,
          backgroundColor: "primary",
        }}
        ref={mapElement}
        className="map-container"
      >
        <Box
          sx={{
            position: "absolute",
            opacity: "0.8",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
            left: 1,
            right: 1,
            top: 1,
            bottom: 1,
            backgroundColor: "background",
            display: loading || error ? "flex" : "none",
          }}
        >
          <Text
            sx={{
              fontFamily: "mono",
              fontSize: 5,
              clipPath: !error ? "inset(0 3ch 0 0)" : null,
              animation: !error ? "l 1.5s steps(4) infinite" : null,
            }}
          >
            {error ? "Error Loading File" : "Loading..."}
          </Text>
        </Box>
      </Box>
    </>
  );
}

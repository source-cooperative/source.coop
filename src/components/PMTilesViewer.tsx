
import { Box, Flex, Text } from 'theme-ui';
import { useRef } from 'react';
import { useState } from 'react';
import { useEffect } from 'react';


import Overlay from 'ol/Overlay.js';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { useGeographic } from 'ol/proj';
import VectorTile from "ol/layer/VectorTile";
import { PMTilesVectorSource } from "ol-pmtiles";
import { Style, Stroke, Fill } from 'ol/style';
import {Control, defaults as defaultControls} from 'ol/control.js';
import SourceButton from "@/components/Button";

class ZoomInControl extends Control {
    constructor(opt_options) {
        const options = opt_options || {};
    
        const buttonRef = useRef();
        const button = <Box ref={buttonRef} onClick={(e) => {
            this.getMap().getView().setRotation(0);
        }}>Zoom In</Box>;
    
        super({
          element: buttonRef.current,
          target: options.target,
        });
    }
}

export default function PMTilesViewer({url}) {
    const mapElement = useRef();
    const popupRef = useRef();
    const [map, setMap] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [selectedFeature, setSelectedFeature] = useState(null);

    useEffect(() => {
        const source = new PMTilesVectorSource({
            url: url,
        });
        
        /*
        source.on("tileloadstart", (e) => {
            setLoading(true);
        });
        */

        /*
        source.on("tileloadend", (e) => {
            setLoading(false);
            m.getView().fit(source.getExtent());
        });
        */

        source.on("tileloaderror", (e) => {
            setError(true);
        });

        const basemapStyle = new Style({
            stroke: new Stroke({
                color: "gray",
                width: 1
            }),
            fill: new Fill({
                color: "black"
            })
        })
        
        const style = new Style({
            stroke: new Stroke({
              color: "black",
              width: 1,
            }),
            fill: new Fill({
              color: "black",
            }),
        })

        const layer = new VectorTile({
            declutter: true,
            source: source,
            style: (feature) => {
                const color = feature.get('COLOR') || "black";
                style.getFill().setColor(color);
                return style;
            }
        });
        useGeographic();

        const displayFeatureInfo = function (pixel) {
            layer.getFeatures(pixel).then(function (features) {
              const feature = features.length ? features[0] : undefined;
              if (features.length) {
                feature["COLOR"] = "gray";
                var props = []
                Object.keys(feature.getProperties()).forEach((k, i) => {
                    props.push([k, feature.getProperties()[k]])
                })
                setSelectedFeature(props);
              } else {
                overlay.setPosition(undefined);
                setSelectedFeature(null);
              }
            });
        };

        const overlay = new Overlay({
            element: popupRef.current,
            autoPan: {
              animation: {
                duration: 250,
              },
            },
        });

        const m = new Map({
            target: mapElement.current,
            controls: [],
            layers: [
                new VectorTile({
                    source: new PMTilesVectorSource({
                        url: "https://r2-public.protomaps.com/protomaps-sample-datasets/protomaps-basemap-opensource-20230408.pmtiles"
                    }),
                    style: (feature) => {
                        const color = feature.get('COLOR') || "white";
                        basemapStyle.getFill().setColor(color);
                        return basemapStyle;
                    }
              }),
              layer
            ],
            overlays: [overlay],
            view: new View({
              center: [0, 0],
              zoom: 0
            })
          });

        m.on('click', function (evt) {
          const coordinate = evt.coordinate;
          displayFeatureInfo(evt.pixel);
          overlay.setPosition(coordinate);
        });

        setMap(m);

        return () => m.setTarget(null);
    }, []);

    return (<>
        <Box sx={{width: "100%", height: "50vh", position: "relative", p: 1, backgroundColor: "primary"}} ref={mapElement} className="map-container">
            <Box sx={{position: "absolute", zIndex: 998, top: 2, left: 2}}>
                <Box ref={popupRef} sx={{backgroundColor: "background", color: "text", fontFamily: "mono", fontSize: 0, padding: 1, borderWidth: 2, borderStyle: "solid", borderColor: "primary"}}>
                    {
                        selectedFeature ? selectedFeature.map((k, i) => {
                            return <Box key={`prop-${i}`}>{k[0]}:{k[1]}</Box>
                        }) : <></>
                    }
                </Box>
                <Flex sx={{flexDirection: "column", gap: 1}}>
                <Flex sx={{
                    backgroundColor: "background",
                    fontFamily: "mono",
                    color: "text",
                    fontSize: 3,
                    textAlign: "center",
                    cursor: "pointer",
                    width: "25px",
                    height: "25px",
                    userSelect: "none",
                    borderColor: "text",
                    borderWidth: 4,
                    borderStyle: "solid",
                    justifyContent: "center",
                    alignItems: "last baseline"
                }}  onClick={(e) => {map.getView().setZoom(map.getView().getZoom()+1)}}>
                    <Text>+</Text>
                </Flex>
                <Flex sx={{
                    backgroundColor: "background",
                    fontFamily: "mono",
                    color: "text",
                    fontSize: 3,
                    textAlign: "center",
                    cursor: "pointer",
                    width: "25px",
                    height: "25px",
                    userSelect: "none",
                    borderColor: "text",
                    borderWidth: 4,
                    borderStyle: "solid",
                    justifyContent: "center",
                    alignItems: "end"
                }}  onClick={(e) => {map.getView().setZoom(map.getView().getZoom()-1)}}>
                    <Text>-</Text>
                </Flex>
                
                
                </Flex>
            </Box>
            <Box sx={{position: "absolute", opacity: "0.8", justifyContent: "center", alignItems: "center", zIndex: 999, left: 1, right: 1, top: 1, bottom: 1, backgroundColor: "background", display: loading || error ? "flex" : "none"}}>
                <Text sx={{
                    fontFamily: "mono",
                    fontSize: 5,
                    clipPath: !error ? "inset(0 3ch 0 0)" : null,
                    animation: !error ? "l 1.5s steps(4) infinite": null,
                }}>{ error ? "Error Loading File" : "Loading..."}</Text>
            </Box>
        </Box>
        </>
    )
}
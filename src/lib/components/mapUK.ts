import * as d3 from 'd3';

import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as topojson from 'topojson-client';
import { Legend } from '$lib/utils';
import { base } from '$app/paths';

// Topojson files
const LSOAzonesPath = `${base}/maps/LSOA.json`;
const LADzonesPath = `${base}/maps/LAD3.json`;

let datazones = await d3.json(LSOAzonesPath);
datazones = topojson.feature(datazones, datazones.objects['LSOA']);

let LADZones = await d3.json(LADzonesPath);
LADZones = topojson.feature(LADZones, LADZones.objects['LAD_MAY_2022_UK_BFE_V3']);

// Add an id to each feature for mouse hover events later
LADZones.features.forEach((f, i) => {
	f.id = i;
});
datazones.features.forEach((f, i) => {
	f.id = i;
});

export class MapUK {
	colorScale: d3.ScaleDiverging<any>;
	map: maplibregl.Map;
	center: [number, number];
	data: Array<any>;
	component: HTMLElement;
	dataZoneToValue: Record<string, number>;
	tooltip: HTMLElement;
	geojson;
	granularity;
	loaded: boolean;
	dataKey: string;
	zoneKey: string;
	border: boolean;
	colorRange: Array<any>;
	tooltipValueCb: () => string = (v) => `Value: <strong>${v.toFixed(5)}</strong>`;

	constructor(
		data,
		granularity: 'LSOA' | 'LAD',
		component: HTMLElement,
		dataKey = 'val',
		border = false,
		zoneKey = 'Lookup_Value',
		tiles = false,
		colorRange = null,
		zoomLevel = 4
	) {
		this.component = component;
		this.dataZoneToValue = {};
		this.granularity = granularity;
		this.dataKey = dataKey;
		this.zoneKey = zoneKey;
		this.loaded = false;
		this.border = border;

		this.colorRange = colorRange ?? ['red', 'white', 'black'];

		// UK centering
		this.center = [-3.54785, 54.79648]; // Leeds

		this.loadData(data);

		this.map = new maplibregl.Map({
			container: component.id, // container id
			// style: 'https://demotiles.maplibre.org/style.json', // style URL
			style:
				'https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=2400b8d8-5e34-491f-87b0-181af8c12f88',
			// style: {version: 8, sources: {}, layers: []},
			center: this.center, // starting position [lng, lat]
			zoom: zoomLevel, // starting zoom
			preserveDrawingBuffer: true,
			// Disable MapLibre's default attribution control ("info" icon / attribution UI).
			attributionControl: false
		});

		this.tooltip = document.createElement('div');
		this.tooltip.style.position = 'absolute';
		this.tooltip.style.backgroundColor = 'white';
		this.tooltip.style.padding = '5px';
		this.tooltip.style.border = '1px solid black';
		this.tooltip.style.pointerEvents = 'none';
		this.tooltip.style.display = 'none';
		this.component.append(this.tooltip);
	}

	setTooltipCb(cb) {
		this.tooltipValueCb = cb;
	}

	reset() {
		this.dataZoneToValue = {};
		this.loaded = false;
	}

	removeLayers() {
		// Remove all layers from the map
		const layers = this.map.getStyle().layers; // Get all layers in the current map style
		if (layers) {
			layers.forEach((layer) => {
				// console.log("LL ", layer);

				// if (layer.source != "openmaptiles") {
				if (layer.source == 'datazones') {
					this.map.removeLayer(layer.id); // Remove each layer by its id
				}
			});
		}
	}

	removeSources() {
		// Remove all sources from the map
		// const sources = this.map.getStyle().sources;
		// for (const sourceId in sources) {
		//     console.log("SS ", sourceId);
		//     this.map.removeSource(sourceId); // Remove each source by its id
		// }

		this.map.removeSource('datazones'); // Remove each source by its id
	}

	setColorScale(colorScale) {
		this.colorScale = colorScale;
	}

	setCenter(zoneIdCenter) {
		// Lat Long are only in the LAD geojson
		for (let zone of LADZones.features) {
			let zoneId = zone.properties.LAD22CD;

			if (zoneId == zoneIdCenter) {
				this.center = [zone.properties.LONG, zone.properties.LAT];
				this.map.setCenter(this.center);
			}
		}
	}

	loadData(data, type: 'SEF' | 'Cobenefit' = 'Cobenefit') {
		this.data = data;

		let justHighlightArea = false;
		if (!Array.isArray(this.data)) {
			justHighlightArea = true;
		}

		if (justHighlightArea) {
			if (this.granularity != 'LAD') throw 'Only works for LAD';
			this.geojson = LADZones;

			for (let zone of this.geojson.features) {
				let zoneId = this.zoneID(zone);

				if (zoneId == data) {
					this.center = [zone.properties.LONG, zone.properties.LAT];

					zone.properties.value = 1;
				} else {
					zone.properties.value = 0;
				}
			}
		} else {
			if (this.granularity == 'LAD') {
				this.geojson = LADZones;

				data.forEach((d) => {
					// change total for time selection
					this.dataZoneToValue[d[this.zoneKey]] = d[this.dataKey];
				});

				// Put cobenef values inside the geojson for maplibre rendering
				for (let zone of this.geojson.features) {
					let zoneId = this.zoneID(zone);
					zone.properties.value = this.dataZoneToValue[zoneId];
				}
			} else {
				this.geojson = datazones;

				data.forEach((d) => {
					// change total for time selection
					this.dataZoneToValue[d[this.zoneKey]] = d[this.dataKey];
				});

				// Put cobenef values inside the geojson for maplibre rendering
				for (let zone of this.geojson.features) {
					let zoneId = this.zoneID(zone);
					zone.properties.value = this.dataZoneToValue[zoneId];
				}
			}
		}
		console.log('map data ', this.dataZoneToValue, Object.keys(this.dataZoneToValue).length);
		this.geojson.features = this.geojson.features.filter((zone) => zone.properties.value);
		this.makeColorScale(justHighlightArea);
	}

	makeColorScale(justHighlightArea) {
		let domain;
		if (justHighlightArea) {
			domain = [0, 1];
			this.colorScale = d3.scaleLinear().domain(domain).range(['white', 'dimgray']);
		} else {
			domain = d3.extent(this.data.map((d) => d[this.dataKey]));

			// for black/white scales
			if (this.colorRange[0] == 'red') {
				domain.splice(1, 0, 0);
				if (domain[0] >= 0) {
					domain[0] = -1;
				}
			} else {
				domain = d3
					.range(0, this.colorRange.length)
					.map((i) => domain[0] + (i / (this.colorRange.length - 1)) * (domain[1] - domain[0]));
			}

			this.colorScale = d3.scaleLinear().domain(domain).range(this.colorRange); // You can use any colors you want

			// console.log("colorscale ", this.colorScale.domain(), this.colorScale.range())
		}
	}

	loadLayers() {
		// Add data source
		this.map.addSource('datazones', {
			type: 'geojson',
			data: this.geojson
		});

		this.map.addLayer({
			id: 'fill',
			type: 'fill',
			source: 'datazones',
			paint: {
				'fill-color': [
					'interpolate',
					['linear'],
					['get', 'value'], // Replace with your data property
					...this.colorScale.domain().flatMap((d) => [d, this.colorScale(d)])
				],
				'fill-opacity': 1
			}
		});

		// Optional: Add border
		if (this.border) {
			this.map.addLayer({
				id: 'state-borders',
				type: 'line',
				source: 'datazones',
				paint: {
					'line-color': '#000000',
					'line-width': [
						'case',
						['boolean', ['feature-state', 'hover'], false],
						2, // when hovered
						0.2 // default
					]
				}
			});
		} else {
			// Still need the stroke layer for hovering interaction
			this.map.addLayer({
				id: 'state-borders',
				type: 'line',
				source: 'datazones',
				paint: {
					'line-color': '#000000',
					'line-width': [
						'case',
						['boolean', ['feature-state', 'hover'], false],
						2, // when hovered
						0 // default
					]
				}
			});
		}

		const layers = this.map.getStyle().layers;

		// Find label layers (commonly of type 'symbol')
		const labelLayerIds = layers.filter((l) => l.type === 'symbol').map((l) => l.id);

		// Move each label layer to the top
		for (const id of labelLayerIds) {
			// Show every text layer on top except motorways
			if (!id.includes('highway')) {
				this.map.moveLayer(id);
			}
		}

		this.loaded = true;
	}

	initMap(tooltip = true, click = true) {
		this.map.on('style.load', () => {
			this.loadLayers();
		});

		if (tooltip) {
			this.map.on('mousemove', (event) => {
				const zones = this.map.queryRenderedFeatures(event.point, {
					layers: ['fill']
				});

				let zone = zones[0];

				if (zone) {
					// name of LAD or LSOA
					// let name = (zone.properties.LAD22NM ?? zone.properties.LSOA21NM) ?? zone.properties.DZ2021_nm;

					let name;
					if (this.granularity == 'LAD') {
						name = zone.properties.LAD22NM;
					} else {
						name = [zone.properties.LSOA21NM, zone.properties.DZ2021_nm, zone.properties.Name].find((v) => v && v != '');
					}

					// let name = this.zoneID(zone)
					console.log(111, zone.properties);
					let cobenefValue = zone.properties.value;

					this.tooltip.innerHTML = `
                 Zone: <strong>${name}</strong>
                 <br>
                 <strong>${this.tooltipValueCb(cobenefValue)}</strong>
                 `;

					this.tooltip.style.left = event.point.x + 5 + 'px';
					this.tooltip.style.top = event.point.y + 5 + 'px';
					this.tooltip.style.display = 'block';
				} else {
					this.tooltip.style.display = 'none';
				}
			});

			let hoveredFeatureId = null;

			this.map.on('mousemove', 'fill', (e) => {
				if (hoveredFeatureId) {
					this.map.setFeatureState({ source: 'datazones', id: hoveredFeatureId }, { hover: false });
				}
				hoveredFeatureId = e.features[0].id;
				this.map.setFeatureState({ source: 'datazones', id: hoveredFeatureId }, { hover: true });
			});

			this.map.on('mouseleave', 'fill', (e) => {
				if (hoveredFeatureId) {
					this.map.setFeatureState({ source: 'datazones', id: hoveredFeatureId }, { hover: false });
				}
			});
		}

		if (click) {
		this.map.on('click', 'fill', (e) => {
			let feature = e.features[0];
			let lad = feature.properties.LAD22CD;
			window.location.assign(`${base}/location?location=${lad}`);
		});
	}

		// // Listen for zoom events
		// this.map.on('zoom',  () => {
		//     const currentZoom = this.map.getZoom();
		//
		//     // console.log("zz ", currentZoom);
		//     if (currentZoom > 8) {
		//         // Zoom level is greater than the threshold, update the layer
		//         this.granularity = "LSOA"
		//
		//     } else {
		//         // Zoom level is below or equal to the threshold, revert changes
		//     }
		// });
	}

	update = (newData, mapType, loadLayers = false, colorRange) => {
		if (!this.loaded) return;
		this.colorRange = colorRange;

		this.loadData(newData, mapType);

		if (loadLayers) this.loadLayers();

		// Add data source
		this.map.getSource('datazones').setData(this.geojson);

		this.map.setPaintProperty('fill', 'fill-color', [
			'interpolate',
			['linear'],
			['get', 'value'], // Replace with your data property
			...this.colorScale.domain().flatMap((d) => [d, this.colorScale(d)])
		]);
	};

	legend(title = 'Cobenefits (Millions of £)') {
		let legendSvg = Legend(this.colorScale, {
			title: title
		});
		return legendSvg;
	}

	zoneID(zone) {
		let zoneName;
		if (this.granularity == 'LSOA') {
			zoneName = zone.properties.DZ2021_cd;
			if (!zoneName) {
				zoneName = zone.properties.DataZone;
			}
			if (!zoneName) {
				zoneName = zone.properties.LSOA21CD;
			}
		} else {
			// zoneName = zone.properties.lad11cd;
			zoneName = zone.properties.LAD22CD;
		}

		return zoneName;
	}
}

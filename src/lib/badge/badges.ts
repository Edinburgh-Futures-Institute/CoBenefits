import type { BadgeData } from './types';

export const MAJOR_FINDING_BADGE: BadgeData = {
	label: 'Key Finding',
	description:
		'This chart contains what the authors have determined to be one of the most important findings on this page',
	icon: 'badge-check',
	intent: 'CONFIRMATION',
	type: 'CONTEXT'
};

export const INVISIBLE_SMALL_AREAS_BADGE: BadgeData = {
  id: 'invisible-small-areas',
  label: 'Invisible Small Areas',
  intent: 'WARNING',
  description:
    'Some areas too small: Due to the nature of the co-benefits some values are very small in comparison to larger values so therefore are not visable on this plot.'
};

export const SMOOTHED_DATA_BADGE: BadgeData = {
  id: 'smoothed-data',
  label: 'Smoothed Data',
  intent: 'INFORMATION',
  description: 'The curve between points is smoothed to show the general trends.'
};

export const COMPARISON_AVERAGE_BADGE: BadgeData = {
  id: 'comparison-average',
  label: 'UK Average',
  intent: 'INFORMATION',
  description:
    'Light grey indicates the comparison average (e.g., UK average, or the selected comparison option).'
};

export const CAN_FILTER_BADGE: BadgeData = {
  id: 'can-filter',
  label: 'Can Filter',
  intent: 'CONFIRMATION',
  description: 'This view can be filtered (e.g., by co-benefit type) and searched.'
};

export const BACKGROUND_READING_BADGE: BadgeData = {
  label: 'Background Reading Available',
  intent: 'CONFIRMATION',
  icon: 'Confirmation',
  description: 'Read the Methods page for background and details on the data and modelling used in this atlas.',
  type: 'CONTEXT'
};

export const OPEN_DATA_BADGE: BadgeData = {
  label: 'Open Data',
  description:
    'Open data: the underlying dataset used for this atlas is openly available and can be downloaded and reused.',
  intent: 'CONFIRMATION',
  type: 'DATA'
};

export const RAW_DATA_AVAILABLE_BADGE: BadgeData = {
  label: 'Raw Data Available',
  description: 'Raw data: download the page data as a CSV for your own analysis.',
  intent: 'CONFIRMATION',
  type: 'DATA'
};

export const INTERACTIVE_BADGE: BadgeData = {
  id: 'interactive',
  label: 'Interactive',
  intent: 'INFORMATION',
  icon: 'Interactive',
  description:
    'This map is interactive. You can pan and zoom, and click areas to explore values. *Scroll for zooming in and out.'
};

export const PER_CAPITA_MAP_BADGE: BadgeData = {
  id: 'per-capita',
  label: 'Per capita',
  intent: 'INFORMATION',
  description:
    'This chart uses per capita values. i.e. show the cost/benefit per person in each LAD.\nMap tiles © Stadia Maps, © OpenMapTiles, © OpenStreetMap contributors.'
};

export const MODELLED_DATA_BADGE: BadgeData = {
  id: 'modelled-data',
  label: 'Contains Modelled Data',
  intent: 'INFORMATION',
  description:
    'These co-benefits values are modelled estimates. They are based on the underlying scenario guided by CCC\'s 7th Carbon Budget described in the Methods.'
};

export const CORRELATION_NOT_CAUSATION_BADGE: BadgeData = {
  label: 'Correlation ≠ Causation',
  description:
    'Correlation ≠ Causation: The scatter plots represent modelled associations and should not be interpreted as direct causal relationships.',
  intent: 'WARNING'
};

export const AGGREGATED_DATA_BADGE: BadgeData = {
  label: 'Aggregated data',
  description:
    'Each socio-economic factor value for a given local authority is aggregated from the data zones within its boundary.',
  intent: 'INFORMATION'
};

export const BOX_PLOTS_BADGE: BadgeData = {
  label: 'Box plots',
  icon: 'Info',
	description:
		'This box plot shows how the values are distributed. The box covers the middle half of the data, and the line inside the box is the median (the middle value). The whiskers show the typical range of values, and any dots beyond them are unusual outliers. Click to learn more.',
  intent: 'INFORMATION'
};

export const DISCRETE_SCALES_BADGE: BadgeData = {
  label: 'Discrete scales',
  description:
    'Discrete scales: The first set of socio-economic factors are using categorical values where the x-axis is non-linear: EPC, Tenure, Typology, Fuel type, Gas flag, Number of cars.',
  intent: 'INFORMATION'
};

export const TOTAL_VALUES_BADGE: BadgeData = {
  id: 'total-values',
  label: 'Total values',
  intent: 'INFORMATION',
  description: 'This chart uses total values. i.e. shows the total benefit/cost for all of the UK.'
};

export const SEF_BARCHART_BADGE: BadgeData = {
  id: 'sef-barchart',
  label: 'Barchart',
  intent: 'INFORMATION',
  description: 'Each bar represents the normalized frequency of datazones linked to a given social economic factor value.'
};

export type SEFChartBadgeKind = 'distribution' | 'scatterplot';

const SEF_CHART_BADGE_CONFIG: Record<SEFChartBadgeKind, { id: string; label: string; describe: (area: string, compareTo: string) => string }> = {
  distribution: {
    id: 'sef-distribution',
    label: 'Normalised distribution',
    describe: (area, compareTo) =>
      `Data zone distributions for ${area} is normalised for comparison against all data zone distributions across ${compareTo}.`
      // `This distribution plot shows how datazones are spread across values of this factor. It compares ${area} with ${compareTo}.`
  },
  scatterplot: {
    id: 'sef-scatterplot',
    label: 'Scatterplot',
    describe: (area, compareTo) => `Each dot represents a datazone inside ${area}. The cloud shows the distribution for ${compareTo}.`
  }
};

export function makeSEFChartBadge(kind: SEFChartBadgeKind, areaName: string, compareTo: string): BadgeData {
  const cfg = SEF_CHART_BADGE_CONFIG[kind];
  return {
    id: cfg.id,
    label: cfg.label,
    intent: 'INFORMATION',
    description: cfg.describe(areaName, compareTo)
  };
}

import _ from 'lodash';
import { BucketAggregation } from './components/BucketAggregationsEditor/state/types';
import {
  ExtendedStat,
  isMetricAggregationWithField,
  isPipelineAggregation,
  MetricAggregation,
  MovingAverageModelOption,
  MovingAverageSettingDefinition,
  MovingAverageModel,
  MetricAggregationType,
} from './components/MetricAggregationsEditor/state/types';
import { metricAggregationConfig, pipelineOptions } from './components/MetricAggregationsEditor/utils';
import { ElasticsearchQuery } from './types';

export const extendedStats: ExtendedStat[] = [
  { text: 'Avg', value: 'avg', default: false },
  { text: 'Min', value: 'min', default: false },
  { text: 'Max', value: 'max', default: false },
  { text: 'Sum', value: 'sum', default: false },
  { text: 'Count', value: 'count', default: false },
  { text: 'Std Dev', value: 'std_deviation', default: false },
  { text: 'Std Dev Upper', value: 'std_deviation_bounds_upper', default: true },
  { text: 'Std Dev Lower', value: 'std_deviation_bounds_lower', default: true },
];

export const movingAvgModelOptions: MovingAverageModelOption[] = [
  { label: 'Simple', value: 'simple' },
  { label: 'Linear', value: 'linear' },
  { label: 'Exponentially Weighted', value: 'ewma' },
  { label: 'Holt Linear', value: 'holt' },
  { label: 'Holt Winters', value: 'holt_winters' },
];

const alphaSetting: MovingAverageSettingDefinition = { label: 'Alpha', value: 'alpha' };
const betaSetting: MovingAverageSettingDefinition = { label: 'Beta', value: 'beta' };
const minimizeSetting: MovingAverageSettingDefinition = { label: 'Minimize', value: 'minimize', type: 'boolean' };

export const movingAvgModelSettings: Record<MovingAverageModel, MovingAverageSettingDefinition[]> = {
  simple: [],
  linear: [],
  ewma: [alphaSetting, minimizeSetting],
  holt: [alphaSetting, betaSetting, minimizeSetting],
  holt_winters: [
    alphaSetting,
    betaSetting,
    { label: 'Gamma', value: 'gamma' },
    { label: 'Period', value: 'period' },
    { label: 'Pad', value: 'pad', type: 'boolean' },
    minimizeSetting,
  ],
};

export function getMetricAggTypes(esVersion: number) {
  return _.filter(metricAggTypes, f => {
    if (f.minVersion || f.maxVersion) {
      const minVersion = f.minVersion || 0;
      const maxVersion = f.maxVersion || esVersion;
      return esVersion >= minVersion && esVersion <= maxVersion;
    } else {
      return true;
    }
  });
}

export function getPipelineOptions(metric: MetricAggregation) {
  if (!isPipelineAggregation(metric)) {
    return [];
  }

  return pipelineOptions[metric.type];
}

export function getAncestors(target: ElasticsearchQuery, metric?: MetricAggregation) {
  const { metrics } = target;
  if (!metrics) {
    return (metric && [metric.id]) || [];
  }
  const initialAncestors = metric != null ? [metric.id] : ([] as string[]);
  return metrics.reduce((acc: string[], metric) => {
    const includedInField = (metric.field && acc.includes(metric.field)) || false;
    const includedInVariables = metric.pipelineVariables?.some(pv => acc.includes(pv.pipelineAgg ?? ''));
    return includedInField || includedInVariables ? [...acc, metric.id] : acc;
  }, initialAncestors);
}

export function getPipelineAggOptions(target: ElasticsearchQuery, metric?: MetricAggregation) {
  const { metrics } = target;
  if (!metrics) {
    return [];
  }
  const ancestors = getAncestors(target, metric);
  return metrics.filter(m => !ancestors.includes(m.id)).map(m => ({ text: describeMetric(m), value: m.id }));
}

export function getMovingAvgSettings(model: MovingAverageModel, filtered: boolean) {
  const filteredResult: any[] = [];
  if (filtered) {
    _.each(movingAvgModelSettings[model], setting => {
      if (setting.type !== 'boolean') {
        filteredResult.push(setting);
      }
    });
    return filteredResult;
  }
  return movingAvgModelSettings[model];
}

export function getOrderByOptions(target: any) {
  const metricRefs: any[] = [];
  _.each(target.metrics, metric => {
    if (metric.type !== 'count' && !isPipelineAgg(metric.type)) {
      metricRefs.push({ text: describeMetric(metric), value: metric.id });
    }
  });

  return orderByOptions.concat(metricRefs);
}

export function describeOrder(order: string) {
  const def: any = _.find(orderOptions, { value: order });
  return def.text;
}

export function describeMetric(metric: MetricAggregation) {
  if (!isMetricAggregationWithField(metric) && !isPipelineAggregation(metric)) {
    return metricAggregationConfig[metric.type].label;
  }
  return metricAggregationConfig[metric.type].label + ' ' + metric.field;
}

export function describeOrderBy(orderBy: any, target: any) {
  const def: any = _.find(orderByOptions, { value: orderBy });
  if (def) {
    return def.text;
  }
  const metric: any = _.find(target.metrics, { id: orderBy });
  if (metric) {
    return describeMetric(metric);
  } else {
    return 'metric not found';
  }
}

export function defaultMetricAgg(id = '1'): MetricAggregation {
  return { type: 'count', id, hide: false };
}

export function defaultBucketAgg(id = '1'): BucketAggregation {
  return { type: 'date_histogram', id, settings: { interval: 'auto' } };
}

export const findMetricById = (metrics: any[], id: string) => {
  return _.find(metrics, { id: id });
};

export function hasMetricOfType(target: any, type: string): boolean {
  return target && target.metrics && target.metrics.some((m: any) => m.type === type);
}

/**
 * @deprecated TODO: Remove
 */
export function isPipelineAgg(metricType: MetricAggregationType) {
  if (metricType in pipelineOptions) {
    return true;
  }

  return false;
}

/**
 * @deprecated TODO: Remove
 */
export function isPipelineAggWithMultipleBucketPaths(metricType: MetricAggregationType) {
  return !!metricAggregationConfig[metricType].supportsMultipleBucketPaths;
  // return metricAggTypes.find(t => t.value === metricType && t.supportsMultipleBucketPaths) !== undefined;
}

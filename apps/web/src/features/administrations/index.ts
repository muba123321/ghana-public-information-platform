// Browser-safe public parts of the administrations feature. Server code: ./server/queries.
export { AdministrationDirectory } from './components/AdministrationDirectory';
export { AdministrationProfile } from './components/AdministrationProfile';
export { RibbonLegend } from './components/RibbonLegend';
export { TimelineRibbon } from './components/TimelineRibbon';
export * from './labels';
export { filterByKind, parseKind, type RibbonInput, type RibbonSegment } from './timeline';

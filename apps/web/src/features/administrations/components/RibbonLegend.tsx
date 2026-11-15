import styles from './RibbonLegend.module.css';

/** Key for the ribbon's two band colours. */
export function RibbonLegend() {
  return (
    <p className="ribbon-legend">
      <span className={`${styles.swatch} ${styles.swatchCivilian}`} aria-hidden="true" /> Civilian
      government
      <span className={`${styles.swatch} ${styles.swatchMilitary}`} aria-hidden="true" /> Military
      government
    </p>
  );
}

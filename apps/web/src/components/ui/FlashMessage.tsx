import styles from './FlashMessage.module.css';

/** A one-off message after a form action (see server/flash.ts). */
export type Flash = { kind: 'error' | 'note'; text: string };

export function FlashMessage({ flash }: { flash: Flash | null }) {
  if (!flash) return null;
  return flash.kind === 'error' ? (
    <p className="form-error" role="alert">
      {flash.text}
    </p>
  ) : (
    <p className={styles.formNote}>{flash.text}</p>
  );
}

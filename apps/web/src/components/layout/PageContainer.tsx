import type { ReactNode } from 'react';

/** The centred column every public page sits in; `prose` sets long-form reading text. */
export function PageContainer({
  prose = false,
  children,
}: {
  prose?: boolean;
  children: ReactNode;
}) {
  return <div className={prose ? 'container page prose' : 'container page'}>{children}</div>;
}

import { Button } from '@padel-nerdz/ui';
import type { ComponentProps } from 'react';

import { select, tap } from '@/lib/feedback';

type Props = ComponentProps<typeof Button>;

/** App-level button with premium haptic ticks. */
export function AppButton(props: Props) {
  return (
    <Button
      {...props}
      onPressFeedback={() => {
        if (props.variant === 'ghost' || props.variant === 'secondary') {
          void select();
        } else {
          void tap();
        }
        props.onPressFeedback?.();
      }}
    />
  );
}

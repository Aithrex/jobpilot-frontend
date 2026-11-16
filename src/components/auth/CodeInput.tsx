import { forwardRef } from 'react';
import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp';

export const CODE_LENGTH = 6;

/**
 * The six boxes for an emailed code. One real input underneath, so paste, the
 * phone's "from Messages / Mail" suggestion (`one-time-code`) and a screen
 * reader all treat it as a single field. A code pasted as "123 456" works.
 */
export const CodeInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    disabled?: boolean;
    invalid?: boolean;
    describedBy?: string;
  }
>(({ value, onChange, onComplete, disabled, invalid, describedBy }, ref) => (
  <OTPInput
    ref={ref}
    maxLength={CODE_LENGTH}
    value={value}
    onChange={onChange}
    onComplete={onComplete}
    disabled={disabled}
    inputMode="numeric"
    pattern={REGEXP_ONLY_DIGITS}
    pasteTransformer={(text) => text.replace(/\D/g, '')}
    autoComplete="one-time-code"
    // A code is not a saved credential: no room is made for a password
    // manager's badge (which also measures layout that jsdom does not have).
    pushPasswordManagerStrategy="none"
    aria-label="6-digit code"
    aria-invalid={invalid ? true : undefined}
    aria-describedby={describedBy}
    containerClassName={`pub-auth-code flex w-full gap-2 has-[:disabled]:opacity-60${invalid ? ' is-invalid' : ''}`}
    render={({ slots }) => (
      <>
        {slots.map((slot, index) => (
          <div key={index} className="pub-auth-code-slot" data-active={slot.isActive}>
            {slot.char}
            {slot.hasFakeCaret && <span className="pub-auth-caret" aria-hidden />}
          </div>
        ))}
      </>
    )}
  />
));
CodeInput.displayName = 'CodeInput';

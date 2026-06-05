"use client";

/**
 * Odesílací tlačítko formuláře, které před odesláním zobrazí potvrzení.
 * Když uživatel potvrzení zruší, odeslání se zastaví.
 */
export function ConfirmButton({
  children,
  confirmText,
  className = "btn btn-outline",
}: {
  children: React.ReactNode;
  confirmText: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmText)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}

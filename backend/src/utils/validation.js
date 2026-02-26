// Old format: ABC1234
// Mercosul format: ABC1D23
export const PLATE_REGEX_OLD = /^[A-Z]{3}[0-9]{4}$/;
export const PLATE_REGEX_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export function normalizePlate(plate) {
  return plate.replace(/[\s\-]/g, '').toUpperCase();
}

export function validatePlate(plate) {
  if (PLATE_REGEX_OLD.test(plate)) return { valid: true, format: 'old' };
  if (PLATE_REGEX_MERCOSUL.test(plate)) return { valid: true, format: 'mercosul' };
  return { valid: false, format: null };
}

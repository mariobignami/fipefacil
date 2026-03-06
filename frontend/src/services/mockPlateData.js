/**
 * Mock data for demonstration purposes
 * Since we don't have access to a real plate lookup API that doesn't require authentication,
 * we provide some example data for users to test the application
 */

export const MOCK_PLATES = {
  'HHE7F34': {
    brand: 'VOLKSWAGEN',
    model: 'GOL',
    year: 2020,
    fuel: 'Gasolina',
    color: 'Prata',
    vehicleType: 'cars'
  },
  'FDP0389': {
    brand: 'FIAT',
    model: 'UNO',
    year: 2018,
    fuel: 'Flex',
    color: 'Branco',
    vehicleType: 'cars'
  },
  'ABC1234': {
    brand: 'CHEVROLET',
    model: 'ONIX',
    year: 2019,
    fuel: 'Flex',
    color: 'Preto',
    vehicleType: 'cars'
  },
  'XYZ5678': {
    brand: 'HONDA',
    model: 'CIVIC',
    year: 2021,
    fuel: 'Gasolina',
    color: 'Cinza',
    vehicleType: 'cars'
  }
};

/**
 * Check if a plate is a demo/test plate
 */
export function isDemoPlate(plate) {
  const normalized = plate.replace(/[^A-Z0-9]/g, '').toUpperCase();
  return normalized in MOCK_PLATES;
}

/**
 * Get mock vehicle data for a demo plate
 */
export function getDemoPlateData(plate) {
  const normalized = plate.replace(/[^A-Z0-9]/g, '').toUpperCase();
  return MOCK_PLATES[normalized] || null;
}

/**
 * Get list of all demo plates
 */
export function getDemoPlates() {
  return Object.keys(MOCK_PLATES).map(plate => {
    const data = MOCK_PLATES[plate];
    return {
      plate: formatPlate(plate),
      ...data
    };
  });
}

/**
 * Format plate for display (adds hyphen for Mercosul format)
 */
function formatPlate(plate) {
  // Check if it matches Mercosul format (ABC1D23)
  if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(plate)) {
    return `${plate.slice(0, 3)}-${plate.slice(3)}`;
  }
  // Old format (ABC1234)
  if (/^[A-Z]{3}[0-9]{4}$/.test(plate)) {
    return `${plate.slice(0, 3)}-${plate.slice(3)}`;
  }
  return plate;
}

const AIRLINE_DOMAIN_HINTS = [
  'emirates.com',
  'virginatlantic.com',
  'delta.com',
  'united.com',
  'aa.com',
  'jetblue.com',
  'britishairways.com',
  'ba.com',
  'airfrance.us',
  'airfrance.com',
  'klm.com',
  'qatarairways.com',
  'etihad.com',
  'singaporeair.com',
  'lufthansa.com',
  'swiss.com',
];

const AIRLINE_GROUPS = [
  { airline: 'Emirates', aliases: ['emirates', 'ek'], membership: 'Emirates Skywards', weight: 96 },
  { airline: 'Virgin Atlantic', aliases: ['virgin atlantic', 'upper class', 'vs'], membership: 'Virgin Atlantic Flying Club', weight: 94 },
  { airline: 'Qatar Airways', aliases: ['qatar', 'qr'], membership: 'Qatar Privilege Club', weight: 93 },
  { airline: 'Etihad', aliases: ['etihad', 'ey'], membership: 'Etihad Guest', weight: 91 },
  { airline: 'Singapore Airlines', aliases: ['singapore airlines', 'sq'], membership: 'KrisFlyer', weight: 90 },
  { airline: 'Delta', aliases: ['delta', 'delta one', 'dl'], membership: 'Delta SkyMiles', weight: 84 },
  { airline: 'United', aliases: ['united', 'polaris', 'ua'], membership: 'United MileagePlus', weight: 82 },
  { airline: 'American', aliases: ['american airlines', 'flagship', 'aa'], membership: 'American AAdvantage', weight: 80 },
  { airline: 'JetBlue', aliases: ['jetblue', 'mint', 'b6'], membership: 'JetBlue TrueBlue', weight: 79 },
  { airline: 'British Airways', aliases: ['british airways', 'ba'], membership: 'British Airways Executive Club', weight: 78 },
  { airline: 'Air France', aliases: ['air france'], membership: 'Air France-KLM Flying Blue', weight: 77 },
  { airline: 'KLM', aliases: ['klm'], membership: 'Air France-KLM Flying Blue', weight: 76 },
  { airline: 'Lufthansa', aliases: ['lufthansa'], membership: 'Miles & More', weight: 74 },
  { airline: 'SWISS', aliases: ['swiss'], membership: 'Miles & More', weight: 73 },
];

export function getAirlineDomains() {
  return AIRLINE_DOMAIN_HINTS;
}

export function identifyAirline(text = '') {
  const value = text.toLowerCase();
  return AIRLINE_GROUPS.find((group) => group.aliases.some((alias) => value.includes(alias))) || null;
}

export function membershipFitForAirline(airline, memberships = []) {
  const group = identifyAirline(airline);
  if (!group) return 'No direct membership match';

  const direct = memberships.find((membership) => membership.program.toLowerCase().includes(group.membership.toLowerCase()));
  if (direct) {
    return [direct.program, direct.tier].filter(Boolean).join(' - ');
  }

  const partner = memberships.find((membership) => {
    const program = membership.program.toLowerCase();
    if (['Qatar Airways', 'British Airways', 'American'].includes(group.airline)) {
      return program.includes('aadvantage') || program.includes('british airways') || program.includes('qatar');
    }
    if (['Delta', 'Virgin Atlantic', 'Air France', 'KLM'].includes(group.airline)) {
      return program.includes('skymiles') || program.includes('virgin') || program.includes('flying blue');
    }
    if (['United', 'Lufthansa', 'SWISS'].includes(group.airline)) {
      return program.includes('united') || program.includes('mileageplus');
    }
    return false;
  });

  if (partner) return `${partner.program} partner relevance`;
  return group.membership;
}

export function airlinePreferenceScore(airline) {
  return identifyAirline(airline)?.weight || 50;
}

export function buildResearchQueries({ originOptions, destinationOptions, departDate, returnDate, cabin, passengers }) {
  const origins = originOptions || [];
  const destinations = destinationOptions || [];
  const cabinPhrase = cabin === 'business' ? 'business class premium cabin' : `${cabin} fare`;
  const returnPhrase = returnDate ? `return ${returnDate}` : 'one way or return';

  return origins.flatMap((origin) => destinations.map((destination) => ({
    origin,
    destination,
    query: [
      `${origin} to ${destination}`,
      departDate ? `depart ${departDate}` : 'flexible dates',
      returnPhrase,
      `${passengers || 1} passenger`,
      cabinPhrase,
      'Emirates Virgin Atlantic Qatar Delta United American JetBlue fare',
      'coach economy fare comparison',
    ].join(' '),
  })));
}

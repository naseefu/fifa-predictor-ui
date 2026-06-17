export const TEAMS: Record<string, { code: string, flag: string }> = {
  // Hosts
  CANADA:      { code: 'CAN', flag: '🇨🇦' },
  MEXICO:      { code: 'MEX', flag: '🇲🇽' },
  USA:         { code: 'USA', flag: '🇺🇸' },
  
  // UEFA (Europe)
  AUSTRIA:     { code: 'AUT', flag: '🇦🇹' },
  BELGIUM:     { code: 'BEL', flag: '🇧🇪' },
  'BOSNIA AND HERZEGOVINA': { code: 'BIH', flag: '🇧🇦' },
  CROATIA:     { code: 'CRO', flag: '🇭🇷' },
  CZECHIA:     { code: 'CZE', flag: '🇨🇿' },
  ENGLAND:     { code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  FRANCE:      { code: 'FRA', flag: '🇫🇷' },
  GERMANY:     { code: 'GER', flag: '🇩🇪' },
  NETHERLANDS: { code: 'NED', flag: '🇳🇱' },
  PORTUGAL:    { code: 'POR', flag: '🇵🇹' },
  SCOTLAND:    { code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  SWEDEN:      { code: 'SWE', flag: '🇸🇪' },
  SWITZERLAND: { code: 'SUI', flag: '🇨🇭' },
  TÜRKİYE:     { code: 'TUR', flag: '🇹🇷' },

  // CONMEBOL (South America)
  ARGENTINA:   { code: 'ARG', flag: '🇦🇷' },
  BRAZIL:      { code: 'BRA', flag: '🇧🇷' },
  COLOMBIA:    { code: 'COL', flag: '🇨🇴' },
  ECUADOR:     { code: 'ECU', flag: '🇪🇨' },
  PARAGUAY:    { code: 'PAR', flag: '🇵🇾' },
  URUGUAY:     { code: 'URU', flag: '🇺🇾' },

  // CONCACAF (North America, Central America, and the Caribbean)
  'CABO VERDE':{ code: 'CPV', flag: '🇨🇻' },
  CURAÇAO:     { code: 'CUW', flag: '🇨🇼' },
  HAITI:       { code: 'HAI', flag: '🇭🇹' },
  PANAMA:      { code: 'PAN', flag: '🇵🇦' },

  // CAF (Africa)
  ALGERIA:     { code: 'ALG', flag: '🇩🇿' },
  'CONGO DR':  { code: 'COD', flag: '🇨🇩' },
  EGYPT:       { code: 'EGY', flag: '🇪🇬' },
  GHANA:       { code: 'GHA', flag: '🇬🇭' },
  'IVORY COAST':{ code: 'CIV', flag: '🇨🇮' },
  MOROCCO:     { code: 'MAR', flag: '🇲🇦' },
  SENEGAL:     { code: 'SEN', flag: '🇸🇳' },
  'SOUTH AFRICA': { code: 'RSA', flag: '🇿🇦' },
  TUNISIA:     { code: 'TUN', flag: '🇹🇳' },

  // AFC (Asia)
  AUSTRALIA:   { code: 'AUS', flag: '🇦🇺' },
  'IR IRAN':   { code: 'IRN', flag: '🇮🇷' },
  IRAQ:        { code: 'IRQ', flag: '🇮🇶' },
  JAPAN:       { code: 'JPN', flag: '🇯🇵' },
  JORDAN:      { code: 'JOR', flag: '🇯🇴' },
  QATAR:       { code: 'QAT', flag: '🇶🇦' },
  'SAUDI ARABIA': { code: 'KSA', flag: '🇸🇦' },
  'SOUTH KOREA': { code: 'KOR', flag: '🇰🇷' },
  UZBEKISTAN:  { code: 'UZB', flag: '🇺🇿' },
};

export const TEAM_LIST = Object.entries(TEAMS).map(([name, data]) => ({
  name,
  code: data.code,
  flag: data.flag
})).sort((a, b) => a.name.localeCompare(b.name));

/** Get flag for team name. Fallback to ⚽ if not found */
export function getFlag(teamName: string): string {
  const t = TEAMS[teamName?.toUpperCase()];
  return t ? t.flag : '⚽';
}

/** Get short code for team name. Fallback to first 3 letters */
export function getCode(teamName: string): string {
  const t = TEAMS[teamName?.toUpperCase()];
  if (t) return t.code;
  if (!teamName) return '???';
  return teamName.substring(0, 3).toUpperCase();
}

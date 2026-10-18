/** The columns of an uploaded CSV file: name, whether it's required, and what it holds. Shown in the FAQ and the guide. */
export const CSV_COLUMNS: Array<[string, string, string]> = [
  ['time', 'Required', 'Elapsed time as mm:ss.s or h:mm:ss, clock time such as 2:00:00 PM, or an ISO date-time'],
  ['power', 'Required', 'Power in watts'],
  ['speed', 'Required', 'Ground speed in km/h'],
  ['airspeed', 'Optional', 'Air speed in km/h, from an air speed sensor'],
  ['elevation', 'Optional', 'Elevation in metres'],
  ['lap', 'Optional', 'Lap number'],
  ['lat, long', 'Optional', 'GPS coordinates in degrees']
]

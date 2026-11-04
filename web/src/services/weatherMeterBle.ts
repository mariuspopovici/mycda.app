/**
 * WEATHERmeter over Web Bluetooth (Chrome on a computer or Android, over HTTPS or localhost).
 * The browser asks the user to pick the device.
 */
import { decodeWeatherData, type WeatherMeterReading } from '../core/weatherMeter'

const SERVICE_UUID = '961f0001-d2d6-43e3-a417-3bb8217e0e01'
const WEATHER_DATA_UUID = '961f0005-d2d6-43e3-a417-3bb8217e0e01'

/** The parts of the Web Bluetooth API used here; TypeScript's DOM library doesn't include it. */
interface BluetoothCharacteristic extends EventTarget {
  value?: DataView
  startNotifications: () => Promise<unknown>
}
interface BluetoothDevice extends EventTarget {
  name?: string
  gatt?: {
    connected: boolean
    connect: () => Promise<{ getPrimaryService: (uuid: string) => Promise<{ getCharacteristic: (uuid: string) => Promise<BluetoothCharacteristic> }> }>
    disconnect: () => void
  }
}
export interface BluetoothApi {
  requestDevice: (options: { acceptAllDevices: boolean, optionalServices: string[] }) => Promise<BluetoothDevice>
}

export const webBluetooth = () => (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth

export interface WeatherMeterConnection {
  name: string
  disconnect: () => void
}

export async function connectWeatherMeter (
  onReading: (reading: WeatherMeterReading) => void,
  onDisconnected: () => void,
  bluetooth: BluetoothApi | undefined = webBluetooth()
): Promise<WeatherMeterConnection> {
  if (!bluetooth) throw new Error('This browser has no Web Bluetooth.')
  // the meter's advertised name and services aren't documented, so the chooser lists every device
  const device = await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [SERVICE_UUID] })
  if (!device.gatt) throw new Error('This device has no GATT server.')
  const server = await device.gatt.connect()
  const service = await server.getPrimaryService(SERVICE_UUID)
  const characteristic = await service.getCharacteristic(WEATHER_DATA_UUID)
  characteristic.addEventListener('characteristicvaluechanged', () => {
    if (characteristic.value) onReading(decodeWeatherData(characteristic.value))
  })
  device.addEventListener('gattserverdisconnected', onDisconnected)
  await characteristic.startNotifications()
  return { name: device.name ?? 'WEATHERmeter', disconnect: () => device.gatt?.disconnect() }
}

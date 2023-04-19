import * as core from '@actions/core'

import ParticleApi from 'particle-api-js'
const particle = new ParticleApi()

export async function waitForDeviceToComeOnline(
  deviceId: string,
  accessToken: string,
  timeoutMs: number
): Promise<boolean> {
  const stream = await particle.getEventStream({
    deviceId,
    auth: accessToken,
    name: 'spark/status'
  })

  return new Promise<boolean>((resolve, reject) => {
    const flashTimeout = setTimeout(
      () =>
        reject(new Error('timed out waiting for device to come back online')),
      timeoutMs
    )
    core.info('waiting for device to come online')
    stream.on('event', (event: {data: string}) => {
      try {
        if (event.data === 'online') {
          core.info('device is online')
          clearTimeout(flashTimeout)
          stream.abort()
          stream.stopIdleTimeout()
          resolve(true)
        }
      } catch (error) {
        if (error instanceof Error) core.debug(error.message)
        reject(new Error('error waiting for device to come online'))
      }
    })
  })
}

function validAccessToken(accessToken: string): boolean {
  return accessToken.length === 40
}

function validDeviceId(deviceId: string): boolean {
  return deviceId.length === 24
}

function validTimeoutMs(timeoutMs: number): boolean {
  return timeoutMs > 0
}

function validFirmwarePath(firmwarePath: string): boolean {
  return firmwarePath.length > 0
}

export async function run(): Promise<void> {
  try {
    const accessToken = core.getInput('access-token')
    const deviceId = core.getInput('device-id')
    const firmwarePath = core.getInput('firmware-path')
    const timeoutMs = parseInt(core.getInput('timeout-ms'), 10)

    if (!validAccessToken(accessToken)) {
      throw new Error('invalid access token')
    }

    if (!validDeviceId(deviceId)) {
      throw new Error('invalid device id')
    }

    if (!validTimeoutMs(timeoutMs)) {
      throw new Error('invalid timeout')
    }

    if (!validFirmwarePath(firmwarePath)) {
      throw new Error('invalid firmware path')
    }

    // Flash the device
    await particle.flashDevice({
      deviceId,
      files: {file: firmwarePath},
      auth: accessToken
    })

    // Wait for the flash to complete
    await waitForDeviceToComeOnline(deviceId, accessToken, timeoutMs)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
---
layout: page
title: Camera Control
---

The camera control software coordinates the central control PC and the Raspberry Pi camera modules. It provides a lightweight command interface for changing camera settings, triggering captures, downloading images, and managing camera modules.

The implementation is written in C++ and uses:

- [Boost.Asio](https://www.boost.org/doc/libs/release/doc/html/boost_asio.html) for UDP networking.
- [libgphoto2](http://gphoto.org/) for DSLR camera discovery, configuration, capture, download, and file deletion.
- [wiringPi](http://wiringpi.com/) for Raspberry Pi GPIO access.

## Architecture

The software is split into two applications:

- `CameraControlClient` runs on the control PC.
- `CameraControlServer` runs on each Raspberry Pi camera module.

The client sends commands to the modules using UDP broadcast. This keeps the control path simple: every active module receives the same command at the same time, and each module applies it to the cameras connected locally.

## Client Application

The client is an interactive command-line tool. It reads a JSON configuration file containing the broadcast address, UDP port, download directory, and optional host list for hard shutdown or reboot commands.

Example configuration:

```json
{
  "broadcast-address": "192.168.0.255",
  "port": 2000,
  "download": "/net_home/data",
  "pssh-hosts": "192.168.0.101 192.168.0.102"
}
```

The client maps single-key input to camera commands. Some commands prompt for a value, such as ISO, aperture, or shutter speed. Capture commands generate a future timestamp, allowing each camera module to trigger from its synchronized local clock.

## Server Application

The server listens for UDP commands on the configured port. When a command is received, it is parsed as either:

- `command`
- `command:value`

The server then applies the command to the local camera controller. Supported operations include:

- Detect connected cameras.
- Set ISO, aperture, and shutter speed.
- Trigger capture using GPIO.
- Enable or disable autofocus through GPIO.
- Download images to the configured destination.
- Format camera SD cards by deleting stored files.
- Shutdown or reboot the Raspberry Pi.

## Camera Discovery and Control

Each Raspberry Pi module uses libgphoto2 to detect cameras connected over USB. Detected cameras are opened, configured to store captures on their memory cards, and wrapped by the local camera controller.

Camera settings are applied using gphoto2 configuration keys:

- `iso`
- `aperture`
- `shutterspeed`

The software currently exposes a fixed set of accepted values for ISO, aperture, and shutter speed. These values should match the options supported by the selected camera model.

## Hardware Triggering

Although libgphoto2 can trigger image capture over USB, this was not accurate enough for synchronised multi-camera capture. The production capture path uses GPIO instead:

- One GPIO pin controls autofocus.
- One GPIO pin controls shutter trigger.
- The custom Raspberry Pi trigger board converts the GPIO output into the external trigger signal expected by the cameras.

This keeps camera setting and data transfer on USB, while using the dedicated camera trigger interface for precise capture timing. See [Camera Synchronisation](/camera-sync) for more details


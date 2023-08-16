---
layout: page
title: System Overview
---

This page gives a high-level overview of the system design, shown in Figure 1.

![](images/system-overview.png)
<p style="text-align:center"><b>Figure 1:</b> System Overview</p>

The system consists of a central control PC and 16 camera modules, which are connected together via a local network. Each camera module, built using a [Raspberry Pi](https://www.raspberrypi.org/), can support up to 4 cameras. Camera setting and data transfer are handled using the USB  connected via USB allowing control of camera settings and data transfer, as well as synchronised triggering.
Synchronised triggering of the cameras is enabled through a custom Raspberry Pi header, the desgin of which is described [here](camera-sync.md). The modular design of the system enables it to to support an arbtary number of camera modules and cameras.

The Control computer provides:
* A central file system using File Trransfer Protocol (FTP)
* A system master clock using a Network Time Protocol (NTP) server


The system control software uses [libgphoto2](http://gphoto.org/) making it agnostic to camera hardware, providing it is [supported by gphoto2](http://gphoto.org/proj/libgphoto2/support.php).

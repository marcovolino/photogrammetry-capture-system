---
layout: page
title: Photogrammetry Capture System
---

This site documents a 64-camera photogrammetry capture system built at the University of Surrey's [Centre for Vision, Speech and Signal Processing](https://www.surrey.ac.uk/cvssp) by [Marco Volino](https://marcovolino.github.io/).

The system was designed to capture human subjects from many viewpoints at the same instant. It combines a central control PC, Raspberry Pi camera modules, DSLR cameras, a custom hardware trigger board, and a floor calibration chart for recovering metric scale and orientation.

![photogrammetry system](images/photogrammetry.jpg)
<p style="text-align:center"><b>Figure 1:</b> Photogrammetry System</p>

## Documentation
The site is organised across the following topics, which are accessible across the menu bar at the top of the page:

1. [System Overview](system-overview.md)
2. [Camera Synchronisation](camera-sync.md)
3. [DSLR Camera Control](camera-control.md)
4. [Client and Raspberry Pi Setup](system-setup.md)
5. [Floor Chart](floor-chart.md)
6. [Results](results.md)

The camera control source code and PCB support files used while designing the Raspberry Pi trigger hardware will be released at some point in the future to help democratise these systems. 

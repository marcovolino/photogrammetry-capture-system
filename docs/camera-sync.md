---
layout: page
title: Camera Synchronisation
---

Photogrammetry systems for capturing human subjects require precise synchronisation of the camera shutter to ensure all images at taken at the exact same time instance. This page details process of developing custom hardware, in the form of a raspberry pi hat, that achieves precise synchronisation of DSLR cameras.

## Camera Model
The photogrammetry system was built using the [Canon 1300d](https://www.canon.co.uk/for_home/product_finder/cameras/digital_slr/eos_1300d/), as at the time it offered good cost/resolution, external triggering and software APIs to interface the camera.
While the software developed is agnostic to the camera hardware, the syncronisation hardware develop would need to be adapted for the camera model, in particular the external trigger interface. Most entry-level canon DSLR cameras use a 2.5mm audio jack as the external trigger interface,  which is a standard interface. This connection would need to be modified based on the camera used.   

## Software Trigger
As a starting point, software based triggering via the USB was tested and found to not be sufficient for this application introducing a variable delay between the first and last camera shutter. This is not suitable for the intended application.  


## Circuit Development and PCB Fabrication

[TODO show image of circuit and describe]


The following components were identified as suitable 

| Component | Quantity per PCB | Link |
| ----------- | -------- | ----------- | 
| Diode (1N4148)	| 8 |[RS Components](https://uk.rs-online.com/web/p/switching-diodes/8431562) |
| DIP Switch (SPST)| 1 |[RS Components](https://uk.rs-online.com/web/p/dip-sip-switches/8772154) |
| GPIO Connector| 1|[RS Components](https://uk.rs-online.com/web/p/pcb-sockets/1731086) |
| Headphone Jack (2.5mm)    | 6 | [RS Components](https://uk.rs-online.com/web/p/products/5051407/)  |
| IC Dip Socket (8-way) | 1 |[RS Components](https://uk.rs-online.com/web/p/dil-sockets/6742435) |
| Opto Isolator (CNY74-2)	| 1 | [RS Components](https://uk.rs-online.com/web/p/optocouplers/1451599/)|
| Resistor (1k) | 2 |[RS Components](https://uk.rs-online.com/web/p/through-hole-resistors/7077666) |

The circuit design was reproduced in [KiCAD](https://www.kicad.org/), an open-source PCB design package, to create the files. This process required appropiate files that defined the 

First, a prototype of the design was fabricated with the help of the University of Surrey's Electronics Lab, who used a UV etching process to create a PCB, show in Figure 1. After confirming that the prototype circuit operated as expected, I began the process of fabricating 16 of the boards for the full system. 

Given that the prototype fabrication process involved manually drilling component holes, it was decided that it would not be precise enough to ensure a high quality set of PCBs. 
For this reason, the manufacture of the PCB board design was outsourced to a third party company.

The initial PCB design is shown in Figure 1:  
![](images/pcb_prototype.jpg)
<p style="text-align: center;"><b>Figure 1: Prototype board created using UV etching</b></p>

The final PCB design is shown in Figure 2, below:  
![](images/pcb_design.png)
<p style="text-align: center;"><b>Figure 2: An PCB Schematic for raspberry pi camera trigger</b></p>

The final fabricated PCB is shown in Figure 3
![](images/pcb_fabricated.jpg)
<p style="text-align: center;"><b>Figure 3: Fabricated PCB</b></p>

Each PCB was then constructued using the componoents, listed previously

[TODO pic of final constructed board]


## Synchronisation Tests

[TODO - DESCRIBE SYNC TESTS]

![](images/sync-test.pdf)

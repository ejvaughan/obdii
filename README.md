# A Linux command-line utility that reads OBD-II diagnostic data from a vehicle via a CAN socket

## Overview

This utility is designed to work with any vehicle that is exposed on the local machine as a CAN network interface. Therefore, any OBD-II adaptor that exposes itself as a CAN device can be used. For example, the (PiCAN2)[http://skpang.co.uk/catalog/pican2-canbus-board-for-raspberry-pi-23-p-1475.html] is such an adaptor for the Raspberry Pi. Linux supports a family of sockets specifically for CAN communication (the PF_CAN protocol family), which we leverage in our utility.

## How to Build

1. Clone this repo: `git clone --recursive git@github.com:ejvaughan/cse521.git`
2. In the project directory, run `make`
3. The command-line utility is named `test` and will be placed into the `build/` subdirectory.

## Running

The utility uses the ISO-TP protocol for its socket communication (as opposed to using the "raw" CAN protocol). This protocol is implemented in a kernel module, but unfortunately the module has not yet been merged into the linux trunk. The code for this module is available in a separate (Git repository)[https://github.com/hartkopp/can-isotp-modules] and is checked out when you run `git clone --recursive git@github.com:ejvaughan/cse521.git`.

Before you can run the utility, the kernel module must be built and installed. The module's README.md (located at can-isotp-modules/README.md) has instructions for how to do this.

## Usage

The command line utility can be invoked as follows:

    Usage: test -t <transfer CAN ID> -r <receive CAN ID> <CAN interface>
	<transfer CAN ID>: The CAN ID that will be used for sending the diagnostic requests. For 11-bit identifiers, this can be either the broadcast ID, 0x7DF, or an ID in the range 0x7E0 to 0x7E7, indicating a particular ECU.
	<receive CAN ID>: The CAN ID that the ECU will be using to respond to the diagnostic requests that are sent. For 11-bit identifiers, this is an ID in the range 0x7E8 to 0x7EF (i.e. <transfer CAN ID> + 8)

The particular IDs used for sending/receiving will be dependent on the vehicle. Most vehicles will use the IDs explained in the usage message above. However, some vehicles use extended (29-bit) identifiers. For example, for a 2009 Honda Civic, the transfer ID must be 0x18DB33F1, and the ECU will respond with an ID of 0x18DAF110. Therefore, the utility will be invoked like so:

    test -t 18DB33F1 -r 18DAF110 can0

## Functionality

Right now, the utility has limited functionality. It sends an OBD-II request for the engine RPMs, and prints the response to stdout. As development continues, additional functionality will be added.

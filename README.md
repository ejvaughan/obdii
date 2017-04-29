# C API and command line tool for retrieving OBD-II diagnostic data from a vehicle. Available on Linux.

## Overview

This project represents a work-in-progress implementation of the On-board Diagnostics (OBD-II) protocol, an application layer protocol used to obtain diagnostic data from a vehicle. The project has two components: (1) a C API for constructing OBD-II requests, decoding responses, and actually communicating with a vehicle via a CAN ISOTP socket; and (2) a command line tool that uses this API to query a vehicle for diagnostic data. The API is built as a shared library and can be linked to by any interested clients.

In addition, bindings are available for Python, allowing the API to be used from the Python interpreter or a script. See the [Python](#python-bindings) section for more details.

## Dependencies

The communication layer of the API uses the ISO-TP transport protocol for its socket communication (as opposed to using a raw CAN socket). This protocol is implemented in a kernel module, but unfortunately the module has not yet been merged into Linux trunk. The code for the module is available [here](https://github.com/hartkopp/can-isotp-modules).

In order to use the functions in `OBDIICommunication.h`, as well as the command line utility, the kernel module must be built and installed. The module's [README](https://github.com/hartkopp/can-isotp-modules/blob/master/README.isotp) has instructions for how to do this.

## Hardware

This API is designed to work with any vehicle that is exposed on the local machine as a CAN network interface. Therefore, any OBD-II adaptor that exposes itself as a CAN device can be used. For example, the [PiCAN2](http://skpang.co.uk/catalog/pican2-canbus-board-for-raspberry-pi-23-p-1475.html) is such an adaptor for the Raspberry Pi. Linux supports a family of sockets specifically for CAN communication (the `PF_CAN` protocol family), which the API uses for communicating with the vehicle.

## OBD-II API

The API is functionally separated into two layers: the protocol layer and the communication layer.

### Protocol layer

The protocol layer is used to construct OBD-II requests and decode responses. It abstracts away all the details of message payloads, providing a simple interface to the diagnostic data via two types: `OBDIICommand`, which represents a request, and `OBDIIResponse`, which holds a decoded response. Given a particular diagnostic of interest (an instance of `OBDIICommand`), the protocol layer constructs the raw bytes that compose the request. Similarly, given the raw bytes of the response, the protocol layer decodes the bytes into an `OBDIIResponse` object so that the underlying diagnostic data can be accessed. In this way, the protocol layer is entirely agnostic to how communication with the car actually occurs.

The protocol layer is implemented in `OBDII.c`, whose public interface is `OBDII.h`. Interacting with the protocol layer involves choosing a diagnostic (an instance of `OBDIICommand`) from a predefined list. The `payload` property contains the raw bytes of the request. Parsing a response involves calling `OBDIIDecodeResponseForCommand`, which decodes the raw bytes into an `OBDIIResponse` object containing the diagnostic data.

The work of the protocol layer (request -> raw bytes; raw bytes -> response) occurs transparently when you interact with the communication layer, which means you never have to use `payload` or `OBDIIDecodeResponseForCommand` yourself. Instead, you will just interact with the `OBDIICommand` and `OBDIIResponse` types. 

### Communication layer

The communication layer is responsible for actually communicating with a connected vehicle. The vehicle must be exposed as a CAN network interface. The main functions you will interact with are `OBDIIOpenSocket`, `OBDIIPerformQuery`, and `OBDIIGetSupportedCommands` (contained in `OBDIICommunication.h`). To give you an example of how easy it is to start reading diagnostic data, observe:

```C
int s = OBDIIOpenSocket("can0", 0x7E0, 0x7E8); // Talk to the engine ECU
if (s < 0) {
    printf("Error opening socket: %s\n", strerror(errno));
    exit(EXIT_FAILURE);
}

// Query the car for the commands it supports
OBDIICommandSet supportedCommands = OBDIIGetSupportedCommands(s);

if (OBDIICommandSetContainsCommand(&supportedCommands, OBDIICommands.engineRPMs)) {
    // Query the diagnostic data
    OBDIIResponse response = OBDIIPerformQuery(s, OBDIICommands.engineRPMs);

    if (response.success) {
        printf("Got engine RPMs: %.2f\n", response.numericValue);
    }

    OBDIIResponseFree(&response);
}

OBDIICommandSetFree(&supportedCommands);
OBDIICloseSocket(s);
```

### Using in your own projects

1. Clone the repo: `git clone --recursive git@github.com:ejvaughan/cse521.git`
2. `cd` into the project directory and run `make shared`
3. This will produce a dynamic library named `libobdii.so` in the `build/` subdirectory. Link against this library, and include `OBDII.h` and `OBDIICommunication.h` in your project.

### Python bindings

< fill me in >

## OBD-II command line interface

< description goes here >

### Usage

The command line utility can be invoked as follows:

    Usage: cli -t <transfer CAN ID> -r <receive CAN ID> <CAN interface>
	<transfer CAN ID>: The CAN ID that will be used for sending the diagnostic requests. For 11-bit identifiers, this can be either the broadcast ID, 0x7DF, or an ID in the range 0x7E0 to 0x7E7, indicating a particular ECU.
	<receive CAN ID>: The CAN ID that the ECU will be using to respond to the diagnostic requests that are sent. For 11-bit identifiers, this is an ID in the range 0x7E8 to 0x7EF (i.e. <transfer CAN ID> + 8)

The particular IDs used for sending/receiving will be dependent on the vehicle. Most vehicles will use the IDs explained in the usage message above. However, some vehicles use extended (29-bit) identifiers. For example, for a 2009 Honda Civic, the transfer ID must be 0x18DB33F1, and the ECU will respond with an ID of 0x18DAF110. Therefore, the utility will be invoked like so:

    cli -t 18DB33F1 -r 18DAF110 can0

### Functionality

< fill me in >



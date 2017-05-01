# C API and command line tool for retrieving OBD-II diagnostic data from a vehicle. Available on Linux.

## Overview

This project represents a work-in-progress implementation of the On-board Diagnostics (OBD-II) protocol, an application layer protocol used to obtain diagnostic data from a vehicle. The project has three components:

1. A [C API](#obd-ii-api) for constructing OBD-II requests, decoding responses, and actually communicating with a vehicle via a CAN ISO-TP socket
2. A [command line tool](#obd-ii-command-line-interface) that uses this API to query a vehicle for diagnostic data
3. A userspace [daemon](#daemon) that allows multiple clients using the API to communicate on the bus using the same ISO-TP socket (see [below](#daemon) for when this is useful).

In addition, bindings are available for Python, allowing the API to be used from the Python interpreter or a script. See the [Python](#python-bindings) section for more details.

## Dependencies

The [communication layer](#communication-layer) of the API uses the ISO-TP transport protocol for its socket communication (as opposed to using a raw CAN socket). This protocol is implemented in a separate kernel module, whose code is available [here](https://github.com/hartkopp/can-isotp-modules).

In order to use the functions in `OBDIICommunication.h`, as well as the command line utility, the kernel module must be built and installed. See the module's [README](https://github.com/hartkopp/can-isotp-modules/blob/master/README.isotp) for how to do this.

## Hardware

This API is designed to work with any vehicle that is exposed on the local machine as a CAN network interface. Therefore, any OBD-II adaptor that exposes itself as a CAN device can be used. For example, the [PiCAN2](http://skpang.co.uk/catalog/pican2-canbus-board-for-raspberry-pi-23-p-1475.html) is such an adaptor for the Raspberry Pi. Linux supports a family of sockets specifically for CAN communication (the `PF_CAN` protocol family), which the API uses for communicating with the vehicle.

## OBD-II API

The API is functionally separated into two layers: the protocol layer and the communication layer.

### Protocol layer

The protocol layer is used to construct OBD-II requests and decode responses. It abstracts away all the details of message payloads, providing a simple interface to the diagnostic data via two types: `OBDIICommand`, which represents a request, and `OBDIIResponse`, which holds a decoded response. Given a particular diagnostic of interest (an instance of `OBDIICommand`), the protocol layer constructs the raw bytes that compose the request. Similarly, given the raw bytes of the response, the protocol layer decodes the bytes into an `OBDIIResponse` object so that the underlying diagnostic data can be accessed. In this way, the protocol layer is entirely agnostic to how communication with the car actually occurs.

The protocol layer is implemented in `OBDII.h`. Interacting with the protocol layer involves choosing a diagnostic (an instance of `OBDIICommand`) from a predefined list. The `payload` property contains the raw bytes of the request. Parsing a response involves calling `OBDIIDecodeResponseForCommand`, which decodes the raw bytes into an `OBDIIResponse` object containing the diagnostic data.

The work of the protocol layer (request -> raw bytes; raw bytes -> response) occurs transparently when you interact with the communication layer, which means you never have to use `payload` or `OBDIIDecodeResponseForCommand` yourself. Instead, you will just interact with the `OBDIICommand` and `OBDIIResponse` types. 

### Communication layer

The communication layer is responsible for actually communicating with a connected vehicle. The vehicle must be exposed as a CAN network interface. The main functions you will interact with are `OBDIIOpenSocket`, `OBDIIPerformQuery`, and `OBDIIGetSupportedCommands` (contained in `OBDIICommunication.h`).

1. `OBDIIOpenSocket`: Opens a communications channel to a particular ECU, which is identified by an `(interface, transfer ID, receive ID)` tuple. The transfer ID is the ID that the ECU listens to on the CAN network, and the receive ID is what the ECU uses to respond.

2. `OBDIIPerformQuery`: Writes an `OBDIICommand`'s payload into the socket and decodes the response as an `OBDIIResponse` object. Depending on the type of data returned by the command, the diagnostic data will be available via the `numericValue`, `bitfieldValue`, or `stringValue` properties of the response.

3. `OBDIIGetSupportedCommands`: Queries the car for the commands it supports, returning an `OBDIICommandSet` object.

See the header file for more documentation on the use of these functions.

To give you an example of how easy it is to start reading diagnostic data, observe:

```C
// Talk to the engine ECU (transfer ID 0x7E0, receive ID 0x7E8) on can0 interface
OBDIISocket s;

if (OBDIIOpenSocket(&s, "can0", 0x7E0, 0x7E8, 0) < 0) {
    printf("Error opening socket: %s\n", strerror(errno));
    exit(EXIT_FAILURE);
}

// Query the car for the commands it supports
OBDIICommandSet supportedCommands = OBDIIGetSupportedCommands(&s);

if (OBDIICommandSetContainsCommand(&supportedCommands, OBDIICommands.engineRPMs)) {
    // Query the diagnostic data
    OBDIIResponse response = OBDIIPerformQuery(&s, OBDIICommands.engineRPMs);

    if (response.success) {
        printf("Got engine RPMs: %.2f\n", response.numericValue);
    }

    OBDIIResponseFree(&response);
}

OBDIICommandSetFree(&supportedCommands);
OBDIICloseSocket(&s);
```

### Using in your own projects

You can link to the API statically, by compiling the necessary source files into your project, or dynamically, by building the API as a shared library which you then link to.

#### Shared library

1. Clone the repo: `git clone --recursive git@github.com:ejvaughan/cse521.git`
2. `cd` into the project directory and run `make shared`. This will produce a shared library named `libobdii.so` in the `build/` subdirectory. 
3. Link against this library, and include `OBDII.h` and `OBDIICommunication.h` in your project.

#### Static linking

1. Clone the repo: `git clone --recursive git@github.com:ejvaughan/cse521.git`
2. Add `src/` to the include search paths: `-I src`
3. Compile `OBDII.c` and `OBDIICommunication.c` into your project

## Daemon

The communication layer of the API has an annoying limitation, which is that only one process can open a socket to a particular `(interface, transfer ID, receive ID)` tuple at a time. If two separate processes try to open a socket using the same parameters, bad things will happen.

There is a solution, however, which is to run the `obdiid` daemon, which can open sockets on clients' behalf so that they can be shared across multiple processes. Additionally, when a client calls `OBDIIOpenSocket`, it must pass `1` for the shared parameter, which indicates that the socket should be opened by the daemon instead of the calling process.

For technical details about the daemon, such as the protocol it uses and how the socket sharing works, see [daemon.md](doc/daemon.md).

### Building

1. Clone the repo: `git clone --recursive git@github.com:ejvaughan/cse521.git`
2. `cd` into the project directory and run `make daemon`. This will produce an executable named `obdiid` in the `build/` subdirectory.
3. You can run the daemon directly from the command line (`$ ./obdiid`), or install it somewhere and configure it to run on boot.

### Python bindings

It's possible to use the API from Python via `bindings.py`, which uses the `ctypes` module to expose the necessary functions and types from the shared library. Here's an example:

    >>> from bindings import *
    >>> from ctypes import *
    >>> s = OBDIISocket()
    >>> OBDIIOpenSocket(pointer(s), "can0", 0x7E0, 0x7E8, 0)
    >>> r = OBDIIPerformQuery(pointer(s), OBDIICommands.engineRPMs)
    >>> r.success
    1
    >>> r.numericValue
    780.0
    >>> OBDIIResponseFree(pointer(r))
    >>> OBDIICloseSocket(pointer(s))

Note that you will need to install the [shared library](#shared-library) in a known location in order for it to be found from Python. E.g. `$ sudo cp build/libobdii.so /usr/local/lib/libobdii.so && ldconfig`

## OBD-II command line interface

The command line interface is a simple utility that prints out a vehicle's list of supported commands, prompting the user to select a command with which to query the car.

### Building

1. Clone the repo: `git clone --recursive git@github.com:ejvaughan/cse521.git`
2. `cd` into the project directory and run `make cli`. This will produce an executable named `cli` in the `build/` subdirectory.
3. Run: `$ ./cli ...`

### Usage

The command line utility can be invoked as follows:

    Usage: cli -t <transfer CAN ID> -r <receive CAN ID> [-d] <CAN interface>
	<transfer CAN ID>: The CAN ID that will be used for sending the diagnostic requests. For 11-bit identifiers, this can be either the broadcast ID, 0x7DF, or an ID in the range 0x7E0 to 0x7E7, indicating a particular ECU.
	<receive CAN ID>: The CAN ID that the ECU will be using to respond to the diagnostic requests that are sent. For 11-bit identifiers, this is an ID in the range 0x7E8 to 0x7EF (i.e. <transfer CAN ID> + 8)
	-d: Use a shared socket to allow other programs to access the ECU (the obdiid daemon must be running for this to work)

The particular IDs used for sending/receiving will be dependent on the vehicle. Most vehicles will use the IDs explained in the usage message above. However, some vehicles use extended (29-bit) identifiers. For example, for a 2009 Honda Civic, the transfer ID must be 0x18DB33F1, and the ECU will respond with an ID of 0x18DAF110. Therefore, the utility will be invoked like so:

    cli -t 18DB33F1 -r 18DAF110 can0


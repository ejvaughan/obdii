#include "OBDIICommunication.h"
#include <stdlib.h>
#include <sys/select.h>

#define MAX_ISOTP_PAYLOAD 4095

OBDIICommandSet OBDIIGetSupportedCommands(int socket)
{
	OBDIICommandSet supportedCommands = { 0 };

	// Mode 1
	OBDIIResponse response = OBDIIPerformQuery(socket, &OBDIICommands.mode1SupportedPIDs_0_to_20);

	supportedCommands._mode1SupportedPIDs._0_to_20 = response.bitfieldValue;

	// If PID 0x20 is supported, we can query the next set of PIDs
	if (!(response.bitfieldValue & 0x01)) {
		return supportedCommands;
	}

	response = OBDIIPerformQuery(socket, &OBDIICommands.mode1SupportedPIDs_21_to_40);

	supportedCommands._mode1SupportedPIDs._21_to_40 = response.bitfieldValue;

	// If PID 0x40 is supported, we can query the next set of PIDs
	if (!(response.bitfieldValue & 0x01)) {
		return supportedCommands;
	}

	response = OBDIIPerformQuery(socket, &OBDIICommands.mode1SupportedPIDs_41_to_60);

	supportedCommands._mode1SupportedPIDs._41_to_60 = response.bitfieldValue;

	// If PID 0x60 is supported, we can query the next set of commands
	if (!(response.bitfieldValue & 0x01)) {
		return supportedCommands;
	}

	response = OBDIIPerformQuery(socket, &OBDIICommands.mode1SupportedPIDs_61_to_80);

	supportedCommands._mode1SupportedPIDs._61_to_80 = response.bitfieldValue;

	// Mode 9
	response = OBDIIPerformQuery(socket, &OBDIICommands.mode9SupportedPIDs);

	supportedCommands._mode9SupportedPIDs = response.bitfieldValue;

	return supportedCommands;
}

OBDIIResponse OBDIIPerformQuery(int socket, OBDIICommand *command)
{
		OBDIIResponse response = { 0 };

		// Send the command
	    int retval = write(socket, command->payload, sizeof(command->payload));
	    if (retval < 0 || retval != sizeof(command->payload)) {
			return response;
	    }

	    // Set a two second timeout
	    struct timeval timeout;
	    timeout.tv_sec = 2;
	    timeout.tv_usec = 0;

	    fd_set readFDs;
	    FD_ZERO(&readFDs);
	    FD_SET(socket, &readFDs);

	    if (select(socket + 1, &readFDs, NULL, NULL, &timeout) <= 0) {
		// Either we timed out, or there was an error
		return response;
	    }

	    // Receive the response
	    int responseLength = command->expectedResponseLength == VARIABLE_RESPONSE_LENGTH ? MAX_ISOTP_PAYLOAD : command->expectedResponseLength;
	    unsigned char responsePayload[responseLength];
	    retval = read(socket, responsePayload, responseLength);

	    if (retval < 0 || (command->expectedResponseLength != VARIABLE_RESPONSE_LENGTH && retval != command->expectedResponseLength)) {
			return response;
	    }

	    return OBDIIDecodeResponseForCommand(command, responsePayload, retval);
}

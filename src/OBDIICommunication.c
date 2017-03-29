#include "OBDIICommunication.h"
#include <stdlib.h>
#include <sys/select.h>

#define MAX_ISOTP_PAYLOAD 4095

// Counts # bits set in the argument
// Code from Kernighan
static inline unsigned int _BitsSet(unsigned int word)
{
	unsigned int c; // c accumulates the total bits set in v
	for (c = 0; word; c++)
	{
	  word &= word - 1; // clear the least significant bit set
	}
	return c;
}

OBDIICommandSet OBDIIGetSupportedCommands(int socket)
{
	OBDIICommandSet supportedCommands = { 0 };
	unsigned int numCommands;

	// Mode 1
	OBDIIResponse response = OBDIIPerformQuery(socket, OBDIICommands.mode1SupportedPIDs_1_to_20);

	supportedCommands._mode1SupportedPIDs._1_to_20 = response.bitfieldValue;

	// If PID 0x20 is supported, we can query the next set of PIDs
	if (!(response.bitfieldValue & 0x01)) {
		goto mode9;
	}

	response = OBDIIPerformQuery(socket, OBDIICommands.mode1SupportedPIDs_21_to_40);

	supportedCommands._mode1SupportedPIDs._21_to_40 = response.bitfieldValue;

	// If PID 0x40 is supported, we can query the next set of PIDs
	if (!(response.bitfieldValue & 0x01)) {
		goto mode9;
	}

	response = OBDIIPerformQuery(socket, OBDIICommands.mode1SupportedPIDs_41_to_60);

	// Mask out the rest of the PIDs, because they're not yet implemented
	response.bitfieldValue &= 0xFFFC0000;

	supportedCommands._mode1SupportedPIDs._41_to_60 = response.bitfieldValue;

	//// If PID 0x60 is supported, we can query the next set of commands
	//if (!(response.bitfieldValue & 0x01)) {
	//	goto mode9;
	//}

	//response = OBDIIPerformQuery(socket, OBDIICommands.mode1SupportedPIDs_61_to_80);

	//supportedCommands._mode1SupportedPIDs._61_to_80 = response.bitfieldValue;

mode9:
	// Mode 9
	response = OBDIIPerformQuery(socket, OBDIICommands.mode9SupportedPIDs);

	// Mask out the PIDs that are not yet implemented
	response.bitfieldValue &= 0xE0000000;

	supportedCommands._mode9SupportedPIDs = response.bitfieldValue;

exit:
	numCommands = _BitsSet(supportedCommands._mode1SupportedPIDs._1_to_20) + _BitsSet(supportedCommands._mode1SupportedPIDs._21_to_40) + _BitsSet(supportedCommands._mode1SupportedPIDs._41_to_60) + _BitsSet(supportedCommands._mode1SupportedPIDs._61_to_80) + _BitsSet(supportedCommands._mode9SupportedPIDs);

	numCommands++; // mode 3

	OBDIICommand **commands = malloc(sizeof(OBDIICommand *) * numCommands);
	if (commands != NULL) {
		supportedCommands.commands = commands;
		supportedCommands.numCommands = numCommands;

		// Mode 1
		unsigned int pid;
		for (pid = 0; pid < sizeof(OBDIIMode1Commands) / sizeof(OBDIIMode1Commands[0]); ++pid) {
			OBDIICommand *command = &OBDIIMode1Commands[pid];
			if (OBDIICommandSetContainsCommand(&supportedCommands, command)) {
				*commands = command;
				++commands;
			}
		}

		// Mode 3
		*commands = OBDIICommands.DTCs;
		++commands;

		// Mode 9
		for (pid = 0; pid < sizeof(OBDIIMode9Commands) / sizeof(OBDIIMode9Commands[0]); ++pid) {
			OBDIICommand *command = &OBDIIMode9Commands[pid];
			if (OBDIICommandSetContainsCommand(&supportedCommands, command)) {
				*commands = command;
				++commands;
			}
		}
	}

	return supportedCommands;
}

void OBDIICommandSetFree(OBDIICommandSet *commandSet) {
	if (commandSet && commandSet->commands) {
		free(commandSet->commands);
	}
}

OBDIIResponse OBDIIPerformQuery(int socket, OBDIICommand *command)
{
		OBDIIResponse response = { 0 };
		response.command = command;

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

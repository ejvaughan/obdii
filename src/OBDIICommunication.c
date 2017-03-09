#include "OBDIICommunication.h"

#define MAX_ISOTP_PAYLOAD 4095

OBDIIResponse OBDIIPerformQuery(int socket, OBDIICommand *command)
{
		OBDIIResponse response = { 0 };

		// Send the command
	    int retval = write(socket, command->payload, sizeof(command->payload));
	    if (retval < 0 || retval != sizeof(command->payload)) {
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

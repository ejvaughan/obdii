#include "OBDIICommunication.h"

OBDIIResponse OBDIIPerformQuery(int socket, OBDIICommand command)
{
		OBDIIResponse response = { 0 };

		// Send the command
	    int retval = write(socket, command.payload, sizeof(command.payload));
	    if (retval < 0 || retval != sizeof(command.payload)) {
			return response;
	    }

	    // Receive the response
	    int responseLength = command.expectedResponseLength == 0 ? 4095 : command.expectedResponseLength;
	    unsigned char responsePayload[responseLength];
	    retval = read(socket, responsePayload, responseLength);

	    if (retval < 0 || (command.expectedResponseLength != 0 && retval != command.expectedResponseLength)) {
			return response;
	    }

	    return OBDIIDecodeResponseForCommand(command, responsePayload, retval);
}

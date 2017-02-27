#include "OBDII.h"

#define NULL 0

int OBDIIResponseSuccessful(OBDIICommand command, char *payload, int len)
{
	// A successful response has the exepected length and echoes the mode + 0x40 and the PID
	return len == command.expectedResponseLength &&
	payload[0] == command.payload[0] + 0x40 &&
	payload[1] == command.payload[1];
}

OBDIIResponse OBDIIDecodeSupportedPIDS_0_to_20(OBDIICommand command, char *payload, int len)
{
	OBDIIResponse response = { 0 };

	if ((response.success = OBDIIResponseSuccessful(command, payload, len))) {
		response.intValue = (payload[2] << 24) | (payload[3] << 16) | (payload[4] << 8) | payload[5];
	}

	return response;
}

struct OBDIICommands OBDIICommands = {
	{ "Supported PIDs in the range 01 - 20", { 0x01, 0x00 }, 6, &OBDIIDecodeSupportedPIDS_0_to_20 },
	{ "Monitor status since DTCs cleared", { 0x01, 0x01 }, 6, NULL },
	{ "Freeze DTC", { 0x01, 0x02 }, 4, NULL },
	{ "Fuel system status", { 0x01, 0x03 }, 4, NULL },
	{ "Calculated engine load", { 0x01, 0x04 }, 3, NULL },
	{ "Engine coolant temperature", { 0x01, 0x05 }, 3, NULL },
	{ "Short term fuel trim—Bank 1", { 0x01, 0x06}, 3, NULL },
	{ "Long term fuel trim—Bank 1", { 0x01, 0x07 }, 3, NULL },
	{ "Short term fuel trim—Bank 2", { 0x01, 0x08}, 3, NULL },
	{ "Long term fuel trim—Bank 2", { 0x01, 0x09 }, 3, NULL },
	{ "Fuel pressure (gauge pressure)", { 0x01, 0x0A }, 3, NULL },
	{ "Intake manifold absolute pressure", { 0x01, 0x0B }, 3, NULL },
	{ "Engine RPM", { 0x01, 0x0C }, 4, NULL },
	{ "Vehicle speed", { 0x01, 0x0D }, 3, NULL },
	{ "Timing advance", { 0x01, 0x0E }, 3, NULL },
	{ "Intake air temperature", { 0x01, 0x0F }, 3, NULL }
};
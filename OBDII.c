#include "OBDII.h"

#define NULL 0

int OBDIIResponseSuccessful(OBDIICommand command, char *payload, int len)
{
	// A successful response has the exepected length and echoes the mode + 0x40 and the PID
	return len == command.expectedResponseLength &&
	payload[0] == command.payload[0] + 0x40 &&
	payload[1] == command.payload[1];
}

void OBDIIDecodeSupportedPIDs(OBDIIResponse *response, char *responsePayload, int len)
{
	response->intValue = (responsePayload[2] << 24) | (responsePayload[3] << 16) | (responsePayload[4] << 8) | responsePayload[5];
}

void OBDIIDecodeEngineRPMs(OBDIIResponse *response, char *responsePayload, int len)
{
	response->floatValue = (256.0 * responsePayload[2] + responsePayload[3]) / 4.0;
}

void OBDIIDecodeVehicleSpeed(OBDIIResponse *response, char *responsePayload, int len)
{
	response->intValue = responsePayload[2];
}

void OBDIIDecodeTimingAdvance(OBDIIResponse *response, char *responsePayload, int len)
{
	response->floatValue = (responsePayload[2] / 2.0) - 64;
}

void OBDIIDecodeTemperature(OBDIIResponse *response, char *responsePayload, int len)
{
	response->intValue = responsePayload[2] - 40;
}

void OBDIIDecodeCalculatedEngineLoad(OBDIIResponse *response, char *responsePayload, int len)
{
	response->floatValue = responsePayload[2] / 2.55;
}

void OBDIIDecodeFuelTrim(OBDIIResponse *response, char *responsePayload, int len)
{
	response->floatValue = responsePayload[2] / 1.28 - 100;
}

void OBDIIDecodeFuelPressure(OBDIIResponse *response, char *responsePayload, int len)
{
	response->intValue = 3 * responsePayload[2];
}

void OBDIIDecodeIntakeManifoldPressure(OBDIIResponse *response, char *responsePayload, int len)
{
	response->intValue = responsePayload[2];
}

OBDIIResponse OBDIIDecodeResponseForCommand(OBDIICommand command, char *payload, int len)
{
	OBDIIResponse response = { 0 };

	if ((response.success = OBDIIResponseSuccessful(command, payload, len))) {
		command.responseDecoder(&response, payload, len);
	}

	return response;
}

struct OBDIICommands OBDIICommands = {
	{ "Supported PIDs in the range 01 - 20", { 0x01, 0x00 }, 6, &OBDIIDecodeSupportedPIDs },
	{ "Monitor status since DTCs cleared", { 0x01, 0x01 }, 6, NULL },
	{ "Freeze DTC", { 0x01, 0x02 }, 4, NULL },
	{ "Fuel system status", { 0x01, 0x03 }, 4, NULL },
	{ "Calculated engine load", { 0x01, 0x04 }, 3, &OBDIIDecodeCalculatedEngineLoad },
	{ "Engine coolant temperature", { 0x01, 0x05 }, 3, &OBDIIDecodeTemperature },
	{ "Short term fuel trim—Bank 1", { 0x01, 0x06}, 3, &OBDIIDecodeFuelTrim },
	{ "Long term fuel trim—Bank 1", { 0x01, 0x07 }, 3, &OBDIIDecodeFuelTrim },
	{ "Short term fuel trim—Bank 2", { 0x01, 0x08}, 3, &OBDIIDecodeFuelTrim },
	{ "Long term fuel trim—Bank 2", { 0x01, 0x09 }, 3, &OBDIIDecodeFuelTrim },
	{ "Fuel pressure (gauge pressure)", { 0x01, 0x0A }, 3, &OBDIIDecodeFuelPressure },
	{ "Intake manifold absolute pressure", { 0x01, 0x0B }, 3, &OBDIIDecodeIntakeManifoldPressure },
	{ "Engine RPM", { 0x01, 0x0C }, 4, &OBDIIDecodeEngineRPMs },
	{ "Vehicle speed", { 0x01, 0x0D }, 3, &OBDIIDecodeVehicleSpeed },
	{ "Timing advance", { 0x01, 0x0E }, 3, &OBDIIDecodeTimingAdvance },
	{ "Intake air temperature", { 0x01, 0x0F }, 3, &OBDIIDecodeTemperature }
};
#include <stdlib.h>
#include <string.h>
#include "OBDII.h"

int OBDIIResponseSuccessful(OBDIICommand command, unsigned char *payload, int len)
{
	if (len <= 0) {
		return 0;
	}

	// For responses whose length we can anticipate, make sure the actual length matches
	if (command.expectedResponseLength != 0 && len != command.expectedResponseLength) {
		return 0;
	}

	// A successful reseponse adds 0x40 to the mode byte
	char mode = command.payload[0];
	if (payload[0] != mode + 0x40) {
		return 0;
	}

	// PIDs should match
	if (mode == 0x01 || mode == 0x09) {
		if (len < 2 || payload[1] != command.payload[1]) {
			return 0;
		}
	}

	return 1;
}

void OBDIIDecodeSupportedPIDs(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->bitfieldValue = (responsePayload[2] << 24) | (responsePayload[3] << 16) | (responsePayload[4] << 8) | responsePayload[5];
}

void OBDIIDecodeEngineRPMs(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->floatValue = (256.0 * responsePayload[2] + responsePayload[3]) / 4.0;
}

void OBDIIDecodeVehicleSpeed(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->floatValue = responsePayload[2];
}

void OBDIIDecodeTimingAdvance(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->floatValue = (responsePayload[2] / 2.0) - 64;
}

void OBDIIDecodeTemperature(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->floatValue = responsePayload[2] - 40;
}

void OBDIIDecodeCalculatedEngineLoad(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->floatValue = responsePayload[2] / 2.55;
}

void OBDIIDecodeFuelTrim(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->floatValue = responsePayload[2] / 1.28 - 100;
}

void OBDIIDecodeFuelPressure(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->floatValue = 3 * responsePayload[2];
}

void OBDIIDecodeIntakeManifoldPressure(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->floatValue = responsePayload[2];
}

void OBDIIDecodeDTCs(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	#define RawToAscii(raw) (((raw) > 9) ? 'A' + (raw) - 9 : '0' + (raw))

	const int bytesPerDTC = 2;

	int numBytes = len - 1;
	if (numBytes % bytesPerDTC != 0) {
		return;
	}

	int numDTCs = numBytes / bytesPerDTC;
	response->DTCs = malloc(numDTCs * sizeof(*response->DTCs));
	response->numDTCs = numDTCs;

	int i;
	for (i = 0; i < numDTCs; i++) {
		int offset = 1 + i * bytesPerDTC;
		unsigned char a = responsePayload[offset];
		unsigned char b = responsePayload[offset + 1];

		char *DTC = response->DTCs[i];

		// Fill in the DTC characters
		unsigned char rawFirstCharacter = a >> 6;
		if (rawFirstCharacter == 0) {
			DTC[0] = 'P'; // Powertrain
		} else if (rawFirstCharacter == 1) {
			DTC[0] = 'C'; // Chassis
		} else if (rawFirstCharacter == 2) {
			DTC[0] = 'B'; // Body
		} else if (rawFirstCharacter == 3) {
			DTC[0] = 'U'; // Network
		}

		DTC[1] = '0' + ((a & 0x30) >> 4);
		DTC[2] = RawToAscii(a & 0x0F);
		DTC[3] = RawToAscii(b >> 4);
		DTC[4] = RawToAscii(b & 0x0F);
		DTC[5] = '\0';
	}
}

void OBDIIDecodeVIN(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	len -= 2;

	response->stringValue = malloc(len + 1);

	if (response->stringValue) {
		strncpy(response->stringValue, responsePayload + 2, len);
		response->stringValue[len] = '\0';
	}
}

OBDIIResponse OBDIIDecodeResponseForCommand(OBDIICommand command, unsigned char *payload, int len)
{
	OBDIIResponse response = { 0 };

	if ((response.success = OBDIIResponseSuccessful(command, payload, len))) {
		command.responseDecoder(&response, payload, len);
	}

	return response;
}

void OBDIIResponseFree(OBDIIResponse response)
{
	if (response.DTCs != NULL) {
		free(response.DTCs);
	}

	if (response.stringValue != NULL) {
		free(response.stringValue);
	}
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
	{ "Intake air temperature", { 0x01, 0x0F }, 3, &OBDIIDecodeTemperature },
	{ "Get DTCs", { 0x03 }, 0, &OBDIIDecodeDTCs },
	{ "Get VIN", { 0x09, 0x02 }, 0, &OBDIIDecodeVIN }
};
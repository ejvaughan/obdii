#include <stdlib.h>
#include <string.h>
#include "OBDII.h"
#include "OBDII_Private.h"

int OBDIICommandSetContainsCommand(OBDIICommandSet *commandSet, OBDIICommand *command)
{
	if (!commandSet || !command) {
		return 0;
	}
	
	char mode = GET_COMMAND_MODE(command);
	if (mode == 0x01) {
		char pid = GET_COMMAND_PID(command);

		if (pid <= 0x20) {
			return !!(commandSet->_mode1SupportedPIDs._0_to_20 & (1 << pid));
		} else if (pid <= 0x40) {
			return !!(commandSet->_mode1SupportedPIDs._21_to_40 & (1 << (pid - 0x21)));
		} else if (pid <= 0x60) {
			return !!(commandSet->_mode1SupportedPIDs._41_to_60 & (1 << (pid - 0x41)));
		} else {
			return !!(commandSet->_mode1SupportedPIDs._61_to_80 & (1 << (pid - 0x61)));
		}
	} else if (mode == 0x09) {
		char pid = GET_COMMAND_PID(command);

		return !!(commandSet->_mode9SupportedPIDs & (1 << pid));
	}

	return 0;
}

int OBDIIResponseSuccessful(OBDIICommand *command, unsigned char *payload, int len)
{
	if (!command || !payload || len <= 0) {
		return 0;
	}

	// For responses whose length we can anticipate, make sure the actual length matches
	if (command->expectedResponseLength != VARIABLE_RESPONSE_LENGTH && len != command->expectedResponseLength) {
		return 0;
	}

	// A successful response adds 0x40 to the mode byte
	char mode = GET_COMMAND_MODE(command);
	if (payload[0] != mode + 0x40) {
		return 0;
	}

	// PIDs should match
	if (mode == 0x01 || mode == 0x09) {
		if (len < 2 || payload[1] != command->payload[1]) {
			return 0;
		}
	}

	return 1;
}

void OBDIIDecodeBitfield(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->bitfieldValue = (responsePayload[2] << 24) | (responsePayload[3] << 16) | (responsePayload[4] << 8) | responsePayload[5];
}

void OBDIIDecodeEngineRPMs(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->numericValue = (256.0 * responsePayload[2] + responsePayload[3]) / 4.0;
}

void OBDIIDecodeTimingAdvance(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->numericValue = (responsePayload[2] / 2.0) - 64;
}

void OBDIIDecodeTemperature(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->numericValue = responsePayload[2] - 40;
}

void OBDIIDecodePercentage(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->numericValue = responsePayload[2] / 2.55;
}

void OBDIIDecodeFuelTrim(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->numericValue = responsePayload[2] / 1.28 - 100;
}

void OBDIIDecodeFuelPressure(OBDIIResponse *response, unsigned char *responsePayload, int len)
{
	response->numericValue = 3 * responsePayload[2];
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
	response->DTCs.troubleCodes = malloc(numDTCs * sizeof(*response->DTCs.troubleCodes));
	response->DTCs.numTroubleCodes = numDTCs;

	int i;
	for (i = 0; i < numDTCs; i++) {
		int offset = 1 + i * bytesPerDTC;
		unsigned char a = responsePayload[offset];
		unsigned char b = responsePayload[offset + 1];

		char *DTC = response->DTCs.troubleCodes[i];

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

void OBDIIDecodeOxygenSensorValues(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen) {
	response->oxygenSensorValues.voltage = responsePayload[2] / 200.0;
	response->oxygenSensorValues.shortTermFuelTrim = (100.0 / 128.0) * responsePayload[3] - 100.0;
}

void OBDIIDecodeThrottlePosition(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen) {
	response->numericValue = (100.0 / 255.0) * responsePayload[2];
}

void OBDIIDecodeMAFAirFlowRate(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen) {
	response->numericValue = (responsePayload[2] << 8 | responsePayload[3]) / 100.0;
}

void OBDIIDecodeSingleByteBitfield(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen) {
	response->bitfieldValue = responsePayload[2];
}

void OBDIIDecodeUInt16(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
	response->numericValue = responsePayload[2] << 8 | responsePayload[3];
}

void OBDIIDecodeFuelRailPressure(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
	response->numericValue = 0.079 * (responsePayload[2] << 8 | responsePayload[3]);
}

void OBDIIDecodeFuelRailGaugePressure(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
	response->numericValue = 10 * (responsePayload[2] << 8 | responsePayload[3]);
}

void OBDIIDecodeOxygenSensorValues2(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
	response->oxygenSensorValues.voltage = 8.0 / 65536.0 * (responsePayload[4] << 8 | responsePayload[5]);
	response->oxygenSensorValues.fuelAirEquivalenceRatio = 2.0 / 65536.0 * (responsePayload[2] << 8 | responsePayload[3]);
}

void OBDIIDecodeUInt8(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
	response->numericValue = responsePayload[2];
}

void OBDIIDecodeEGRError(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
	response->numericValue = 100.0 / 128.0 * responsePayload[2] - 100.0;
}

void OBDIIDecodeVaporPressure(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
	response->numericValue = ((signed char)responsePayload[2] << 8 | responsePayload[3]) / 4.0;
}

void OBDIIDecodeOxygenSensorValues3(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
	response->oxygenSensorValues.fuelAirEquivalenceRatio = 2.0 / 65536.0 * (responsePayload[2] << 8 | responsePayload[3]);
	response->oxygenSensorValues.current = (responsePayload[4] << 8 | responsePayload[5]) / 256.0 - 128.0;
}

void OBDIIDecodeCatalystTemperature(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
	response->numericValue = (responsePayload[2] << 8 | responsePayload[3]) / 10.0 - 40.0;
}	

void OBDIIDecodeControlModuleVoltage(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
	response->numericValue = (responsePayload[2] << 8 | responsePayload[3]) / 1000.0;
}

void OBDIIDecodeAbsoluteLoadValue(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
	response->numericValue = 100.0 / 255.0 * (responsePayload[2] << 8 | responsePayload[3]);
}

void OBDIIDecodeFuelAirEquivalence(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
	response->numericValue = 2.0 / 65536.0 * (responsePayload[2] << 8 | responsePayload[3]);
}

OBDIIResponse OBDIIDecodeResponseForCommand(OBDIICommand *command, unsigned char *payload, int len)
{
	OBDIIResponse response = { 0 };

	if (!command || !payload || len <= 0) {
		return response;
	}

	if ((response.success = OBDIIResponseSuccessful(command, payload, len))) {
		command->responseDecoder(&response, payload, len);
	}

	return response;
}

void OBDIIResponseFree(OBDIIResponse *response)
{
	if (!response) {
		return;
	}

	if (response->DTCs.troubleCodes != NULL) {
		free(response->DTCs.troubleCodes);
	}

	if (response->stringValue != NULL) {
		free(response->stringValue);
	}
}

struct OBDIICommands OBDIICommands = {
	// Mode 1
	{ "Supported PIDs in the range 01 - 20", { 0x01, 0x00 }, 6, &OBDIIDecodeBitfield },
	{ "Monitor status since DTCs cleared", { 0x01, 0x01 }, 6, NULL },
	{ "Freeze DTC", { 0x01, 0x02 }, 4, NULL },
	{ "Fuel system status", { 0x01, 0x03 }, 4, NULL },
	{ "Calculated engine load", { 0x01, 0x04 }, 3, &OBDIIDecodePercentage },
	{ "Engine coolant temperature", { 0x01, 0x05 }, 3, &OBDIIDecodeTemperature },
	{ "Short term fuel trim—Bank 1", { 0x01, 0x06}, 3, &OBDIIDecodeFuelTrim },
	{ "Long term fuel trim—Bank 1", { 0x01, 0x07 }, 3, &OBDIIDecodeFuelTrim },
	{ "Short term fuel trim—Bank 2", { 0x01, 0x08}, 3, &OBDIIDecodeFuelTrim },
	{ "Long term fuel trim—Bank 2", { 0x01, 0x09 }, 3, &OBDIIDecodeFuelTrim },
	{ "Fuel pressure (gauge pressure)", { 0x01, 0x0A }, 3, &OBDIIDecodeFuelPressure },
	{ "Intake manifold absolute pressure", { 0x01, 0x0B }, 3, &OBDIIDecodeUInt8 },
	{ "Engine RPM", { 0x01, 0x0C }, 4, &OBDIIDecodeEngineRPMs },
	{ "Vehicle speed", { 0x01, 0x0D }, 3, &OBDIIDecodeUInt8 },
	{ "Timing advance", { 0x01, 0x0E }, 3, &OBDIIDecodeTimingAdvance },
	{ "Intake air temperature", { 0x01, 0x0F }, 3, &OBDIIDecodeTemperature },
	{ "MAF air flow rate", { 0x01, 0x10 }, 4, &OBDIIDecodeMAFAirFlowRate },
	{ "Throttle position", { 0x01, 0x11 }, 3, &OBDIIDecodeThrottlePosition },
	{ "Commanded secondary air status", { 0x01, 0x12 }, 3, &OBDIIDecodeSingleByteBitfield },
	{ "Oxygen sensors present", { 0x01, 0x13 }, 3, &OBDIIDecodeSingleByteBitfield },
	{ "Oxygen sensor 1", { 0x01, 0x14 }, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 2", { 0x01, 0x15 }, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 3", { 0x01, 0x16 }, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 4", { 0x01, 0x17 }, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 5", { 0x01, 0x18 }, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 6", { 0x01, 0x19 }, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 7", { 0x01, 0x1A }, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 8", { 0x01, 0x1B }, 4, &OBDIIDecodeOxygenSensorValues },
	{ "OBD standards this vehicle conforms to", { 0x01, 0x1C }, 3, &OBDIIDecodeSingleByteBitfield },
	{ "Oxygen sensors present in 4 banks", { 0x01, 0x1D }, 3, &OBDIIDecodeSingleByteBitfield },
	{ "Auxiliary input status", { 0x01, 0x1E }, 3, &OBDIIDecodeSingleByteBitfield },
	{ "Run time since engine start", { 0x01, 0x1F }, 4, &OBDIIDecodeUInt16 },
	{ "Supported PIDs in the range 21 - 40", { 0x01, 0x20 }, 6, &OBDIIDecodeBitfield },
	{ "Distance traveled with malfunction indicator lamp on", { 0x01, 0x21 }, 4, &OBDIIDecodeUInt16 },
	{ "Fuel rail pressure (relative to mainfold vacuum", { 0x01, 0x22 }, 4, &OBDIIDecodeFuelRailPressure },
	{ "Fuel rail gauge pressure (diesel, or gasoline direct injection", { 0x01, 0x23 }, 4, &OBDIIDecodeFuelRailGaugePressure },
	{ "Oxygen sensor 1", { 0x01, 0x24 }, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 2", { 0x01, 0x25 }, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 3", { 0x01, 0x26 }, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 4", { 0x01, 0x27 }, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 5", { 0x01, 0x28 }, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 6", { 0x01, 0x29 }, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 7", { 0x01, 0x2A }, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 8", { 0x01, 0x2B }, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Commanded EGR", { 0x01, 0x2C }, 3, &OBDIIDecodePercentage },
	{ "EGR error", { 0x01, 0x2D }, 3, &OBDIIDecodeEGRError },
	{ "Commanded evaporative purge", { 0x01, 0x2E }, 3, &OBDIIDecodePercentage },
	{ "Fuel tank level input", { 0x01, 0x2F }, 3, &OBDIIDecodePercentage },
	{ "Warm-ups since codes cleared", { 0x01, 0x30 }, 3, &OBDIIDecodeUInt8 },
	{ "Distance traveled since codes cleared", { 0x01, 0x31 }, 4, &OBDIIDecodeUInt16 },
	{ "Evaporative system vapor pressure", { 0x01, 0x32 }, 4, &OBDIIDecodeVaporPressure },
	{ "Absolute barometric pressure", { 0x01, 0x33 }, 3, &OBDIIDecodeUInt8 },
	{ "Oxygen sensor 1", { 0x01, 0x34 }, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 2", { 0x01, 0x35 }, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 3", { 0x01, 0x36 }, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 4", { 0x01, 0x37 }, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 5", { 0x01, 0x38 }, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 6", { 0x01, 0x39 }, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 7", { 0x01, 0x3A }, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 8", { 0x01, 0x3B }, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Catalyst temperature, bank 1, sensor 1", { 0x01, 0x3C }, 4, &OBDIIDecodeCatalystTemperature },
	{ "Catalyst temperature, bank 2, sensor 1", { 0x01, 0x3D }, 4, &OBDIIDecodeCatalystTemperature },
	{ "Catalyst temperature, bank 1, sensor 2", { 0x01, 0x3E }, 4, &OBDIIDecodeCatalystTemperature },
	{ "Catalyst temperature, bank 2, sensor 2", { 0x01, 0x3F }, 4, &OBDIIDecodeCatalystTemperature },
	{ "Supported PIDs in the range 41 - 60", { 0x01, 0x40 }, 6, &OBDIIDecodeBitfield },
	{ "Monitor status this drive cycle", { 0x01, 0x41 }, 6, &OBDIIDecodeBitfield },
	{ "Control module voltage", { 0x01, 0x42 }, 4, &OBDIIDecodeControlModuleVoltage },
	{ "Absolute load value", { 0x01, 0x43 }, 4, &OBDIIDecodeAbsoluteLoadValue },
	{ "Fuel–Air commanded equivalence ratio", { 0x01, 0x44 }, 4, &OBDIIDecodeFuelAirEquivalence },
	{ "Relative throttle position", { 0x01, 0x45 }, 3, &OBDIIDecodePercentage },
	{ "Ambient air temperature", { 0x01, 0x46 }, 3, &OBDIIDecodeTemperature },
	{ "Absolute throttle position B", { 0x01, 0x47 }, 3, &OBDIIDecodePercentage },
	{ "Absolute throttle position C", { 0x01, 0x48 }, 3, &OBDIIDecodePercentage },
	{ "Accelerator pedal position D", { 0x01, 0x49 }, 3, &OBDIIDecodePercentage },
	{ "Accelerator pedal position E", { 0x01, 0x4A }, 3, &OBDIIDecodePercentage },
	{ "Accelerator pedal position F", { 0x01, 0x4B }, 3, &OBDIIDecodePercentage },
	{ "Commanded throttle actuator", { 0x01, 0x4C }, 3, &OBDIIDecodePercentage },
	{ "Time run with MIL on", { 0x01, 0x4D }, 4, &OBDIIDecodeUInt16 },
	{ "Time since trouble codes cleared", { 0x01, 0x4E }, 4, &OBDIIDecodeUInt16 },
	{ "Supported PIDs in the range 61 - 80", { 0x01, 0x60 }, 6, &OBDIIDecodeBitfield },

	// Mode 3
	{ "Get DTCs", { 0x03 }, VARIABLE_RESPONSE_LENGTH, &OBDIIDecodeDTCs },

	// Mode 9
	{ "Supported PIDs", { 0x09, 0x00 }, 6, &OBDIIDecodeBitfield },
	{ "VIN message count", { 0x09, 0x01 }, 3, NULL },
	{ "Get VIN", { 0x09, 0x02 }, VARIABLE_RESPONSE_LENGTH, &OBDIIDecodeVIN }
};

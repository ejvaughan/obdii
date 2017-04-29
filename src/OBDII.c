#include <stdlib.h>
#include <string.h>
#include "OBDII.h"

int OBDIICommandSetContainsCommand(OBDIICommandSet *commandSet, OBDIICommand *command)
{
	if (!commandSet || !command) {
		return 0;
	}
	
	unsigned char mode = OBDIICommandGetMode(command);
	if (mode == 0x01) {
		unsigned char pid = OBDIICommandGetPID(command);

		if (pid == 0x00) {
		       return 1;
		} else if (pid <= 0x20) {
			return !!(commandSet->_mode1SupportedPIDs._1_to_20 & (1 << (0x20 - pid)));
		} else if (pid <= 0x40) {
			return !!(commandSet->_mode1SupportedPIDs._21_to_40 & (1 << (0x40 - pid)));
		} else if (pid <= 0x60) {
			return !!(commandSet->_mode1SupportedPIDs._41_to_60 & (1 << (0x60 - pid)));
		} else {
			return !!(commandSet->_mode1SupportedPIDs._61_to_80 & (1 << (0x80 - pid)));
		}
	} else if (mode == 0x09) {
		unsigned char pid = OBDIICommandGetPID(command);

		if (pid == 0x00) {
			return 1;
		} else {
			return !!(commandSet->_mode9SupportedPIDs & (1 << (0x20 - pid)));
		}
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
	char mode = OBDIICommandGetMode(command);
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
	#define RawToAscii(raw) (((raw) > 9) ? 'A' + (raw) - 10 : '0' + (raw))

	const int bytesPerDTC = 2;

	// Sanity check
	int numBytes = len - 2;
	if (numBytes < 0 || numBytes % bytesPerDTC != 0) {
		response->success = 0;
		return;
	}

	int numDTCs = numBytes / bytesPerDTC;
	response->DTCs.troubleCodes = malloc(numDTCs * sizeof(*response->DTCs.troubleCodes));
	response->DTCs.numTroubleCodes = numDTCs;

	int i;
	for (i = 0; i < numDTCs; i++) {
		int offset = 2 + i * bytesPerDTC;
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

void OBDIIDecodeTwoByteBitfield(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen) 
{
	response->bitfieldValue = responsePayload[2] << 8 | responsePayload[3];
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

void OBDIIDecodeNop(OBDIIResponse *response, unsigned char *responsePayload, int payloadLen)
{
}

OBDIIResponse OBDIIDecodeResponseForCommand(OBDIICommand *command, unsigned char *payload, int len)
{
	OBDIIResponse response = { 0 };
	response.command = command;

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

	if (response->command == OBDIICommands.DTCs && response->DTCs.troubleCodes != NULL) {
		free(response->DTCs.troubleCodes);
	}

	if (response->command->responseType == OBDIIResponseTypeString && response->stringValue != NULL) {
		free(response->stringValue);
	}
}

OBDIICommand OBDIIMode1Commands[] = {
	{ "Supported PIDs in the range 01 - 20", { 0x01, 0x00 }, OBDIIResponseTypeBitfield, 6, &OBDIIDecodeBitfield },
	{ "Monitor status since DTCs cleared", { 0x01, 0x01 }, OBDIIResponseTypeBitfield, 6, &OBDIIDecodeBitfield },
	{ "Freeze DTC", { 0x01, 0x02 }, OBDIIResponseTypeOther, 4, &OBDIIDecodeNop },
	{ "Fuel system status", { 0x01, 0x03 }, OBDIIResponseTypeBitfield, 4, &OBDIIDecodeTwoByteBitfield },
	{ "Calculated engine load", { 0x01, 0x04 }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodePercentage },
	{ "Engine coolant temperature", { 0x01, 0x05 }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeTemperature },
	{ "Short term fuel trim—Bank 1", { 0x01, 0x06}, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeFuelTrim },
	{ "Long term fuel trim—Bank 1", { 0x01, 0x07 }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeFuelTrim },
	{ "Short term fuel trim—Bank 2", { 0x01, 0x08}, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeFuelTrim },
	{ "Long term fuel trim—Bank 2", { 0x01, 0x09 }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeFuelTrim },
	{ "Fuel pressure (gauge pressure)", { 0x01, 0x0A }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeFuelPressure },
	{ "Intake manifold absolute pressure", { 0x01, 0x0B }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeUInt8 },
	{ "Engine RPM", { 0x01, 0x0C }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeEngineRPMs },
	{ "Vehicle speed", { 0x01, 0x0D }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeUInt8 },
	{ "Timing advance", { 0x01, 0x0E }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeTimingAdvance },
	{ "Intake air temperature", { 0x01, 0x0F }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeTemperature },
	{ "MAF air flow rate", { 0x01, 0x10 }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeMAFAirFlowRate },
	{ "Throttle position", { 0x01, 0x11 }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeThrottlePosition },
	{ "Commanded secondary air status", { 0x01, 0x12 }, OBDIIResponseTypeBitfield, 3, &OBDIIDecodeSingleByteBitfield },
	{ "Oxygen sensors present", { 0x01, 0x13 }, OBDIIResponseTypeBitfield, 3, &OBDIIDecodeSingleByteBitfield },
	{ "Oxygen sensor 1", { 0x01, 0x14 }, OBDIIResponseTypeOther, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 2", { 0x01, 0x15 }, OBDIIResponseTypeOther, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 3", { 0x01, 0x16 }, OBDIIResponseTypeOther, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 4", { 0x01, 0x17 }, OBDIIResponseTypeOther, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 5", { 0x01, 0x18 }, OBDIIResponseTypeOther, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 6", { 0x01, 0x19 }, OBDIIResponseTypeOther, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 7", { 0x01, 0x1A }, OBDIIResponseTypeOther, 4, &OBDIIDecodeOxygenSensorValues },
	{ "Oxygen sensor 8", { 0x01, 0x1B }, OBDIIResponseTypeOther, 4, &OBDIIDecodeOxygenSensorValues },
	{ "OBD standards this vehicle conforms to", { 0x01, 0x1C }, OBDIIResponseTypeBitfield, 3, &OBDIIDecodeSingleByteBitfield },
	{ "Oxygen sensors present in 4 banks", { 0x01, 0x1D }, OBDIIResponseTypeBitfield, 3, &OBDIIDecodeSingleByteBitfield },
	{ "Auxiliary input status", { 0x01, 0x1E }, OBDIIResponseTypeBitfield, 3, &OBDIIDecodeSingleByteBitfield },
	{ "Run time since engine start", { 0x01, 0x1F }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeUInt16 },
	{ "Supported PIDs in the range 21 - 40", { 0x01, 0x20 }, OBDIIResponseTypeBitfield, 6, &OBDIIDecodeBitfield },
	{ "Distance traveled with malfunction indicator lamp on", { 0x01, 0x21 }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeUInt16 },
	{ "Fuel rail pressure (relative to mainfold vacuum", { 0x01, 0x22 }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeFuelRailPressure },
	{ "Fuel rail gauge pressure (diesel, or gasoline direct injection", { 0x01, 0x23 }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeFuelRailGaugePressure },
	{ "Oxygen sensor 1", { 0x01, 0x24 }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 2", { 0x01, 0x25 }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 3", { 0x01, 0x26 }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 4", { 0x01, 0x27 }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 5", { 0x01, 0x28 }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 6", { 0x01, 0x29 }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 7", { 0x01, 0x2A }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Oxygen sensor 8", { 0x01, 0x2B }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues2 },
	{ "Commanded EGR", { 0x01, 0x2C }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodePercentage },
	{ "EGR error", { 0x01, 0x2D }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeEGRError },
	{ "Commanded evaporative purge", { 0x01, 0x2E }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodePercentage },
	{ "Fuel tank level input", { 0x01, 0x2F }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodePercentage },
	{ "Warm-ups since codes cleared", { 0x01, 0x30 }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeUInt8 },
	{ "Distance traveled since codes cleared", { 0x01, 0x31 }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeUInt16 },
	{ "Evaporative system vapor pressure", { 0x01, 0x32 }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeVaporPressure },
	{ "Absolute barometric pressure", { 0x01, 0x33 }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeUInt8 },
	{ "Oxygen sensor 1", { 0x01, 0x34 }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 2", { 0x01, 0x35 }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 3", { 0x01, 0x36 }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 4", { 0x01, 0x37 }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 5", { 0x01, 0x38 }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 6", { 0x01, 0x39 }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 7", { 0x01, 0x3A }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Oxygen sensor 8", { 0x01, 0x3B }, OBDIIResponseTypeOther, 6, &OBDIIDecodeOxygenSensorValues3 },
	{ "Catalyst temperature, bank 1, sensor 1", { 0x01, 0x3C }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeCatalystTemperature },
	{ "Catalyst temperature, bank 2, sensor 1", { 0x01, 0x3D }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeCatalystTemperature },
	{ "Catalyst temperature, bank 1, sensor 2", { 0x01, 0x3E }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeCatalystTemperature },
	{ "Catalyst temperature, bank 2, sensor 2", { 0x01, 0x3F }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeCatalystTemperature },
	{ "Supported PIDs in the range 41 - 60", { 0x01, 0x40 }, OBDIIResponseTypeBitfield, 6, &OBDIIDecodeBitfield },
	{ "Monitor status this drive cycle", { 0x01, 0x41 }, OBDIIResponseTypeBitfield, 6, &OBDIIDecodeBitfield },
	{ "Control module voltage", { 0x01, 0x42 }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeControlModuleVoltage },
	{ "Absolute load value", { 0x01, 0x43 }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeAbsoluteLoadValue },
	{ "Fuel–Air commanded equivalence ratio", { 0x01, 0x44 }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeFuelAirEquivalence },
	{ "Relative throttle position", { 0x01, 0x45 }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodePercentage },
	{ "Ambient air temperature", { 0x01, 0x46 }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodeTemperature },
	{ "Absolute throttle position B", { 0x01, 0x47 }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodePercentage },
	{ "Absolute throttle position C", { 0x01, 0x48 }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodePercentage },
	{ "Accelerator pedal position D", { 0x01, 0x49 }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodePercentage },
	{ "Accelerator pedal position E", { 0x01, 0x4A }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodePercentage },
	{ "Accelerator pedal position F", { 0x01, 0x4B }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodePercentage },
	{ "Commanded throttle actuator", { 0x01, 0x4C }, OBDIIResponseTypeNumeric, 3, &OBDIIDecodePercentage },
	{ "Time run with MIL on", { 0x01, 0x4D }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeUInt16 },
	{ "Time since trouble codes cleared", { 0x01, 0x4E }, OBDIIResponseTypeNumeric, 4, &OBDIIDecodeUInt16 }/*,
	{ "Supported PIDs in the range 61 - 80", { 0x01, 0x60 }, 6, &OBDIIDecodeBitfield }*/
};


OBDIICommand OBDIIMode3Command = { "Get DTCs", { 0x03 }, OBDIIResponseTypeOther, VARIABLE_RESPONSE_LENGTH, &OBDIIDecodeDTCs };

OBDIICommand OBDIIMode9Commands[] = {
	{ "Supported PIDs", { 0x09, 0x00 }, OBDIIResponseTypeBitfield, 6, &OBDIIDecodeBitfield },
	{ "VIN message count", { 0x09, 0x01 }, OBDIIResponseTypeNumeric, 3, NULL },
	{ "Get VIN", { 0x09, 0x02 }, OBDIIResponseTypeString, VARIABLE_RESPONSE_LENGTH, &OBDIIDecodeVIN }
};

struct OBDIICommands OBDIICommands = {
	// Mode 1
	&OBDIIMode1Commands[0],
	&OBDIIMode1Commands[1],
	&OBDIIMode1Commands[2],
	&OBDIIMode1Commands[3],
	&OBDIIMode1Commands[4],
	&OBDIIMode1Commands[5],
	&OBDIIMode1Commands[6],
	&OBDIIMode1Commands[7],
	&OBDIIMode1Commands[8],
	&OBDIIMode1Commands[9],
	&OBDIIMode1Commands[10],
	&OBDIIMode1Commands[11],
	&OBDIIMode1Commands[12],
	&OBDIIMode1Commands[13],
	&OBDIIMode1Commands[14],
	&OBDIIMode1Commands[15],
	&OBDIIMode1Commands[16],
	&OBDIIMode1Commands[17],
	&OBDIIMode1Commands[18],
	&OBDIIMode1Commands[19],
	&OBDIIMode1Commands[20],
	&OBDIIMode1Commands[21],
	&OBDIIMode1Commands[22],
	&OBDIIMode1Commands[23],
	&OBDIIMode1Commands[24],
	&OBDIIMode1Commands[25],
	&OBDIIMode1Commands[26],
	&OBDIIMode1Commands[27],
	&OBDIIMode1Commands[28],
	&OBDIIMode1Commands[29],
	&OBDIIMode1Commands[30],
	&OBDIIMode1Commands[31],
	&OBDIIMode1Commands[32],
	&OBDIIMode1Commands[33],
	&OBDIIMode1Commands[34],
	&OBDIIMode1Commands[35],
	&OBDIIMode1Commands[36],
	&OBDIIMode1Commands[37],
	&OBDIIMode1Commands[38],
	&OBDIIMode1Commands[39],
	&OBDIIMode1Commands[40],
	&OBDIIMode1Commands[41],
	&OBDIIMode1Commands[42],
	&OBDIIMode1Commands[43],
	&OBDIIMode1Commands[44],
	&OBDIIMode1Commands[45],
	&OBDIIMode1Commands[46],
	&OBDIIMode1Commands[47],
	&OBDIIMode1Commands[48],
	&OBDIIMode1Commands[49],
	&OBDIIMode1Commands[50],
	&OBDIIMode1Commands[51],
	&OBDIIMode1Commands[52],
	&OBDIIMode1Commands[53],
	&OBDIIMode1Commands[54],
	&OBDIIMode1Commands[55],
	&OBDIIMode1Commands[56],
	&OBDIIMode1Commands[57],
	&OBDIIMode1Commands[58],
	&OBDIIMode1Commands[59],
	&OBDIIMode1Commands[60],
	&OBDIIMode1Commands[61],
	&OBDIIMode1Commands[62],
	&OBDIIMode1Commands[63],
	&OBDIIMode1Commands[64],
	&OBDIIMode1Commands[65],
	&OBDIIMode1Commands[66],
	&OBDIIMode1Commands[67],
	&OBDIIMode1Commands[68],
	&OBDIIMode1Commands[69],
	&OBDIIMode1Commands[70],
	&OBDIIMode1Commands[71],
	&OBDIIMode1Commands[72],
	&OBDIIMode1Commands[73],
	&OBDIIMode1Commands[74],
	&OBDIIMode1Commands[75],
	&OBDIIMode1Commands[76],
	&OBDIIMode1Commands[77],
	&OBDIIMode1Commands[78],
//	&OBDIIMode1Commands[79],

	//OBDII Mode 3
	&OBDIIMode3Command,

	//OBDIIM Mode 9
	&OBDIIMode9Commands[0],
	&OBDIIMode9Commands[1],
	&OBDIIMode9Commands[2]
};

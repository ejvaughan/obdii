#ifndef __OBDII_H
#define __OBDII_H

#define VARIABLE_RESPONSE_LENGTH 0

typedef struct OBDIIResponse {
	int success;

	union {
		float floatValue;
		unsigned int bitfieldValue;
		char *stringValue; // for VIN or ECU name
		struct {
			char (*troubleCodes)[6];
			int numTroubleCodes;
		} DTCs;
	};
} OBDIIResponse;

struct OBDIICommand;
typedef void (*OBDIIResponseDecoder)(OBDIIResponse *, unsigned char *, int);

typedef struct OBDIICommand {
	char *name;
	unsigned char payload[2];
	short expectedResponseLength;
	OBDIIResponseDecoder responseDecoder;
} OBDIICommand;

typedef struct OBDIICommandSet {
	// Private
	struct {
		int _0_to_20;
		int _21_to_40;
		int _41_to_60;
		int _61_to_80;
	} _mode1SupportedPIDs;

	int _mode9SupportedPIDs;
} OBDIICommandSet;

struct OBDIICommands {
	// Mode 1
	OBDIICommand mode1SupportedPIDs_0_to_20;
	OBDIICommand monitorStatus;
	OBDIICommand freezeDTC;
	OBDIICommand fuelSystemStatus;
	OBDIICommand calculatedEngineLoad;		// Percentage
	OBDIICommand engineCoolantTemperature;		// Celsius
	OBDIICommand bank1ShortTermFuelTrim;		// Percentage
	OBDIICommand bank1LongTermFueldTrim;		// Percentage
	OBDIICommand bank2ShortTermFuelTrim; 		// Percentage
	OBDIICommand bank2LongTermFuelTrim; 		// Percentage
	OBDIICommand fuelPressure; 			// kPA
	OBDIICommand intakeManifoldAbsolutePressure; 	// kPA
	OBDIICommand engineRPMs;			// rpm
	OBDIICommand vehicleSpeed;			// km/h
	OBDIICommand timingAdvance;			// Degrees before TDC
	OBDIICommand intakeAirTemperature;		// Celsius
	OBDIICommand mode1SupportedPIDs_21_to_40;
	OBDIICommand mode1SupportedPIDs_41_to_60;
	OBDIICommand mode1SupportedPIDs_61_to_80;
	
	// Mode 3
	OBDIICommand DTCs;

	// Mode 9
	OBDIICommand mode9SupportedPIDs;
	OBDIICommand vinMessageCount;
	OBDIICommand VIN;
	OBDIICommand ECUName;
};

extern struct OBDIICommands OBDIICommands;

OBDIIResponse OBDIIDecodeResponseForCommand(OBDIICommand *command, unsigned char *responsePayload, int len);
void OBDIIResponseFree(OBDIIResponse *response);

int OBDIICommandSetContainsCommand(OBDIICommandSet *commandSet, OBDIICommand *command);

#endif /* OBDII.h */

#ifndef __OBDII_H
#define __OBDII_H

typedef struct OBDIIResponse {
	int success;

	union {
		float floatValue;
		int intValue;
	};
} OBDIIResponse;

struct OBDIICommand;
typedef OBDIIResponse (*OBDIIResponseDecoder)(struct OBDIICommand, char *, int);

typedef struct OBDIICommand {
	char *name;
	char payload[2];
	short expectedResponseLength;
	OBDIIResponseDecoder responseDecoder;
} OBDIICommand;

struct OBDIICommands {
	OBDIICommand supportedPIDs_0_to_20;
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
};

extern struct OBDIICommands OBDIICommands;

#endif /* OBDII.h */

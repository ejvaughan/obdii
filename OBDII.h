#ifndef __OBDII_H
#define __OBDII_H

typedef struct {
	char *name;

	struct {
		char mode;
		char PID;
	} payload;
} OBDIICommand;

typedef struct {
	OBDIICommand supportedPIDs_0_to_20;
	OBDIICommand monitorStatus;
	OBDIICommand freezeDTC;
	OBDIICommand fuelSystemStatus;
	OBDIICommand calculatedEngineLoad;				// Percentage
	OBDIICommand engineCoolantTemperature;			// Celsius
	OBDIICommand bank1ShortTermFuelTrim;			// Percentage
	OBDIICommand bank1LongTermFueldTrim;			// Percentage
	OBDIICommand bank2ShortTermFuelTrim; 			// Percentage
	OBDIICommand bank2LongTermFuelTrim; 			// Percentage
	OBDIICommand fuelPressure; 						// kPA
	OBDIICommand intakeManifoldAbsolutePressure; 	// kPA
	OBDIICommand engineRPMs;						// rpm
	OBDIICommand vehicleSpeed;						// km/h
	OBDIICommand timingAdvance;						// Degrees before TDC
	OBDIICommand intakeAirTemperature;				// Celsius
} OBDIICommandsT;

extern OBDIICommandsT OBDIICommands;

#endif __OBDII_H /* OBDII.h */
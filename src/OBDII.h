#ifndef __OBDII_H
#define __OBDII_H
#include <stdint.h>

#define VARIABLE_RESPONSE_LENGTH 0

typedef struct OBDIIResponse {
	int success;

	union {
		float numericValue;
		uint32_t bitfieldValue;
		char *stringValue; // for VIN or ECU name
		struct {
			char (*troubleCodes)[6];
			int numTroubleCodes;
		} DTCs;
		struct {
			union {
				float voltage;
				float current;
			};
			union {
				float shortTermFuelTrim;
				float fuelAirEquivalenceRatio;
			};
		} oxygenSensorValues;
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

#define OBDIICommandGetMode(command) (command)->payload[0]
#define OBDIICommandGetPID(command) (command)->payload[1]

typedef struct OBDIICommandSet {
	// Private
	struct {
		uint32_t _1_to_20;
		uint32_t _21_to_40;
		uint32_t _41_to_60;
		uint32_t _61_to_80;
	} _mode1SupportedPIDs;

	uint32_t _mode9SupportedPIDs;

	int numCommands;
	OBDIICommand **commands;
} OBDIICommandSet;

struct OBDIICommands {
	// Mode 1
	OBDIICommand *mode1SupportedPIDs_1_to_20;
	OBDIICommand *monitorStatus;
	OBDIICommand *freezeDTC;
	OBDIICommand *fuelSystemStatus;
	OBDIICommand *calculatedEngineLoad;		// Percentage
	OBDIICommand *engineCoolantTemperature;		// Celsius
	OBDIICommand *bank1ShortTermFuelTrim;		// Percentage
	OBDIICommand *bank1LongTermFueldTrim;		// Percentage
	OBDIICommand *bank2ShortTermFuelTrim; 		// Percentage
	OBDIICommand *bank2LongTermFuelTrim; 		// Percentage
	OBDIICommand *fuelPressure; 			// kPA
	OBDIICommand *intakeManifoldAbsolutePressure; 	// kPA
	OBDIICommand *engineRPMs;			// rpm
	OBDIICommand *vehicleSpeed;			// km/h
	OBDIICommand *timingAdvance;			// Degrees before TDC
	OBDIICommand *intakeAirTemperature;		// Celsius
	OBDIICommand *mafAirFlowRate;			// grams/sec
	OBDIICommand *throttlePosition;			// Percentage
	OBDIICommand *oxygenSensorsPresentIn2Banks;
	OBDIICommand *oxygenSensor1_fuelTrim;
	OBDIICommand *oxygenSensor2_fuelTrim;
	OBDIICommand *oxygenSensor3_fuelTrim;
	OBDIICommand *oxygenSensor4_fuelTrim;
	OBDIICommand *oxygenSensor5_fuelTrim;
	OBDIICommand *oxygenSensor6_fuelTrim;
	OBDIICommand *oxygenSensor7_fuelTrim;
	OBDIICommand *oxygenSensor8_fuelTrim;
	OBDIICommand *conformingStandards;
	OBDIICommand *oxygenSensorsPresentIn4Banks;
	OBDIICommand *auxiliaryInputStatus;
	OBDIICommand *runtimeSinceEngineStart;		// seconds
	OBDIICommand *mode1SupportedPIDs_21_to_40;
	OBDIICommand *distanceTraveledWithMalfunctionIndicatorLampOn;	// km
	OBDIICommand *fuelRailPressure;			// kPA
	OBDIICommand *fuelRailGaugePressure; 		// kPA
	OBDIICommand *oxygenSensor1_fuelAirRatioVoltage;
	OBDIICommand *oxygenSensor2_fuelAirRatioVoltage;
	OBDIICommand *oxygenSensor3_fuelAirRatioVoltage;
	OBDIICommand *oxygenSensor4_fuelAirRatioVoltage;
	OBDIICommand *oxygenSensor5_fuelAirRatioVoltage;
	OBDIICommand *oxygenSensor6_fuelAirRatioVoltage;
	OBDIICommand *oxygenSensor7_fuelAirRatioVoltage;
	OBDIICommand *oxygenSensor8_fuelAirRatioVoltage;
	OBDIICommand *commandedEGR;			// Percentage
	OBDIICommand *egrError;				// Percentage
	OBDIICommand *commandedEvaporativePurge; 	// Percentage
	OBDIICommand *fuelTankLevelInput;		// Percentage
	OBDIICommand *warmUpsSinceCodesCleared;
	OBDIICommand *distanceTraveledSinceCodesCleared; // km
	OBDIICommand *evaporativeSystemVaporPressure; 	// Pa
	OBDIICommand *absoluteBarometricPressure; 	// kPa
	OBDIICommand *oxygenSensor1_fuelAirRatioCurrent;	// current in mA
	OBDIICommand *oxygenSensor2_fuelAirRatioCurrent;
	OBDIICommand *oxygenSensor3_fuelAirRatioCurrent;
	OBDIICommand *oxygenSensor4_fuelAirRatioCurrent;
	OBDIICommand *oxygenSensor5_fuelAirRatioCurrent;
	OBDIICommand *oxygenSensor6_fuelAirRatioCurrent;
	OBDIICommand *oxygenSensor7_fuelAirRatioCurrent;
	OBDIICommand *oxygenSensor8_fuelAirRatioCurrent;
	OBDIICommand *catalystTemperatureBank1Sensor1; 	// Celsius
	OBDIICommand *catalystTemperatureBank2Sensor1;	// Celsius
	OBDIICommand *catalystTemperatureBank1Sensor2;	// Celsius
	OBDIICommand *catalystTemperatureBank2Sensor2;	// Celsius
	OBDIICommand *mode1SupportedPIDs_41_to_60;
	OBDIICommand *currentDriveCycleMonitorStatus;
	OBDIICommand *controlModuleVoltage;
	OBDIICommand *absoluteLoadValue;			// Percentage
	OBDIICommand *fuelAirCommandEquivalenceRatio;
	OBDIICommand *relativeThrottlePosition;		// Percentage
	OBDIICommand *ambientAirTemperature;		// Celsius
	OBDIICommand *absoluteThrottlePositionB;		// Percentage
	OBDIICommand *absoluteThrottlePositionC;		// Percentage
	OBDIICommand *acceleratorPedalPositionD;		// Percentage
	OBDIICommand *acceleratorPedalPositionE;		// Percentage
	OBDIICommand *acceleratorPedalPositionF;		// Percentage
	OBDIICommand *commandedThrottleActuator;		// Percentage
	OBDIICommand *timeRunWithMalfunctionIndicatorLampOn;	// minutes
	OBDIICommand *timeSinceTroubleCodesCleared;	// minutes
	/*OBDIICommand *mode1SupportedPIDs_61_to_80;*/
	
	// Mode 3
	OBDIICommand *DTCs;

	// Mode 9
	OBDIICommand *mode9SupportedPIDs;
	OBDIICommand *vinMessageCount;
	OBDIICommand *VIN;
	OBDIICommand *ECUName;
};

extern struct OBDIICommands OBDIICommands;
extern OBDIICommand OBDIIMode1Commands[79];
extern OBDIICommand OBDIIMode9Commands[3];

OBDIIResponse OBDIIDecodeResponseForCommand(OBDIICommand *command, unsigned char *responsePayload, int len);
void OBDIIResponseFree(OBDIIResponse *response);

int OBDIICommandSetContainsCommand(OBDIICommandSet *commandSet, OBDIICommand *command);
void OBDIICommandSetFree(OBDIICommandSet *commandSet);

#endif /* OBDII.h */

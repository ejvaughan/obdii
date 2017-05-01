#ifndef __OBDII_H
#define __OBDII_H
#include <stdint.h>

#define OBDII_API_VERSION 1

#define VARIABLE_RESPONSE_LENGTH 0

struct OBDIICommand; // Forward declaration

/**
 * Represents an OBDII response, obtained through a call to `OBDIIDecodeResponseForRequest` or `OBDIIPerformQuery`.
 *
 * For most commands, the diagnostic data is accessible via one of `numericValue`, `bitfieldValue`, or `stringValue`.
 * A few commands (`OBDIICommands.DTCs` and the `OBDIICommands.oxygenSensor*` commands) have specific properties in
 * the response object through which their data is accessed. Each command documents the type of data it returns. 
 * However, it is possible to dynamically determine the type, via the command's `responseType` property. E.g.
 *
 *     switch (response.command->responseType) {
 *         case OBDIIResponseTypeBitfield:
 *             printf("%08x", response.bitfieldValue);
 *             break;
 *         case OBDIIResponseTypeNumericValue:
 *             printf("%.2f", response.numericValue);
 *             break;
 *         case OBDIIResponseTypeStringValue:
 *             printf("%s", response.stringValue);
 *             break;
 *         case OBDIIResponseTypeOther:
 *             if (response.command == OBDIICommands.DTCs) {
 *                 int i;
 *                 for (i = 0; i < response.DTCs.numTroubleCodes; ++i) {
 *                     printf("%s, ", response.DTCs.troubleCodes[i]);
 *                 }
 *             }
 *             
 *             // Handle oxygen sensor commands
 *             break;
 *    }
 *
 * Make sure to call `OBDIIResponseFree` when you are done with a given response object to prevent a memory leak.
 */
typedef struct OBDIIResponse {
	int success;
	struct OBDIICommand *command;

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

typedef enum OBDIIResponseType {
	OBDIIResponseTypeBitfield,
	OBDIIResponseTypeNumeric,
	OBDIIResponseTypeString,
	OBDIIResponseTypeOther
} OBDIIResponseType;

/** Type for a function that can decode the raw response payload for a particular command.
 * 
 * \param response A pointer to the `OBDIIResponse` object which should be filled with the decoded value
 * \param responsePayload The raw response bytes to be decoded
 * \param responseLen The size of the `responsePayload` buffer
 */
typedef void (*OBDIIResponseDecoder)(OBDIIResponse *response, unsigned char *responsePayload, int responseLen);

/** Represents an OBDII command (request for diagnostic data).
 *
 * You don't create instances of this type yourself. Rather, the list of commands is predefined, with each command
 * represented by a property on the `OBDIICommands` global variable. For example, `OBDIICommands.engineRPMs` is a pointer to the
 * unique command instance for requesting the engine RPMs. The commands are also accessible via the `OBDIIMode1Commands`
 * and `OBDIIMode9Commands` global variables, which are indexed by the command's PID. For example,
 *
 *     // The engine RPMs command has PID 0x0c, so the following prints `1`
 *     printf("%i", OBDIICommands.engineRPMs == OBDIIMode1Commands[0x0c]);
 */
typedef struct OBDIICommand {
	/** A human-readable description of the command. */
	char *name;
	/** The raw request payload, which for all commands is simply a (mode, PID) tuple. */
	unsigned char payload[2];
	/** The type of data contained in the response for this command. */
	OBDIIResponseType responseType;	
	/** The expected length of a payload containing the raw response to this command. Equal to `VARIABLE_RESPONSE_LENGTH`
	 * for commands whose response payloads have variable length. */
	short expectedResponseLength;
	/** A pointer to a function that can decode a raw response payload for this command. */
	OBDIIResponseDecoder responseDecoder;
} OBDIICommand;

/** Helper macros that return the mode/PID for a given command */
#define OBDIICommandGetMode(command) (command)->payload[0]
#define OBDIICommandGetPID(command) (command)->payload[1]

/** Represents a dynamic collection of commands.
 *
 * The OBDII standard specifies a large number of diagnostic commands, but a particular vehicle will likely only support a subset.
 * The `OBDIIGetSupportedCommands` function can be used to query a vehicle for the set of commands it supports. For example,
 *
 *     OBDIICommandSet commands = OBDIIGetSupportedCommands(s);
 *     int i;
 *     for (i = 0; i < supportedCommands.numCommands; ++i) {
 *         OBDIICommand *command = supportedCommands.commands[i];
 *         printf("%i: mode %02x, PID %02x: %s\n", i, OBDIICommandGetMode(command), OBDIICommandGetPID(command), command->name);
 *     }
 *     OBDIICommandSetFree(&commands);
 */
typedef struct OBDIICommandSet {
	// Private
	struct {
		uint32_t _1_to_20;
		uint32_t _21_to_40;
		uint32_t _41_to_60;
		uint32_t _61_to_80;
	} _mode1SupportedPIDs;

	uint32_t _mode9SupportedPIDs;

	int numCommands; /** The number of commands in this command set */
	OBDIICommand **commands; /** The array of commands */
} OBDIICommandSet;

struct OBDIICommands {
	// Mode 1
	OBDIICommand *mode1SupportedPIDs_1_to_20;	// bitfield
	OBDIICommand *monitorStatus;			// bitfield
	OBDIICommand *freezeDTC;			// other
	OBDIICommand *fuelSystemStatus;			// bitfield
	OBDIICommand *calculatedEngineLoad;		// numeric
	OBDIICommand *engineCoolantTemperature;		// numeric
	OBDIICommand *bank1ShortTermFuelTrim;		// numeric
	OBDIICommand *bank1LongTermFueldTrim;		// numeric
	OBDIICommand *bank2ShortTermFuelTrim; 		// numeric
	OBDIICommand *bank2LongTermFuelTrim; 		// numeric
	OBDIICommand *fuelPressure; 			// numeric
	OBDIICommand *intakeManifoldAbsolutePressure; 	// numeric
	OBDIICommand *engineRPMs;			// numeric
	OBDIICommand *vehicleSpeed;			// numeric
	OBDIICommand *timingAdvance;			// numeric
	OBDIICommand *intakeAirTemperature;		// numeric
	OBDIICommand *mafAirFlowRate;			// numeric
	OBDIICommand *throttlePosition;			// numeric
	OBDIICommand *commandedSecondaryAirStatus;	// bitfield
	OBDIICommand *oxygenSensorsPresentIn2Banks;	// bitfield
	OBDIICommand *oxygenSensor1_fuelTrim;		// other
	OBDIICommand *oxygenSensor2_fuelTrim;		// other
	OBDIICommand *oxygenSensor3_fuelTrim;		// other
	OBDIICommand *oxygenSensor4_fuelTrim;		// other
	OBDIICommand *oxygenSensor5_fuelTrim;		// other
	OBDIICommand *oxygenSensor6_fuelTrim;		// other
	OBDIICommand *oxygenSensor7_fuelTrim;		// other
	OBDIICommand *oxygenSensor8_fuelTrim;		// other
	OBDIICommand *conformingStandards;		// bitfield
	OBDIICommand *oxygenSensorsPresentIn4Banks;	// bitfield
	OBDIICommand *auxiliaryInputStatus;		// bitfield
	OBDIICommand *runtimeSinceEngineStart;		// numeric
	OBDIICommand *mode1SupportedPIDs_21_to_40;	// bitfield
	OBDIICommand *distanceTraveledWithMalfunctionIndicatorLampOn;	// numeric
	OBDIICommand *fuelRailPressure;			// numeric
	OBDIICommand *fuelRailGaugePressure; 		// numeric
	OBDIICommand *oxygenSensor1_fuelAirRatioVoltage;// other
	OBDIICommand *oxygenSensor2_fuelAirRatioVoltage;// other
	OBDIICommand *oxygenSensor3_fuelAirRatioVoltage;// other
	OBDIICommand *oxygenSensor4_fuelAirRatioVoltage;// other
	OBDIICommand *oxygenSensor5_fuelAirRatioVoltage;// other
	OBDIICommand *oxygenSensor6_fuelAirRatioVoltage;// other
	OBDIICommand *oxygenSensor7_fuelAirRatioVoltage;// other
	OBDIICommand *oxygenSensor8_fuelAirRatioVoltage;// other
	OBDIICommand *commandedEGR;			// numeric
	OBDIICommand *egrError;				// numeric
	OBDIICommand *commandedEvaporativePurge; 	// numeric
	OBDIICommand *fuelTankLevelInput;		// numeric
	OBDIICommand *warmUpsSinceCodesCleared;		// numeric
	OBDIICommand *distanceTraveledSinceCodesCleared;// numeric
	OBDIICommand *evaporativeSystemVaporPressure; 	// numeric
	OBDIICommand *absoluteBarometricPressure; 	// numeric
	OBDIICommand *oxygenSensor1_fuelAirRatioCurrent;// other
	OBDIICommand *oxygenSensor2_fuelAirRatioCurrent;// other
	OBDIICommand *oxygenSensor3_fuelAirRatioCurrent;// other
	OBDIICommand *oxygenSensor4_fuelAirRatioCurrent;// other
	OBDIICommand *oxygenSensor5_fuelAirRatioCurrent;// other
	OBDIICommand *oxygenSensor6_fuelAirRatioCurrent;// other
	OBDIICommand *oxygenSensor7_fuelAirRatioCurrent;// other
	OBDIICommand *oxygenSensor8_fuelAirRatioCurrent;// other
	OBDIICommand *catalystTemperatureBank1Sensor1; 	// numeric
	OBDIICommand *catalystTemperatureBank2Sensor1;	// numeric
	OBDIICommand *catalystTemperatureBank1Sensor2;	// numeric
	OBDIICommand *catalystTemperatureBank2Sensor2;	// numeric
	OBDIICommand *mode1SupportedPIDs_41_to_60;	// bitfield
	OBDIICommand *currentDriveCycleMonitorStatus;	// bitfield
	OBDIICommand *controlModuleVoltage;		// numeric
	OBDIICommand *absoluteLoadValue;		// numeric
	OBDIICommand *fuelAirCommandEquivalenceRatio;	// numeric
	OBDIICommand *relativeThrottlePosition;		// numeric
	OBDIICommand *ambientAirTemperature;		// numeric
	OBDIICommand *absoluteThrottlePositionB;	// numeric
	OBDIICommand *absoluteThrottlePositionC;	// numeric
	OBDIICommand *acceleratorPedalPositionD;	// numeric
	OBDIICommand *acceleratorPedalPositionE;	// numeric
	OBDIICommand *acceleratorPedalPositionF;	// numeric
	OBDIICommand *commandedThrottleActuator;	// numeric
	OBDIICommand *timeRunWithMalfunctionIndicatorLampOn;	// numeric
	OBDIICommand *timeSinceTroubleCodesCleared;	// numeric
	/*OBDIICommand *mode1SupportedPIDs_61_to_80;*/
	
	// Mode 3
	OBDIICommand *DTCs;				// other

	// Mode 9
	OBDIICommand *mode9SupportedPIDs;		// bitfield
	OBDIICommand *vinMessageCount;			// numeric
	OBDIICommand *VIN;				// string
	OBDIICommand *ECUName;
};

/** Global variable used to obtain a reference to a particular command, e.g. `OBDIICommands.vehicleSpeed` */
extern struct OBDIICommands OBDIICommands;
/** Global variable used to obtain a reference to a mode 1 command by PID, e.g. `OBDIIMode1Commands[0x1F]` (same as OBDIICommands.runtimeSinceEngineStart) */
extern OBDIICommand OBDIIMode1Commands[79];
/** Global variable used to obtain a reference to a mode 9 command by PID, e.g. `OBDIIMode9Commands[0x02]` (same as OBDIICommands.VIN) */
extern OBDIICommand OBDIIMode9Commands[3];

/** Decode the raw response payload for a given command.
 *
 * \param command The command for which the response payload was generated
 * \param responsePayload The raw response payload to be decoded
 * \param len The length of `responsePayload`
 *
 * \returns An `OBDIIResponse` object containing the decoded diagnostic data. Make sure to call `OBDIIResponseFree` when you are done with the response.
 */
OBDIIResponse OBDIIDecodeResponseForCommand(OBDIICommand *command, unsigned char *responsePayload, int len);

/** Free any resources allocated to this response object.
 * \param response A pointer to the response object whose resources should be freed.
 */
void OBDIIResponseFree(OBDIIResponse *response);

/** Checks if a given command is present within a command set.
 *
 * \param commandSet The collection of commands
 * \param command The command whose presence in `commandSet` should be determined.
 *
 * \returns 1 if the command is present in the set, 0 otherwise
 */
int OBDIICommandSetContainsCommand(OBDIICommandSet *commandSet, OBDIICommand *command);

/** Free any resources allocated to this command set.
 *
 * \param commandSet A pointer to the command set whose resources should be freed.
 */
void OBDIICommandSetFree(OBDIICommandSet *commandSet);

#endif /* OBDII.h */

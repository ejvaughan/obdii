#include "OBDII.h"
#include "unity.h"
#include "unity_fixture.h"

#define SUCCESSFUL_RESPONSE_PREFIX(command) (command)->payload[0] + 0x40, (command)->payload[1]

static void TestBitfield(OBDIICommand *command) {
	unsigned int bitfieldLength = command->expectedResponseLength - 2;
	unsigned char exampleResponsePayload[] = { SUCCESSFUL_RESPONSE_PREFIX(command), 0xA, 0xB, 0xC, 0xD };

	OBDIIResponse response = OBDIIDecodeResponseForCommand(command, exampleResponsePayload, command->expectedResponseLength);

	TEST_ASSERT(response.success);

	if (bitfieldLength == 1) {
		TEST_ASSERT_EQUAL_HEX8(0x0A, response.bitfieldValue);
	} else if (bitfieldLength == 2) {
		TEST_ASSERT_EQUAL_HEX16(0x0A0B, response.bitfieldValue);
	} else if (bitfieldLength == 4) {
		TEST_ASSERT_EQUAL_HEX32(0x0A0B0C0D, response.bitfieldValue);
	}

	OBDIIResponseFree(&response);
}

TEST_GROUP(OBDII);

TEST_SETUP(OBDII)
{
}

TEST_TEAR_DOWN(OBDII)
{
}

TEST(OBDII, DecodeDTCs)
{
	OBDIICommand *command = OBDIICommands.DTCs;

	// Encodes trouble codes P38AB, U20FC, and C17DE (no idea if real trouble codes)
	unsigned char exampleResponsePayload[] = {  SUCCESSFUL_RESPONSE_PREFIX(command), 0x38, 0xAB, 0xE0, 0xFC, 0x57, 0xDE };

	OBDIIResponse response = OBDIIDecodeResponseForCommand(command, exampleResponsePayload, sizeof(exampleResponsePayload));

	TEST_ASSERT(response.success);

	TEST_ASSERT_EQUAL(3, response.DTCs.numTroubleCodes);
	TEST_ASSERT_EQUAL_STRING("P38AB", response.DTCs.troubleCodes[0]);
	TEST_ASSERT_EQUAL_STRING("U20FC", response.DTCs.troubleCodes[1]);
	TEST_ASSERT_EQUAL_STRING("C17DE", response.DTCs.troubleCodes[2]);

	OBDIIResponseFree(&response);
}

TEST(OBDII, mode1SupportedPIDs_1_to_20)
{
	TestBitfield(OBDIICommands.mode1SupportedPIDs_1_to_20);
}

TEST(OBDII, monitorStatus)
{
	TestBitfield(OBDIICommands.monitorStatus);
}

TEST(OBDII, fuelSystemStatus)
{
	TestBitfield(OBDIICommands.fuelSystemStatus);
}

TEST(OBDII, commandedSecondaryAirStatus)
{
	TestBitfield(OBDIICommands.commandedSecondaryAirStatus);
}

TEST(OBDII, oxygenSensorsPresentIn2Banks)
{
	TestBitfield(OBDIICommands.oxygenSensorsPresentIn2Banks);
}

TEST(OBDII, conformingStandards)
{
	TestBitfield(OBDIICommands.conformingStandards);
}

TEST(OBDII, oxygenSensorsPresentIn4Banks)
{
	TestBitfield(OBDIICommands.oxygenSensorsPresentIn4Banks);
}

TEST(OBDII, auxiliaryInputStatus)
{
	TestBitfield(OBDIICommands.auxiliaryInputStatus);
}

TEST(OBDII, mode1SupportedPIDs_21_to_40)
{
	TestBitfield(OBDIICommands.mode1SupportedPIDs_21_to_40);
}

TEST(OBDII, mode1SupportedPIDs_41_to_60)
{
	TestBitfield(OBDIICommands.mode1SupportedPIDs_41_to_60);
}

TEST(OBDII, currentDriveCycleMonitorStatus)
{
	TestBitfield(OBDIICommands.currentDriveCycleMonitorStatus);
}

TEST(OBDII, mode9SupportedPIDs)
{
	TestBitfield(OBDIICommands.mode9SupportedPIDs);
}

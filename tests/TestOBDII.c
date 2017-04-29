#include "OBDII.h"
#include "unity.h"
#include "unity_fixture.h"

TEST_GROUP(OBDII);

TEST_SETUP(OBDII)
{
}

TEST_TEAR_DOWN(OBDII)
{
}

#define SUCCESSFUL_RESPONSE_PREFIX(command) (command)->payload[0] + 0x40, (command)->payload[1]

TEST(OBDII, DecodeDTCs)
{
	// Encodes trouble codes P38AB, U20FC, and C17DE (no idea if real trouble codes)
	unsigned char exampleResponsePayload[] = {  SUCCESSFUL_RESPONSE_PREFIX(OBDIICommands.DTCs), 0x38, 0xAB, 0xE0, 0xFC, 0x57, 0xDE };

	OBDIIResponse response = OBDIIDecodeResponseForCommand(OBDIICommands.DTCs, exampleResponsePayload, sizeof(exampleResponsePayload));

	TEST_ASSERT(response.success);

	TEST_ASSERT_EQUAL(3, response.DTCs.numTroubleCodes);
	TEST_ASSERT_EQUAL_STRING("P38AB", response.DTCs.troubleCodes[0]);
	TEST_ASSERT_EQUAL_STRING("U20FC", response.DTCs.troubleCodes[1]);
	TEST_ASSERT_EQUAL_STRING("C17DE", response.DTCs.troubleCodes[2]);
}


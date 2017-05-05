#include "unity.h"
#include "unity_fixture.h"

TEST_GROUP_RUNNER(OBDII)
{
	RUN_TEST_CASE(OBDII, DecodeDTCs);
	RUN_TEST_CASE(OBDII, mode1SupportedPIDs_1_to_20);
	RUN_TEST_CASE(OBDII, monitorStatus);
	RUN_TEST_CASE(OBDII, fuelSystemStatus);
	RUN_TEST_CASE(OBDII, commandedSecondaryAirStatus);
	RUN_TEST_CASE(OBDII, oxygenSensorsPresentIn2Banks);
	RUN_TEST_CASE(OBDII, conformingStandards);
	RUN_TEST_CASE(OBDII, oxygenSensorsPresentIn4Banks);
	RUN_TEST_CASE(OBDII, auxiliaryInputStatus);
	RUN_TEST_CASE(OBDII, mode1SupportedPIDs_21_to_40);
	RUN_TEST_CASE(OBDII, mode1SupportedPIDs_41_to_60);
	RUN_TEST_CASE(OBDII, currentDriveCycleMonitorStatus);
	RUN_TEST_CASE(OBDII, mode9SupportedPIDs);
}

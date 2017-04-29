#include "unity.h"
#include "unity_fixture.h"

TEST_GROUP_RUNNER(OBDII)
{
	RUN_TEST_CASE(OBDII, DecodeDTCs);
}

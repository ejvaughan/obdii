#include "OBDII.h"

OBDIICommandsT OBDIICommands = {
	{ "Supported PIDs in the range 01 - 20", { 0x01, 0x00 } },
	{ "Monitor status since DTCs cleared", { 0x01, 0x01 } },
	{ "Freeze DTC", { 0x01, 0x02 } },
	{ "Fuel system status", { 0x01, 0x03 } },
	{ "Calculated engine load", { 0x01, 0x04 } },
	{ "Engine coolant temperature", { 0x01, 0x05 } },
	{ "Short term fuel trim—Bank 1", { 0x01, 0x06} },
	{ "Long term fuel trim—Bank 1", { 0x01, 0x07 } },
	{ "Short term fuel trim—Bank 2", { 0x01, 0x08} },
	{ "Long term fuel trim—Bank 2", { 0x01, 0x09 } },
	{ "Fuel pressure (gauge pressure)", { 0x01, 0x0A } },
	{ "Intake manifold absolute pressure", { 0x01, 0x0B } },
	{ "Engine RPM", { 0x01, 0x0C } },
	{ "Vehicle speed", { 0x01, 0x0D } },
	{ "Timing advance", { 0x01, 0x0E } },
	{ "Intake air temperature", { 0x01, 0x0F } }
};
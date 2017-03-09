#ifndef __OBDII_COMMUNICATION_H
#define __OBDII_COMMUNICATION_H

#include "OBDII.h"

OBDIIResponse OBDIIPerformQuery(int socket, OBDIICommand *command);

OBDIICommandSet OBDIIGetSupportedCommands(int socket);

#endif /* OBDIICommunication.h */

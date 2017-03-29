#ifndef __OBDII_COMMUNICATION_H
#define __OBDII_COMMUNICATION_H

#include "OBDII.h"
#include <linux/can.h>

int OBDIIOpenSocket(const char *ifname, canid_t tx_id, canid_t rx_id);
void OBDIICloseSocket(int s);

OBDIIResponse OBDIIPerformQuery(int socket, OBDIICommand *command);

OBDIICommandSet OBDIIGetSupportedCommands(int socket);

#endif /* OBDIICommunication.h */

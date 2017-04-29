#ifndef __OBDII_COMMUNICATION_H
#define __OBDII_COMMUNICATION_H

#include "OBDII.h"
#include <linux/can.h>

/** Open a communication channel to a particular ECU.
 *
 * This function binds a CAN socket to a network interface, in order to communicate with a particular ECU.
 * The returned socket uses the ISOTP transport protocol (CAN_ISOTP defined in <linux/can.h>). The ISOTP protocol is implemented
 * in a third-party kernel module that must be installed on the system. The module's source is available at https://github.com/hartkopp/can-isotp-modules,
 * which contains instructions for building and installing it.
 *
 * The ECU is identified by a (transfer ID, receive ID) tuple. The transfer ID is the ID that the ECU listens to on the CAN network.
 * The receive ID is the ID the ECU uses to respond. For vehicles that use 11-bit identifiers, ECUs have a transfer ID in the range 0x7E0 to 0x7E7,
 * and they respond with an ID in the range 0x7E8 to 0x7EF (0x08 more than their transfer ID).
 *
 *     int s = OBDIIOpenSocket("can0", 0x7E0, 0x7E8); // Talk to the engine ECU
 *     if (s < 0) {
 *         printf("Error opening socket: %s\n", strerror(errno));
 *     }
 *
 * \param ifname The name of the CAN interface that the socket will be bound to
 * \param tx_id The ID used to address frames to the ECU
 * \param rx_id The ID the ECU will use for response frames
 *
 * \returns An open CAN ISOTP socket for communicating with the vehicle
 */
int OBDIIOpenSocket(const char *ifname, canid_t tx_id, canid_t rx_id);

/** Close an open socket created with `OBDIIOpenSocket` */
void OBDIICloseSocket(int s);

/** Query the car for a particular command and return the response.
 *
 * This is the main API that clients will interact with. It writes the command's request payload into the socket
 * and reads the response payload, decoding it as an `OBDIIResponse` object.
 *
 *     OBDIIResponse response = OBDIIPerformQuery(s, OBDIICommands.engineRPMs);
 *     if (response.success) {
 *         printf("%.2f", response.numericValue);
 *     } else {
 *         // Handle error
 *     }
 *     OBDIIResponseFree(&response);
 *
 * \param s The socket used to communicate with the vehicle
 * \param command The command to query the vehicle for
 *
 * \returns An `OBDIIResponse` object containing the decoded diagnostic data
 */
OBDIIResponse OBDIIPerformQuery(int socket, OBDIICommand *command);

/** Queries the car for the commands it supports.
 *
 *     OBDIICommandSet commands = OBDIIGetSupportedCommands(s);
 *     if (OBDIICommandSetContainsCommand(&commands, OBDIICommands.engineRPMs)) {
 *         // Query the vehicle
 *     }
 *     OBDIICommandSetFree(&commands);
 */
OBDIICommandSet OBDIIGetSupportedCommands(int socket);

#endif /* OBDIICommunication.h */

#ifndef __OBDII_COMMUNICATION_H
#define __OBDII_COMMUNICATION_H

#include "OBDII.h"
#include <linux/can.h>

#ifdef __cplusplus
extern "C" {
#endif

/** Opaque structure representing an OBDII socket */
typedef struct {
	int s;
	short shared;
	unsigned int ifindex;
	canid_t tid;
	canid_t rid;
} OBDIISocket;

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
 *     OBDIISocket s;
 *     if (OBDIIOpenSocket(&s, "can0", 0x7E0, 0x7E8, 1) < 0) { // Talk to the engine ECU
 *         printf("Error opening socket: %s\n", strerror(errno));
 *     }
 *
 * \param s The `OBDIISocket` struct that will be filled in by the call
 * \param ifname The name of the CAN interface that the socket will be bound to
 * \param tx_id The ID used to address frames to the ECU
 * \param rx_id The ID the ECU will use for response frames
 * \param shared If `1`, the socket will be opened by the OBDII daemon instead of by the calling process. This allows multiple processes to share the same OBDII socket, as only a single process can bind to a particular (interface, transfer ID, receive ID) tuple. If `0`, the calling process will bind the socket, which may fail if another process has already bound a socket for the given parameters.
 *
 * \returns 0 on success, -1 on error
 */
int OBDIIOpenSocket(OBDIISocket *s, const char *ifname, canid_t tx_id, canid_t rx_id, int shared);

/** Close an open socket created with `OBDIIOpenSocket`
 *
 * \param s The socket structure filled in by a call to `OBDIIOpenSocket`
 * 
 * \returns 0 on success, -1 on error
 */
int OBDIICloseSocket(OBDIISocket *s);

/** Query the car for a particular command and return the response.
 *
 * This is the main API that clients will interact with. It writes the command's request payload into the socket
 * and reads the response payload, decoding it as an `OBDIIResponse` object.
 *
 *     OBDIIResponse response = OBDIIPerformQuery(&s, OBDIICommands.engineRPMs);
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
OBDIIResponse OBDIIPerformQuery(OBDIISocket *s, OBDIICommand *command);

/** Queries the car for the commands it supports.
 *
 *     OBDIICommandSet commands = OBDIIGetSupportedCommands(&s);
 *     if (OBDIICommandSetContainsCommand(&commands, OBDIICommands.engineRPMs)) {
 *         // Query the vehicle
 *     }
 *     OBDIICommandSetFree(&commands);
 */
OBDIICommandSet OBDIIGetSupportedCommands(OBDIISocket *s);

#ifdef __cplusplus
}
#endif

#endif /* OBDIICommunication.h */

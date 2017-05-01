#include "OBDIICommunication.h"
#include "OBDIIDaemon.h"
#include <stdlib.h>
#include <sys/select.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/types.h>
#include <net/if.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>
#include <errno.h>
#include <sys/file.h>

#define MAX_ISOTP_PAYLOAD 4095

// Used for communicating with the daemon
static int daemonSocket = -1;

static inline void pack(unsigned char **buffer, void *data, int len) {
	if (!buffer) {
		return;
	}

	memcpy(*buffer, data, len);
	*buffer += len;
}

static int setupDaemonCommunication() {
	if (daemonSocket != -1) {
		return 0;
	}	

	struct sockaddr_un daemonAddr, selfAddr;
	if ((daemonSocket = socket(AF_UNIX, SOCK_DGRAM, 0)) < 0) {
		goto err;
	}

	memset(&selfAddr, 0, sizeof(struct sockaddr_un));
	selfAddr.sun_family = AF_UNIX;
	snprintf(selfAddr.sun_path, sizeof(selfAddr.sun_path), "/tmp/obdii.%ld", (long)getpid());

	if (unlink(selfAddr.sun_path) < 0 && errno != ENOENT) {
		goto err;
	}

	if (bind(daemonSocket, (struct sockaddr *)&selfAddr, sizeof(struct sockaddr_un)) < 0) {
		goto err;
	}

	memset(&daemonAddr, 0, sizeof(struct sockaddr_un));
	daemonAddr.sun_family = AF_UNIX;
	strncpy(daemonAddr.sun_path, OBDII_DAEMON_SOCKET_PATH, sizeof(daemonAddr.sun_path) - 1);

	// Even though this is a connection-less socket, by using connect we can use send and recv calls instead of sendto/recvfrom
	if (connect(daemonSocket, (struct sockaddr *)&daemonAddr, sizeof(struct sockaddr_un)) < 0) {
		goto err;
	}

	return 0;

err:
	daemonSocket = -1;
	return -1;
}

int receiveFD(int s, int *fd)
{
	if (!s) {
		return 0;
	}

	struct msghdr msg = {0};
	struct cmsghdr *cmsg;
	
	char buf[CMSG_SPACE(sizeof(int))];

	msg.msg_control = buf;
	msg.msg_controllen = sizeof(buf);

	if (recvmsg(s, &msg, 0) < 0) {
		return -1;
	}

	cmsg = CMSG_FIRSTHDR(&msg);

	*fd = *(int *)CMSG_DATA(cmsg);

	return 0;
}

int requestRemoteSocket(OBDIISocket *obdiiSocket, int shouldOpen) {
	if (setupDaemonCommunication() < 0) {
		return -1;
	}

	// Send a request to the daemon to open/close a socket on our behalf
	uint16_t apiVersion = OBDII_API_VERSION;
	uint16_t requestType = (shouldOpen) ? OBDIIDaemonRequestOpenSocket : OBDIIDaemonRequestCloseSocket;

	// Marshal the request parameters
	unsigned char request[16];
	unsigned char *p = request;

	pack(&p, &apiVersion, sizeof(apiVersion));
	pack(&p, &requestType, sizeof(requestType));
	pack(&p, &obdiiSocket->ifindex, sizeof(obdiiSocket->ifindex));
	pack(&p, &obdiiSocket->tid, sizeof(obdiiSocket->tid));
	pack(&p, &obdiiSocket->rid, sizeof(obdiiSocket->rid));

	// Send the request
	if (send(daemonSocket, request, sizeof(request), 0) != sizeof(request)) {
		return -1;
	}

	// Receive the response
	uint16_t responseCode;
	if (recv(daemonSocket, &responseCode, sizeof(responseCode), 0) != sizeof(responseCode)) {
		return -1;
	}

	if (responseCode != OBDIIDaemonResponseCodeSuccess) {
		return -1;
	}

	if (shouldOpen) {
		// Receive the socket
		if (receiveFD(daemonSocket, &obdiiSocket->s) < 0) {
			return -1;
		}
	}

	return 0;
}

int OBDIIOpenSocket(OBDIISocket *obdiiSocket, const char *ifname, canid_t tx_id, canid_t rx_id, int shared)
{
	unsigned int ifindex = if_nametoindex(ifname);

	if (ifindex == 0) {
		return -1;
	}

	obdiiSocket->ifindex = ifindex;
	obdiiSocket->tid = tx_id;
	obdiiSocket->rid = rx_id;
	obdiiSocket->shared = shared;

	if (shared) {
		return requestRemoteSocket(obdiiSocket, 1);
	} else {
		struct sockaddr_can addr;
		addr.can_addr.tp.tx_id = tx_id;
		addr.can_addr.tp.rx_id = rx_id;
		addr.can_family = AF_CAN;
		addr.can_ifindex = ifindex;

		if ((obdiiSocket->s = socket(PF_CAN, SOCK_DGRAM, CAN_ISOTP)) < 0) {
			return -1;
		}

		if (bind(obdiiSocket->s, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
			close(obdiiSocket->s);
			return -1;
		}

		obdiiSocket->shared = 0;
	}

	return 0;
}

int OBDIICloseSocket(OBDIISocket *s)
{
	if (!s) {
		return 0;
	}

	if (s->shared) {
		return requestRemoteSocket(s, 0);
	} else {
		return close(s->s);
	}
}

// Counts # bits set in the argument
// Code from Kernighan
static inline unsigned int _BitsSet(unsigned int word)
{
	unsigned int c; // c accumulates the total bits set in v
	for (c = 0; word; c++)
	{
	  word &= word - 1; // clear the least significant bit set
	}
	return c;
}

OBDIICommandSet OBDIIGetSupportedCommands(OBDIISocket *socket)
{
	OBDIICommandSet supportedCommands = { 0 };
	unsigned int numCommands;

	// Mode 1
	OBDIIResponse response = OBDIIPerformQuery(socket, OBDIICommands.mode1SupportedPIDs_1_to_20);

	supportedCommands._mode1SupportedPIDs._1_to_20 = response.bitfieldValue;

	// If PID 0x20 is supported, we can query the next set of PIDs
	if (!(response.bitfieldValue & 0x01)) {
		goto mode9;
	}

	response = OBDIIPerformQuery(socket, OBDIICommands.mode1SupportedPIDs_21_to_40);

	supportedCommands._mode1SupportedPIDs._21_to_40 = response.bitfieldValue;

	// If PID 0x40 is supported, we can query the next set of PIDs
	if (!(response.bitfieldValue & 0x01)) {
		goto mode9;
	}

	response = OBDIIPerformQuery(socket, OBDIICommands.mode1SupportedPIDs_41_to_60);

	// Mask out the rest of the PIDs, because they're not yet implemented
	response.bitfieldValue &= 0xFFFC0000;

	supportedCommands._mode1SupportedPIDs._41_to_60 = response.bitfieldValue;

	//// If PID 0x60 is supported, we can query the next set of commands
	//if (!(response.bitfieldValue & 0x01)) {
	//	goto mode9;
	//}

	//response = OBDIIPerformQuery(socket, OBDIICommands.mode1SupportedPIDs_61_to_80);

	//supportedCommands._mode1SupportedPIDs._61_to_80 = response.bitfieldValue;

mode9:
	// Mode 9
	response = OBDIIPerformQuery(socket, OBDIICommands.mode9SupportedPIDs);

	// Mask out the PIDs that are not yet implemented
	response.bitfieldValue &= 0xE0000000;

	supportedCommands._mode9SupportedPIDs = response.bitfieldValue;

exit:
	numCommands = _BitsSet(supportedCommands._mode1SupportedPIDs._1_to_20) + _BitsSet(supportedCommands._mode1SupportedPIDs._21_to_40) + _BitsSet(supportedCommands._mode1SupportedPIDs._41_to_60) + _BitsSet(supportedCommands._mode1SupportedPIDs._61_to_80) + _BitsSet(supportedCommands._mode9SupportedPIDs);

	numCommands += 2; // mode 1, pid 0 and mode 9, pid 0

	numCommands++; // mode 3

	OBDIICommand **commands = malloc(sizeof(OBDIICommand *) * numCommands);
	if (commands != NULL) {
		supportedCommands.commands = commands;
		supportedCommands.numCommands = numCommands;

		// Mode 1
		unsigned int pid;
		for (pid = 0; pid < sizeof(OBDIIMode1Commands) / sizeof(OBDIIMode1Commands[0]); ++pid) {
			OBDIICommand *command = &OBDIIMode1Commands[pid];
			if (OBDIICommandSetContainsCommand(&supportedCommands, command)) {
				*commands = command;
				++commands;
			}
		}

		// Mode 3
		*commands = OBDIICommands.DTCs;
		++commands;

		// Mode 9
		for (pid = 0; pid < sizeof(OBDIIMode9Commands) / sizeof(OBDIIMode9Commands[0]); ++pid) {
			OBDIICommand *command = &OBDIIMode9Commands[pid];
			if (OBDIICommandSetContainsCommand(&supportedCommands, command)) {
				*commands = command;
				++commands;
			}
		}
	}

	return supportedCommands;
}

void OBDIICommandSetFree(OBDIICommandSet *commandSet) {
	if (commandSet && commandSet->commands) {
		free(commandSet->commands);
	}
}

static int inline LockIfNecessary(OBDIISocket *socket) {
	if (!socket) {
		return 0;
	}

	if (socket->shared) {
		// This socket is shared by multiple processes, so acquire a lock
		return flock(socket->s, LOCK_EX);
	}

	return 0;
}

static int inline UnlockIfNecessary(OBDIISocket *socket) {
	if (!socket) {
		return 0;
	}

	if (socket->shared) {
		return flock(socket->s, LOCK_UN);
	}

	return 0;
}

OBDIIResponse OBDIIPerformQuery(OBDIISocket *socket, OBDIICommand *command)
{
	OBDIIResponse response = { 0 };
	response.command = command;

	if (!socket) {
		return response;
	}

	LockIfNecessary(socket);

	// Send the command
	int retval = write(socket->s, command->payload, sizeof(command->payload));
	if (retval < 0 || retval != sizeof(command->payload)) {
		UnlockIfNecessary(socket);
		return response;
	}

	// Set a one second timeout
	struct timeval timeout;
	timeout.tv_sec = 1;
	timeout.tv_usec = 0;

	fd_set readFDs;
	FD_ZERO(&readFDs);
	FD_SET(socket->s, &readFDs);

	if (select(socket->s + 1, &readFDs, NULL, NULL, &timeout) <= 0) {
	    // Either we timed out, or there was an error
	    UnlockIfNecessary(socket);
	    return response;
	}

	// Receive the response
	int responseLength = command->expectedResponseLength == VARIABLE_RESPONSE_LENGTH ? MAX_ISOTP_PAYLOAD : command->expectedResponseLength;
	unsigned char responsePayload[responseLength];
	retval = read(socket->s, responsePayload, responseLength);

	if (retval < 0 || (command->expectedResponseLength != VARIABLE_RESPONSE_LENGTH && retval != command->expectedResponseLength)) {
		UnlockIfNecessary(socket);
		return response;
	}

	UnlockIfNecessary(socket);
	return OBDIIDecodeResponseForCommand(command, responsePayload, retval);
}

#include <sys/types.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <net/if.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <time.h>
#include <unistd.h>
#include <stdarg.h>

#include "ancillary.h"
#include "OBDIIDaemon.h"
#include "OBDIICommunication.h"

typedef struct OBDIISocketConnection {
	unsigned int ifindex;
	canid_t tid;
	canid_t rid;
	int s;
	int refcount;
	
	struct OBDIISocketConnection *prev;
	struct OBDIISocketConnection *next;
} OBDIISocketConnection;

static OBDIISocketConnection *obdiiSockets = NULL;

OBDIISocketConnection *socketConnectionMatchingParams(unsigned int ifindex, canid_t tid, canid_t rid)
{
	// Search the list for a socket matching the passed in parameters
	OBDIISocketConnection *found;
	for (found = obdiiSockets; found != NULL; found = found->next) {
		if (found->tid == tid && found->rid == rid && found->ifindex == ifindex) {
			break;
		}
	}

	return found;
}

OBDIISocketConnection *openSocketConnection(unsigned int ifindex, canid_t tid, canid_t rid)
{
	// Open socket
	int s;
	struct sockaddr_can addr;

	addr.can_addr.tp.tx_id = tid;
	addr.can_addr.tp.rx_id = rid;
	addr.can_family = AF_CAN;
	addr.can_ifindex = ifindex;
	
	if ((s = socket(PF_CAN, SOCK_DGRAM, CAN_ISOTP)) < 0) {
		return NULL;
	}

	if (bind(s, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
		close(s);
		return NULL;
	}
	
	OBDIISocketConnection *conn = (OBDIISocketConnection *)malloc(sizeof(OBDIISocketConnection));
	if (conn) {
		conn->s = s;
		conn->tid = tid;
		conn->rid = rid;
		conn->ifindex = ifindex;
		conn->refcount = 1;
		
		conn->prev = NULL;
		conn->next = obdiiSockets;
		if (obdiiSockets) {
			obdiiSockets->prev = conn;
		}
		obdiiSockets = conn;

		return conn;
	} else {
		close(s);
	}

	return NULL;
}

void closeSocketConnection(OBDIISocketConnection *conn)
{
	if (!conn) {
		return;
	}

	conn->refcount--;

	if (conn->refcount == 0) {
		// Close socket
		close(conn->s);

		OBDIISocketConnection *prev = conn->prev;
		OBDIISocketConnection *next = conn->next;

		if (prev) {
			prev->next = next;
		} else {
			obdiiSockets = next;
		}

		if (next) {
			next->prev = prev;
		}

		free(conn);
	}
}

static FILE *LogFile = NULL;
static const char *LogPath = "/var/log/obdiid/obdiid.log";

// Logging facility
static void Log(const char *format, ...) {
	if (LogFile) {
		time_t t;
		char timestr[26];
		struct tm* tm_info;

		time(&t);
		tm_info = localtime(&t);

		strftime(timestr, 26, "%Y-%m-%d %H:%M:%S", tm_info);
		fprintf(LogFile, "%s ", timestr);
		va_list args;
		va_start(args, format);
		vfprintf(LogFile, format, args);
		va_end(args);

		fprintf(LogFile, "\n");
		fflush(LogFile);
	}
}

static void dump(char *dest, char *src, unsigned int len)
{
	unsigned int i;
	for (i = 0; i < len; ++i, dest += 2) {
		sprintf(dest, "%02x", src[i]);
	}
}

int sendResponseCode(int s, struct sockaddr_un *caddr, socklen_t caddrlen, OBDIIDaemonResponseCode responseCode) {
	if (sendto(s, &responseCode, sizeof(uint16_t), 0, (struct sockaddr *)&caddr, caddrlen) < 0) {
		Log("Error sending response code %i to client: %s", responseCode, strerror(errno));
		return -1;
	}

	return 0;
}

#define asuint32(buf) ((buf)[0] | ((buf)[1] << 8) | ((buf)[2] << 16) | ((buf)[3] << 24))

void handleSocketRequest(int s, struct sockaddr_un *caddr, socklen_t caddrlen, unsigned char *request, ssize_t requestLen, int shouldOpen)
{
	unsigned int ifindex;
	canid_t tid;
	canid_t rid;

	if (requestLen < 12) {
		Log("handleSocketRequest: Request payload insufficient size");
		return;
	}

	// Unmarshall request parameters
	ifindex = asuint32(request);
	tid = asuint32(&request[4]);
	rid = asuint32(&request[8]);

	Log("Received request to %s socket: (%i, %x, %x)", (shouldOpen) ? "open" : "close", ifindex, tid, rid);

	OBDIISocketConnection *found = socketConnectionMatchingParams(ifindex, tid, rid);

	if (shouldOpen) {
		if (found) {
			found->refcount++;
		} else if (!(found = openSocketConnection(ifindex, tid, rid))) {
			sendResponseCode(s, caddr, caddrlen, OBDIIDaemonResponseCodeOpenSocketError);
			return;
		}	

		sendResponseCode(s, caddr, caddrlen, OBDIIDaemonResponseCodeSuccess);

		// Send the socket
		if (ancil_send_fd(s, found->s) < 0) {
			Log("Error sending OBDII socket (%i, %x, %x) to client: %s", found->ifindex, found->tid, found->rid, strerror(errno));
		}
	} else {
		if (found) {
			closeSocketConnection(found);
			sendResponseCode(s, caddr, caddrlen, OBDIIDaemonResponseCodeSuccess);
		} else {
			sendResponseCode(s, caddr, caddrlen, OBDIIDaemonResponseCodeNoSuchSocket);
		}
	}
}

// Request dispatcher
static void handleMessage(int s, struct sockaddr_un *caddr, socklen_t caddrlen, unsigned char *request, ssize_t requestLen)
{
	if (requestLen < OBDII_DAEMON_REQUEST_HEADER_SIZE) {
		Log("Ill formed request header; ignoring");
		return;
	}

	uint16_t apiVersion = request[0] | (request[1] << 8);
	uint16_t requestType = request[2] | (request[3] << 8);

	if (apiVersion == 1) {
		unsigned char *payload = request + OBDII_DAEMON_REQUEST_HEADER_SIZE;
		ssize_t payloadLen = requestLen - OBDII_DAEMON_REQUEST_HEADER_SIZE;

		switch (requestType) {
			case OBDIIDaemonRequestOpenSocket:
				handleSocketRequest(s, caddr, caddrlen, payload, payloadLen, 1);
				break;
			case OBDIIDaemonRequestCloseSocket:
				handleSocketRequest(s, caddr, caddrlen, payload, payloadLen, 0);
				break;
			default:
				Log("Received request with unsupported request type: %i", requestType);
				break;
		}
	} else {
		Log("Received request for unsupported version %i; ignoring", apiVersion);
	}
}


int main(int argc, char *argv[])
{
	struct sockaddr_un saddr, caddr;
	socklen_t caddrlen;
	int s;
	ssize_t requestLen;
	unsigned char request[OBDII_DAEMON_REQUEST_MAX_SIZE];
	
	// Open Log file
	LogFile = fopen(LogPath, "a");
	
	s = socket(AF_UNIX, SOCK_DGRAM, 0);
	if (s < 0) {
		Log("Unable to open server socket: %s", strerror(errno));	
		exit(EXIT_FAILURE);
	}			

	// Clean up an already existing socket
	if (unlink(OBDII_DAEMON_SOCKET_PATH) < 0 && errno != ENOENT) {
		Log("Failed to unlink socket at path %s: %s", OBDII_DAEMON_SOCKET_PATH, strerror(errno));
		exit(EXIT_FAILURE);
	}

	// Bind socket to server path
	memset(&saddr, 0, sizeof(struct sockaddr_un));
	saddr.sun_family = AF_UNIX;
	strncpy(saddr.sun_path, OBDII_DAEMON_SOCKET_PATH, sizeof(saddr.sun_path) - 1);

	if (bind(s, (struct sockaddr *)&saddr, sizeof(struct sockaddr_un)) < 0) {
		Log("Error binding socket to path %s: %s", OBDII_DAEMON_SOCKET_PATH, strerror(errno));
		exit(EXIT_FAILURE);
	}

	while (1) {
		caddrlen = sizeof(struct sockaddr_un);
		
		if ((requestLen = recvfrom(s, request, sizeof(request), 0, (struct sockaddr *)&caddr, &caddrlen)) < 0) {
			Log("Error reading request: %s", strerror(errno));
			exit(EXIT_FAILURE);
		}

		char formatted[requestLen * 2 + 1];
		formatted[requestLen * 2]= '\0';
		dump(formatted, request, requestLen);

		Log("Received raw request: %s", formatted);

		handleMessage(s, &caddr, caddrlen, request, requestLen);
	}

	return 0;
}

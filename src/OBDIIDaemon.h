#ifndef __OBDII_DAEMON_H
#define __OBDII_DAEMON_H

typedef enum {
	OBDIIDaemonRequestOpenSocket,
	OBDIIDaemonRequestCloseSocket
} OBDIIDaemonRequestType;

typedef enum {
	OBDIIDaemonResponseCodeSuccess,
	OBDIIDaemonResponseCodeNoSuchSocket,
	OBDIIDaemonResponseCodeOpenSocketError
} OBDIIDaemonResponseCode;
	

#define OBDII_DAEMON_REQUEST_MAX_SIZE 100
#define OBDII_DAEMON_RESPONSE_MAX_SIZE 100
#define OBDII_DAEMON_REQUEST_HEADER_SIZE 4

#define OBDII_DAEMON_SOCKET_PATH "/tmp/obdiid.sock"

#endif /* OBDIIDaemon.h */

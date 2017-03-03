/*
 * A command line utility for reading OBD-II diagnostic data from a
 * vehicle via a CAN socket.
 *
 * This file is based off the file `isotprecv.c` contained in the
 * https://github.com/linux-can/can-utils GitHub repository, as well
 * as `shadow_sample.c` in the Amazon IoT Embedded C SDK.
 * The original copyright notices are reproduced below.
 */

/*
 * isotprecv.c
 *
 * Copyright (c) 2008 Volkswagen Group Electronic Research
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of Volkswagen nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * Alternatively, provided that this notice is retained in full, this
 * software may be distributed under the terms of the GNU General
 * Public License ("GPL") version 2, in which case the provisions of the
 * GPL apply INSTEAD OF those given above.
 *
 * The provided data structures and external interfaces from this code
 * are not restricted to be used by modules with a GPL compatible license.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
 * DAMAGE.
 *
 * Send feedback to <linux-can@vger.kernel.org>
 *
 */

/*
 * Copyright 2010-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <unistd.h>
#include <string.h>
#include <libgen.h>
#include <signal.h>
#include <memory.h>
#include <sys/time.h>
#include <limits.h>
#include <net/if.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/ioctl.h>
#include <linux/can.h>
#include <linux/can/isotp.h>

#include "aws_iot_log.h"
#include "aws_iot_version.h"
#include "aws_iot_shadow_interface.h"
#include "aws_iot_shadow_json_data.h"
#include "aws_iot_config.h"
#include "aws_iot_mqtt_interface.h"

#include "OBDII.h"
#include "OBDIICommunication.h"

#define NO_CAN_ID 0xFFFFFFFFU

void print_usage(char *program_name) {
	printf("Usage: %s -t <transfer CAN ID> -r <receive CAN ID> <CAN interface>\n	<transfer CAN ID>: The CAN ID that will be used for sending the diagnostic requests. For 11-bit identifiers, this can be either the broadcast ID, 0x7DF, or an ID in the range 0x7E0 to 0x7E7, indicating a particular ECU.\n	<receive CAN ID>: The CAN ID that the ECU will be using to respond to the diagnostic requests that are sent. For 11-bit identifiers, this is an ID in the range 0x7E8 to 0x7EF (i.e. <transfer CAN ID> + 8)\n", program_name);
}

void ShadowUpdateStatusCallback(const char *pThingName, ShadowActions_t action, Shadow_Ack_Status_t status,
		const char *pReceivedJsonDocument, void *pContextData) {

	if (status == SHADOW_ACK_TIMEOUT) {
		INFO("Update Timeout--");
	} else if (status == SHADOW_ACK_REJECTED) {
		INFO("Update RejectedXX");
	} else if (status == SHADOW_ACK_ACCEPTED) {
		INFO("Update Accepted !!");
	}
}

char certDirectory[PATH_MAX + 1] = "../linux_mqtt_openssl-latest/certs";
		
char HostAddress[255] = AWS_IOT_MQTT_HOST;
uint32_t port = AWS_IOT_MQTT_PORT;
uint8_t numPubs = 5;
struct sockaddr_can addr;

void parseInputArgsForConnectParams(int argc, char** argv) {
	int opt;

	while (-1 != (opt = getopt(argc, argv, "t:r:h:p:c:n:"))) {
		switch (opt) {
		case 'h':
			strcpy(HostAddress, optarg);
			DEBUG("Host %s", optarg);
			break;
		case 'p':
			port = atoi(optarg);
			DEBUG("arg %s", optarg);
			break;
		case 'c':
			strcpy(certDirectory, optarg);
			DEBUG("cert root directory %s", optarg);
			break;
		case 'n':
			numPubs = atoi(optarg);
			DEBUG("num pubs %s", optarg);
			break;
		case '?':
			if (optopt == 'c') {
				ERROR("Option -%c requires an argument.", optopt);
			} else if (isprint(optopt)) {
				WARN("Unknown option `-%c'.", optopt);
			} else {
				WARN("Unknown option character `\\x%x'.", optopt);
			}
			break;
		case 't':
		    addr.can_addr.tp.tx_id = strtoul(optarg, (char **)NULL, 16);
		    if (strlen(optarg) > 7) {
			    addr.can_addr.tp.tx_id |= CAN_EFF_FLAG;
		    }
		    break;

	    	case 'r':
		    addr.can_addr.tp.rx_id = strtoul(optarg, (char **)NULL, 16);
		    if (strlen(optarg) > 7) {
			    addr.can_addr.tp.rx_id |= CAN_EFF_FLAG;
	            }
		    break;
	    	default:
		    fprintf(stderr, "Unknown option %c\n", opt);
		    print_usage(basename(argv[0]));
		    exit(1);
		    break;
	    }
	}

}

#define MAX_LENGTH_OF_UPDATE_JSON_BUFFER 200

int main(int argc, char** argv) {
	IoT_Error_t rc = NONE_ERROR;

	MQTTClient_t mqttClient;
	aws_iot_mqtt_init(&mqttClient);

	char JsonDocumentBuffer[MAX_LENGTH_OF_UPDATE_JSON_BUFFER];
	size_t sizeOfJsonDocumentBuffer = sizeof(JsonDocumentBuffer) / sizeof(JsonDocumentBuffer[0]);
	float engineRPMs = 0.0;

	jsonStruct_t engineRPMsHandler;
	engineRPMsHandler.cb = NULL;
	engineRPMsHandler.pKey = "engineRPMs";
	engineRPMsHandler.pData = &engineRPMs;
	engineRPMsHandler.type = SHADOW_JSON_FLOAT;

	char rootCA[PATH_MAX + 1];
	char clientCRT[PATH_MAX + 1];
	char clientKey[PATH_MAX + 1];
	char CurrentWD[PATH_MAX + 1];
	char cafileName[] = AWS_IOT_ROOT_CA_FILENAME;
	char clientCRTName[] = AWS_IOT_CERTIFICATE_FILENAME;
	char clientKeyName[] = AWS_IOT_PRIVATE_KEY_FILENAME;

    	addr.can_addr.tp.tx_id = addr.can_addr.tp.rx_id = NO_CAN_ID;

	parseInputArgsForConnectParams(argc, argv);

    	if ((argc - optind != 1) || (addr.can_addr.tp.tx_id == NO_CAN_ID) || (addr.can_addr.tp.rx_id == NO_CAN_ID)) {
	    print_usage(basename(argv[0]));
	    exit(1);
    	}

	getcwd(CurrentWD, sizeof(CurrentWD));
	sprintf(rootCA, "%s/%s/%s", CurrentWD, certDirectory, cafileName);
	sprintf(clientCRT, "%s/%s/%s", CurrentWD, certDirectory, clientCRTName);
	sprintf(clientKey, "%s/%s/%s", CurrentWD, certDirectory, clientKeyName);

	DEBUG("Using rootCA %s", rootCA);
	DEBUG("Using clientCRT %s", clientCRT);
	DEBUG("Using clientKey %s", clientKey);

	// Set up the CAN socket
	int s;
    	if ((s = socket(PF_CAN, SOCK_DGRAM, CAN_ISOTP)) < 0) {
		perror("socket");
		exit(1);
    	}

    	addr.can_family = AF_CAN;
    	addr.can_ifindex = if_nametoindex(argv[optind]);

    	if (bind(s, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
		perror("bind");
		close(s);
		exit(1);
    	}

	// Connect to the shadow service
	ShadowParameters_t sp = ShadowParametersDefault;
	sp.pMyThingName = AWS_IOT_MY_THING_NAME;
	sp.pMqttClientId = AWS_IOT_MQTT_CLIENT_ID;
	sp.pHost = HostAddress;
	sp.port = port;
	sp.pClientCRT = clientCRT;
	sp.pClientKey = clientKey;
	sp.pRootCA = rootCA;

	INFO("Shadow Init");
	rc = aws_iot_shadow_init(&mqttClient);

	INFO("Shadow Connect");
	rc = aws_iot_shadow_connect(&mqttClient, &sp);

	if (NONE_ERROR != rc) {
		ERROR("Shadow Connection Error %d", rc);
	}
	/*
	 * Enable Auto Reconnect functionality. Minimum and Maximum time of Exponential backoff are set in aws_iot_config.h
	 *  #AWS_IOT_MQTT_MIN_RECONNECT_WAIT_INTERVAL
	 *  #AWS_IOT_MQTT_MAX_RECONNECT_WAIT_INTERVAL
	 */
	rc = mqttClient.setAutoReconnectStatus(true);
	if (NONE_ERROR != rc) {
		ERROR("Unable to set Auto Reconnect to true - %d", rc);
		return rc;
	}

	// loop and publish a change in engine RPMs
	while (NETWORK_ATTEMPTING_RECONNECT == rc || RECONNECT_SUCCESSFUL == rc || NONE_ERROR == rc) {
		rc = aws_iot_shadow_yield(&mqttClient, 200);
		if (NETWORK_ATTEMPTING_RECONNECT == rc) {
			sleep(1);
			// If the client is attempting to reconnect we will skip the rest of the loop.
			continue;
		}
		INFO("\n=======================================================================================\n");

		// Get engine RPMs
	    	OBDIIResponse response = OBDIIPerformQuery(s, OBDIICommands.engineRPMs);
		engineRPMs = response.floatValue;

		rc = aws_iot_shadow_init_json_document(JsonDocumentBuffer, sizeOfJsonDocumentBuffer);
		if (rc == NONE_ERROR) {
			rc = aws_iot_shadow_add_reported(JsonDocumentBuffer, sizeOfJsonDocumentBuffer, 1, &engineRPMsHandler);
			if (rc == NONE_ERROR) {
				rc = aws_iot_finalize_json_document(JsonDocumentBuffer, sizeOfJsonDocumentBuffer);
				if (rc == NONE_ERROR) {
					INFO("Update Shadow: %s", JsonDocumentBuffer);
					rc = aws_iot_shadow_update(&mqttClient, AWS_IOT_MY_THING_NAME, JsonDocumentBuffer,
							ShadowUpdateStatusCallback, NULL, 4, true);
				}
			}
		}
		INFO("*****************************************************************************************\n");
		sleep(1);
	}

	if (NONE_ERROR != rc) {
		ERROR("An error occurred in the loop %d", rc);
	}

	INFO("Disconnecting");
	rc = aws_iot_shadow_disconnect(&mqttClient);

	if (NONE_ERROR != rc) {
		ERROR("Disconnect error %d", rc);
	}

	close(s);

	return rc;
}

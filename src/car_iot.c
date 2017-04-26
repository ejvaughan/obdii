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
#include <errno.h>

#include "aws_iot_log.h"
#include "aws_iot_version.h"
#include "aws_iot_shadow_interface.h"
#include "aws_iot_shadow_json_data.h"
#include "aws_iot_config.h"
#include "aws_iot_mqtt_interface.h"

#include "EasyArgs.h"
#include "OBDII.h"
#include "OBDIICommunication.h"

#define MAX_LENGTH_OF_UPDATE_JSON_BUFFER 1000

void PrintUsage(char *program_name) {
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

int main(int argc, char** argv) {
	CommandLineArgTemplate endpointURLOption = CreateArgTemplate("e", "endpoing-url", 1, 1, "AWS endpoint URL");
	CommandLineArgTemplate thingNameOption = CreateArgTemplate("t", "thingname", 1, 1, "AWS thing name");
	CommandLineArgTemplate portOption = CreateArgTemplate("p", "port", 0, 1, "AWS port");
	CommandLineArgTemplate certOption = CreateArgTemplate("c", "cert", 1, 1, "AWS cert file");
	CommandLineArgTemplate privateKeyOption = CreateArgTemplate("k", "privatekey", 1, 1, "AWS private key file");
	CommandLineArgTemplate rootCertOption = CreateArgTemplate("r", "rootcert", 1, 1, "AWS root CA file");
	CommandLineArgTemplate transferIDOption = CreateArgTemplate("tx", "transfer-id", 1, 1, "The CAN ID that will be used for sending the diagnostic requests. For 11-bit identifiers, t      his can be either the broadcast ID, 0x7DF, or an ID in the range 0x7E0 to 0x7E7, indicating a particular ECU.");
	CommandLineArgTemplate receiveIDOption = CreateArgTemplate("rx", "receive-id", 1, 1, "The CAN ID that the ECU will be using to respond to the diagnostic       requests that are sent. For 11-bit identifiers, this is an ID in the range 0x7E8 to 0x7EF (i.e. <transfer CAN ID> + 8)");
	CommandLineArgTemplate configOption = CreateArgTemplate("f", "configFile", 0, 1, "Configuration file");

	CommandLineArgTemplate *argTemplates[] = { &endpointURLOption, &thingNameOption, &portOption, &certOption, &privateKeyOption, &rootCertOption, &transferIDOption, &receiveIDOption, &configOption };

	int nextArgIndex; 
	char *outError;
	if ((nextArgIndex = ParseCommandLineArgs(argc, argv, argTemplates, sizeof(argTemplates)/sizeof(argTemplates[0]), &configOption, "config", &outError)) < 0) {
		printf("Error: %s\n", outError);
		free(outError);
		exit(EXIT_FAILURE);
	}

	if (nextArgIndex != argc - 1) {
		PrintUsage(basename(argv[0]));
		exit(EXIT_FAILURE);

	}

	// Set up the CAN socket
	canid_t tx_id, rx_id;

	tx_id = strtoul(transferIDOption.value, (char **)NULL, 16);
	if (strlen(transferIDOption.value) > 7) {
	        tx_id |= CAN_EFF_FLAG;
	}

	rx_id = strtoul(receiveIDOption.value, (char **)NULL, 16);
	if (strlen(receiveIDOption.value) > 7) {
	        rx_id |= CAN_EFF_FLAG;
	}

	int s;
	if ((s = OBDIIOpenSocket(argv[nextArgIndex], tx_id, rx_id)) < 0) {
		printf("Error communicating with vehicle: %s\n", strerror(errno));
		exit(EXIT_FAILURE);
	}

	// Query the car's supported commands
	OBDIICommandSet supportedCommands = OBDIIGetSupportedCommands(s);

	char JsonDocumentBuffer[MAX_LENGTH_OF_UPDATE_JSON_BUFFER];
	size_t sizeOfJsonDocumentBuffer = sizeof(JsonDocumentBuffer) / sizeof(JsonDocumentBuffer[0]);

	char *certFile = realpath(certOption.value, NULL);
	char *keyFile = realpath(privateKeyOption.value, NULL);
	char *rootCAFile = realpath(rootCertOption.value, NULL);

	DEBUG("Using rootCA %s", rootCAFile);
	DEBUG("Using clientCRT %s", certFile);
	DEBUG("Using clientKey %s", keyFile);

	// Connect to the shadow service
	IoT_Error_t rc = NONE_ERROR;

	MQTTClient_t mqttClient;
	aws_iot_mqtt_init(&mqttClient);

	ShadowParameters_t sp = ShadowParametersDefault;
	sp.pMyThingName = thingNameOption.value;
	sp.pMqttClientId = thingNameOption.value;
	sp.pHost = endpointURLOption.value;
	sp.port = (portOption.present) ? atoi(portOption.value) : 8883;
	sp.pClientCRT = certFile;
	sp.pClientKey = keyFile;
	sp.pRootCA = rootCAFile;

	INFO("Shadow Init");
	rc = aws_iot_shadow_init(&mqttClient);

	INFO("Shadow Connect");
	rc = aws_iot_shadow_connect(&mqttClient, &sp);
	free(certFile);
	free(keyFile);
	free(rootCAFile);

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

	// These are the commands whose values will be uploaded to the shadow state
	struct CommandPreviousValueTuple {
		OBDIICommand *command;
		float value;
	} commandPrevValuesMap[] = {
		{ OBDIICommands.engineRPMs, 0 },
		{ OBDIICommands.vehicleSpeed, 0 },
		{ OBDIICommands.fuelTankLevelInput, 0 },
		{ OBDIICommands.engineCoolantTemperature, 0 },
		{ OBDIICommands.runtimeSinceEngineStart, 0 },
		{ OBDIICommands.acceleratorPedalPositionD, 0 }
	};
	
	while (NETWORK_ATTEMPTING_RECONNECT == rc || RECONNECT_SUCCESSFUL == rc || NONE_ERROR == rc) {

		if ((rc = aws_iot_shadow_yield(&mqttClient, 200)) == NETWORK_ATTEMPTING_RECONNECT) {
			sleep(1);
			// If the client is attempting to reconnect we will skip the rest of the loop.
			continue;
		}

		if ((rc = aws_iot_shadow_init_json_document(JsonDocumentBuffer, sizeOfJsonDocumentBuffer)) != NONE_ERROR) {
			break;
		}

		if ((rc = aws_iot_shadow_begin_section(JsonDocumentBuffer, sizeOfJsonDocumentBuffer, ShadowSectionTypeReported)) != NONE_ERROR) {
			break;
		}

		int i;
		for (i = 0; i < supportedCommands.numCommands; ++i) {
			OBDIICommand *command = supportedCommands.commands[i];

			// Skip over commands we don't care about
			int j;
			for (j = 0; j < sizeof(commandPrevValuesMap)/sizeof(commandPrevValuesMap[0]); ++j) {
				if (commandPrevValuesMap[j].command == command) {
					break;
				}
			}

			if (j == sizeof(commandPrevValuesMap)/sizeof(commandPrevValuesMap[0])) {
				continue;
			}

			printf("Querying car for command: %s...\n", command->name);

			OBDIIResponse response = OBDIIPerformQuery(s, command);

			if (response.success) {
				unsigned char mode = OBDIICommandGetMode(command);
				unsigned char PID = OBDIICommandGetPID(command);

				char prevPropertyName[9];
				prevPropertyName[8] = '\0';
				sprintf(prevPropertyName, "prev%02x%02x", mode, PID);
				
				jsonStruct_t prevKeyValuePair;
				prevKeyValuePair.cb = NULL;
				prevKeyValuePair.pKey = prevPropertyName;

				char propertyName[9];
				propertyName[8] = '\0';
				sprintf(propertyName, "curr%02x%02x", mode, PID);

				jsonStruct_t keyValuePair;
				keyValuePair.cb = NULL;
				keyValuePair.pKey = propertyName;

				switch (command->responseType) {
					case OBDIIResponseTypeNumeric:
						prevKeyValuePair.pData = &commandPrevValuesMap[j].value;
						prevKeyValuePair.type = SHADOW_JSON_FLOAT;

						keyValuePair.pData = &response.numericValue;
						keyValuePair.type = SHADOW_JSON_FLOAT;
						break;
						
					case OBDIIResponseTypeBitfield:
						keyValuePair.pData = &response.bitfieldValue;
						keyValuePair.type = SHADOW_JSON_UINT32;
						break;

					case OBDIIResponseTypeString:
						keyValuePair.pData = response.stringValue;
						keyValuePair.type = SHADOW_JSON_STRING;
						break;
				}

				if ((rc = aws_iot_shadow_add_key_value_pair(JsonDocumentBuffer, sizeOfJsonDocumentBuffer, &prevKeyValuePair)) != NONE_ERROR) {
					OBDIIResponseFree(&response);
					break;
				}		

				if ((rc = aws_iot_shadow_add_key_value_pair(JsonDocumentBuffer, sizeOfJsonDocumentBuffer, &keyValuePair)) != NONE_ERROR) {
					OBDIIResponseFree(&response);
					break;
				}

				if (command->responseType == OBDIIResponseTypeNumeric) {
					commandPrevValuesMap[j].value = response.numericValue;
				}
			}

			OBDIIResponseFree(&response);
		}

		if ((rc = aws_iot_shadow_end_section(JsonDocumentBuffer, sizeOfJsonDocumentBuffer)) != NONE_ERROR) {
			break;
		}

		if ((rc = aws_iot_finalize_json_document(JsonDocumentBuffer, sizeOfJsonDocumentBuffer)) != NONE_ERROR) {
			break;
		}

		INFO("Update Shadow: %s", JsonDocumentBuffer);
		if ((rc = aws_iot_shadow_update(&mqttClient, thingNameOption.value, JsonDocumentBuffer, ShadowUpdateStatusCallback, NULL, 4, true)) != NONE_ERROR) {
			break;
		}

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

	OBDIICloseSocket(s);

	FreeCommandLineArgTemplateResources(argTemplates, sizeof(argTemplates)/sizeof(argTemplates[0]));

	return rc;
}

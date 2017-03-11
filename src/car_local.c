/*
 * A command line utility for reading OBD-II diagnostic data from a
 * vehicle via a CAN socket.
 *
 * This file is based off the file `isotprecv.c` contained in the
 * https://github.com/linux-can/can-utils GitHub repository.
 * The original copyright notice is reproduced below.
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

#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <libgen.h>

#include <net/if.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/ioctl.h>

#include <linux/can.h>
#include <linux/can/isotp.h>

#include "OBDII.h"
#include "OBDIICommunication.h"

#define NO_CAN_ID 0xFFFFFFFFU
#define BUFSIZE 5000 /* size > 4095 to check socket API internal checks */

void print_usage(char *program_name) {
	printf("Usage: %s -t <transfer CAN ID> -r <receive CAN ID> <CAN interface>\n	<transfer CAN ID>: The CAN ID that will be used for sending the diagnostic requests. For 11-bit identifiers, this can be either the broadcast ID, 0x7DF, or an ID in the range 0x7E0 to 0x7E7, indicating a particular ECU.\n	<receive CAN ID>: The CAN ID that the ECU will be using to respond to the diagnostic requests that are sent. For 11-bit identifiers, this is an ID in the range 0x7E8 to 0x7EF (i.e. <transfer CAN ID> + 8)\n", program_name);
}

int main(int argc, char **argv)
{
    int s;
    struct sockaddr_can addr;
    int opt, i;
    extern int optind, opterr, optopt;

    addr.can_addr.tp.tx_id = addr.can_addr.tp.rx_id = NO_CAN_ID;

    while ((opt = getopt(argc, argv, "r:t:")) != -1) {
	    switch (opt) {
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

    if ((argc - optind != 1) ||
	(addr.can_addr.tp.tx_id == NO_CAN_ID) ||
	(addr.can_addr.tp.rx_id == NO_CAN_ID)) {
	    print_usage(basename(argv[0]));
	    exit(1);
    }

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

    // OBDIIResponse dtcResponse = OBDIIPerformQuery(s, OBDIICommands.getDTCs);

    // for (i = 0; i < dtcResponse.numDTCs; ++i) {
    // 	printf("%s", dtcResponse.DTCs[i]);
    // }

    // OBDIIResponseFree(dtcResponse);

    OBDIIResponse dtcResponse = OBDIIPerformQuery(s, &OBDIICommands.VIN);
    printf("VIN: %s\n", dtcResponse.stringValue);
    OBDIIResponseFree(&dtcResponse);

    while (1) {
	    // Send a request for the engine RPMs
	    OBDIIResponse response = OBDIIPerformQuery(s, &OBDIICommands.engineRPMs);
	    printf("Engine RPMs: %f\n", response.numericValue);

	    response = OBDIIPerformQuery(s, &OBDIICommands.engineCoolantTemperature);
	    printf("Engine coolant temperature (Celsius): %i\n", response.numericValue);

	    response = OBDIIPerformQuery(s, &OBDIICommands.calculatedEngineLoad);
	    printf("Calculated engine load: %f\n", response.numericValue);

	    sleep(1);
   }

    close(s);

    return 0;
}

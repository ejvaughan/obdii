#ifndef __OBDII_PRIVATE_H
#define __OBDII_PRIVATE_H

#define GET_COMMAND_MODE(command) (command)->payload[0]
#define GET_COMMAND_PID(command) (command)->payload[1]

#endif /* OBDII_Private.h */

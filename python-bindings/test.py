from bindings import *
import sys

if len(sys.argv) != 4:
    print('Usage: {} <interface> <receive ID> <transfer ID>'.format(sys.argv[0]))
    quit(1)

ifname = sys.argv[1]
receiveID = int(sys.argv[2], 16) | CAN_EFF_FLAG
transferID = int(sys.argv[3], 16) | CAN_EFF_FLAG

s = OBDIIOpenSocket(ifname, transferID, receiveID)

if s < 0:
    print('Error opening socket')
    quit(2)

response = OBDIIPerformQuery(s, OBDIICommands.engineRPMs)

if response.success:
    print('Got engine RPMs: {}'.format(response.numericValue))

OBDIICloseSocket(s)


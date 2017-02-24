# A very simple python script that constructs an OBD-II diagnostic packet requesting the car's engine RPMs

import socket,sys,struct

# First, create a socket for reading/writing to the CAN bus
sock = socket.socket(socket.PF_CAN, socket.SOCK_RAW, socket.CAN_RAW);

# Then, bind the socket to a particular CAN interface (can0 in our case)
interface = "can0"
try:
	sock.bind((interface,))
except OSError:
	sys.stderr.write("Could not bind to interface '%s'\n" % interface);

# Construct an OBD-II packet request for the engine RPMs

# CAN frames have the following format:
#
# | 11 or 29-bit ECU ID | payload size (<= 8 bytes) | payload (up to 8 bytes) |
#
# For Ethan's Honda Civic, the broadcast ID is 0x18DB33F1, and the engine ECU ID is 18DAF110
# 

# The format of an OBD-II payload is documented here (https://en.wikipedia.org/wiki/OBD-II_PIDs)
# The payload has the following general form:
# | header (# bytes in the payload) | mode | PID |

# In the example below, the payload is 0x02010C0000000000
# The header byte is 0x02, the mode is 0x01, and the PID is 0x0C (engine RPMs

fmt = "<iB3x"
ecu_id = 0x18DB33F1 | socket.CAN_EFF_FLAG
payload = bytearray.fromhex("02010C0000000000")
can_pkt = bytearray()
can_pkt += struct.pack(fmt, ecu_id, len(payload))
can_pkt += payload

sock.send(can_pkt)

while True:
	recv_pkt = sock.recv(16)
	recv_ecu_id, length = struct.unpack(fmt, recv_pkt[0:8])
	recv_ecu_id &= socket.CAN_EFF_MASK
	data = recv_pkt[8:8 + length]

	if (recv_ecu_id == 0x18DAF110):
		print("Received: ", ''.join('{:02x}'.format(x) for x in data))
		break
		
